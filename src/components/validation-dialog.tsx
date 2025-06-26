'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { ValidationRequest, ProductionCondition, ScheduledTask, Task, Shift } from '@/types';
import { validatePressDieCombination, type ValidatePressDieCombinationOutput } from '@/ai/flows/validate-press-die-combination';

interface ValidationDialogProps {
  request: ValidationRequest;
  productionConditions: ProductionCondition[];
  onClose: () => void;
  onSuccess: (scheduledTask: ScheduledTask, task: Task, shift: Shift) => void;
}

export const ValidationDialog: React.FC<ValidationDialogProps> = ({ request, productionConditions, onClose, onSuccess }) => {
  const { task, shift } = request;
  const { toast } = useToast();
  const [pressNo, setPressNo] = useState('');
  const [dieNo, setDieNo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidatePressDieCombinationOutput | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setValidationResult(null);

    const press = parseInt(pressNo, 10);
    const die = parseInt(dieNo, 10);

    if (isNaN(press) || isNaN(die)) {
      toast({
        title: "Invalid Input",
        description: "Please enter valid numbers for Press and Die.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const result = await validatePressDieCombination({
        itemCode: task.itemCode,
        pressNo: press,
        dieNo: die,
        material: task.material,
        productionConditions: JSON.stringify(productionConditions),
      });
      setValidationResult(result);

      if (result.isValid) {
        const condition = productionConditions.find(
          (pc) => pc.itemCode === task.itemCode && pc.pressNo === press && pc.dieNo === die && pc.material === task.material
        );

        if (condition) {
          const maxCyclesInShift = Math.floor(shift.remainingCapacity / condition.cureTime);
          if (maxCyclesInShift <= 0) {
            setValidationResult({ isValid: false, reason: "Not enough remaining capacity in this shift for even one cycle." });
            setIsLoading(false);
            return;
          }

          const maxProducibleQty = maxCyclesInShift * condition.piecesPerCycle;
          const scheduledQuantity = Math.min(task.remainingQuantity, maxProducibleQty);
          
          const cyclesForScheduledQty = Math.ceil(scheduledQuantity / condition.piecesPerCycle);
          const timeTaken = cyclesForScheduledQty * condition.cureTime;

          const newScheduledTask: ScheduledTask = {
            id: `${task.jobCardNumber}-${shift.id}-${Date.now()}`,
            jobCardNumber: task.jobCardNumber,
            itemCode: task.itemCode,
            material: task.material,
            scheduledQuantity,
            pressNo: press,
            dieNo: die,
            timeTaken,
          };
          onSuccess(newScheduledTask, task, shift);
        } else {
          // This should ideally not happen if validation is correct
          setValidationResult({ isValid: false, reason: "Could not find matching production condition locally." });
        }
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Validation Error",
        description: "An unexpected error occurred during validation.",
        variant: "destructive",
      });
      setValidationResult({isValid: false, reason: "An unexpected error occurred."})
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-headline">Schedule Task: {task.jobCardNumber}</DialogTitle>
          <DialogDescription>
            Enter Press and Die numbers for item <span className="font-semibold">{task.itemCode}</span> on <span className="font-semibold">{shift.day} {shift.type} Shift</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pressNo" className="text-right">Press No.</Label>
              <Input id="pressNo" type="number" value={pressNo} onChange={(e) => setPressNo(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="dieNo" className="text-right">Die No.</Label>
              <Input id="dieNo" type="number" value={dieNo} onChange={(e) => setDieNo(e.target.value)} className="col-span-3" required />
            </div>
          </div>
          {validationResult && (
             <Alert variant={validationResult.isValid ? "default" : "destructive"} className="mt-4">
               {validationResult.isValid ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
               <AlertTitle>{validationResult.isValid ? "Validation Successful" : "Validation Failed"}</AlertTitle>
               <AlertDescription>
                 {validationResult.reason}
               </AlertDescription>
             </Alert>
           )}
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isLoading || (validationResult?.isValid ?? false)}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Validate & Schedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
