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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [otherPressNo, setOtherPressNo] = useState('');
  
  const [dieNo, setDieNo] = useState('');
  const [otherDieNo, setOtherDieNo] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidatePressDieCombinationOutput | null>(null);

  const pressOptions = React.useMemo(() => {
    const presses = productionConditions
      .filter(pc => pc.itemCode === task.itemCode && pc.material === task.material)
      .map(pc => pc.pressNo);
    return [...new Set(presses)].map(p => String(p));
  }, [productionConditions, task.itemCode, task.material]);

  const dieOptions = React.useMemo(() => {
    if (!pressNo || pressNo === 'other') return [];
    const selectedPress = parseInt(pressNo, 10);
    const dies = productionConditions
      .filter(pc => 
          pc.itemCode === task.itemCode && 
          pc.material === task.material && 
          pc.pressNo === selectedPress
      )
      .map(pc => pc.dieNo);
    return [...new Set(dies)].map(d => String(d));
  }, [productionConditions, task.itemCode, task.material, pressNo]);
  
  useEffect(() => {
    setDieNo('');
    setOtherDieNo('');
    setValidationResult(null);
  }, [pressNo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setValidationResult(null);

    const finalPressNo = pressNo === 'other' ? otherPressNo : pressNo;
    const finalDieNo = dieNo === 'other' ? otherDieNo : dieNo;

    if (!finalPressNo || !finalDieNo) {
      toast({
        title: "Input Required",
        description: "Please provide values for both Press and Die.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const press = parseInt(finalPressNo, 10);
    const die = parseInt(finalDieNo, 10);

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
            id: `${task.jobCardNumber}-${shift.id}-${Date.now()}-${Math.random()}`,
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
           setValidationResult({ isValid: false, reason: "Combination is valid but production details (like cure time) are unknown. Cannot schedule." });
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
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Schedule Task: {task.jobCardNumber}</DialogTitle>
          <DialogDescription>
            Select or enter Press and Die numbers for item <span className="font-semibold">{task.itemCode}</span> on <span className="font-semibold">{shift.day} {shift.type} Shift</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="pressNo" className="text-right pt-2">Press No.</Label>
              <div className="col-span-3">
                <Select value={pressNo} onValueChange={setPressNo}>
                  <SelectTrigger id="pressNo">
                    <SelectValue placeholder="Select a press..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pressOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                    <SelectItem value="other">Other...</SelectItem>
                  </SelectContent>
                </Select>
                {pressNo === 'other' && (
                  <Input 
                    id="otherPressNo"
                    type="number"
                    value={otherPressNo}
                    onChange={e => setOtherPressNo(e.target.value)}
                    placeholder="Enter Press No."
                    className="mt-2"
                    required
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="dieNo" className="text-right pt-2">Die No.</Label>
              <div className="col-span-3">
                 <Select value={dieNo} onValueChange={setDieNo} disabled={!pressNo}>
                   <SelectTrigger id="dieNo">
                     <SelectValue placeholder={!pressNo ? "Select a press first" : "Select a die..."} />
                   </SelectTrigger>
                   <SelectContent>
                     {dieOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                     <SelectItem value="other">Other...</SelectItem>
                   </SelectContent>
                 </Select>
                 {dieNo === 'other' && (
                   <Input 
                     id="otherDieNo"
                     type="number"
                     value={otherDieNo}
                     onChange={e => setOtherDieNo(e.target.value)}
                     placeholder="Enter Die No."
                     className="mt-2"
                     required
                   />
                 )}
                 {pressNo && pressNo !== 'other' && dieOptions.length === 0 && (
                     <p className="text-xs text-muted-foreground mt-2 px-1">No predefined dies. Select "Other..." to enter manually.</p>
                 )}
              </div>
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
