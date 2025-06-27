'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { ValidationRequest, ProductionCondition, ScheduledTask, Task, Shift } from '@/types';
import { validatePressDieCombination, type ValidatePressDieCombinationOutput } from '@/ai/flows/validate-press-die-combination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ValidationDialogProps {
  request: ValidationRequest;
  productionConditions: ProductionCondition[];
  onClose: () => void;
  onSuccess: (scheduledTaskDetails: Omit<ScheduledTask, 'id'>, task: Task, shift: Shift) => void;
}

export const ValidationDialog: React.FC<ValidationDialogProps> = ({ request, productionConditions, onClose, onSuccess }) => {
  const { task, shift } = request;
  const { toast } = useToast();
  
  const [step, setStep] = useState<'details' | 'select_operation' | 'confirm'>('details');

  const [pressNo, setPressNo] = useState('');
  const [otherPressNo, setOtherPressNo] = useState('');
  
  const [dieNo, setDieNo] = useState('');
  const [otherDieNo, setOtherDieNo] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidatePressDieCombinationOutput | null>(null);

  const [selectedCondition, setSelectedCondition] = useState<ProductionCondition | null>(null);
  const [operationType, setOperationType] = useState(''); // '1' for one-side, '2' for two-side
  const [piecesPerCycle, setPiecesPerCycle] = useState(0);

  const [scheduledQuantity, setScheduledQuantity] = useState('');
  const [timeTaken, setTimeTaken] = useState(0);
  const [maxPossibleQty, setMaxPossibleQty] = useState(0);

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

  const operationOptions = React.useMemo(() => {
    if (!selectedCondition) return [];
    const options = [];
    if (selectedCondition.piecesPerCycle1 > 0) {
      options.push({ value: '1', label: `One Side (${selectedCondition.piecesPerCycle1} pcs/cycle)` });
    }
    if (selectedCondition.piecesPerCycle2 > 0) {
      options.push({ value: '2', label: `Two Side (${selectedCondition.piecesPerCycle2} pcs/cycle)` });
    }
    return options;
  }, [selectedCondition]);
  
  useEffect(() => {
    setDieNo('');
    setOtherDieNo('');
    setValidationResult(null);
    setSelectedCondition(null);
    setOperationType('');
    if (step !== 'details') {
        setStep('details');
    }
  }, [pressNo]);

  useEffect(() => {
    setValidationResult(null);
    setSelectedCondition(null);
    setOperationType('');
    if (step !== 'details') {
        setStep('details');
    }
  }, [dieNo]);
  
  useEffect(() => {
    if (!selectedCondition || piecesPerCycle <= 0) {
      setTimeTaken(0);
      return;
    }
    
    const qty = parseInt(scheduledQuantity, 10) || 0;
    if (piecesPerCycle > 0) {
      const cyclesForScheduledQty = Math.ceil(qty / piecesPerCycle);
      const newTimeTaken = cyclesForScheduledQty * selectedCondition.cureTime;
      setTimeTaken(newTimeTaken);
    } else {
      setTimeTaken(0);
    }
  }, [scheduledQuantity, selectedCondition, piecesPerCycle]);

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setValidationResult(null);

    const finalPressNo = pressNo === 'other' ? otherPressNo : pressNo;
    const finalDieNo = dieNo === 'other' ? otherDieNo : dieNo;

    if (!finalPressNo || !finalDieNo) {
      toast({ title: "Input Required", description: "Please provide values for both Press and Die.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    const press = parseInt(finalPressNo, 10);
    const die = parseInt(finalDieNo, 10);

    if (isNaN(press) || isNaN(die)) {
      toast({ title: "Invalid Input", description: "Please enter valid numbers for Press and Die.", variant: "destructive" });
      setIsLoading(false);
      return;
    }

    try {
      const result = await validatePressDieCombination({
        itemCode: task.itemCode, pressNo: press, dieNo: die, material: task.material, productionConditions: JSON.stringify(productionConditions),
      });
      setValidationResult(result);

      if (result.isValid) {
        const condition = productionConditions.find(pc => pc.itemCode === task.itemCode && pc.pressNo === press && pc.dieNo === die && pc.material === task.material);

        if (condition) {
          if (condition.piecesPerCycle1 <= 0 && condition.piecesPerCycle2 <= 0) {
            setValidationResult({ isValid: false, reason: "No valid operations found (pieces per cycle is zero)." });
            return;
          }
          setSelectedCondition(condition);
          setStep('select_operation');
        } else {
           setValidationResult({ isValid: false, reason: "Combination is valid but production details (like cure time) are unknown. Cannot schedule." });
        }
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Validation Error", description: "An unexpected error occurred during validation.", variant: "destructive" });
      setValidationResult({isValid: false, reason: "An unexpected error occurred."})
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueToConfirm = () => {
    if (!selectedCondition || !operationType) {
        toast({ title: "Operation Type Required", description: "Please select an operation type.", variant: "destructive" });
        return;
    }
    
    const currentPcsPerCycle = operationType === '1' ? selectedCondition.piecesPerCycle1 : selectedCondition.piecesPerCycle2;
    setPiecesPerCycle(currentPcsPerCycle);

    if (currentPcsPerCycle <= 0) {
        toast({ title: "Invalid Operation", description: "Selected operation has zero pieces per cycle.", variant: "destructive" });
        return;
    }
    if (selectedCondition.cureTime <= 0) {
        toast({ title: "Invalid Data", description: "Cannot schedule with a cure time of zero.", variant: "destructive" });
        return;
    }

    const maxCyclesInShift = Math.floor(shift.remainingCapacity / selectedCondition.cureTime);
    if (maxCyclesInShift <= 0) {
        toast({ title: "Not Enough Capacity", description: "Not enough remaining capacity in this shift for even one cycle.", variant: "destructive" });
        return;
    }
    
    const maxProducibleQty = maxCyclesInShift * currentPcsPerCycle;
    const qty = Math.min(task.remainingQuantity, maxProducibleQty);
          
    if (isNaN(qty)) {
        toast({ title: "Calculation Error", description: "Could not calculate a valid quantity. Check the task and production data.", variant: "destructive" });
        return;
    }

    setMaxPossibleQty(qty);
    setScheduledQuantity(String(qty));
    setStep('confirm');
  }

  const handleConfirm = () => {
    if (!selectedCondition) return;

    const finalPressNo = parseInt(pressNo === 'other' ? otherPressNo : pressNo, 10);
    const finalDieNo = parseInt(dieNo === 'other' ? otherDieNo : dieNo, 10);
    
    const newScheduledTaskDetails: Omit<ScheduledTask, 'id'> = {
      jobCardNumber: task.jobCardNumber,
      itemCode: task.itemCode,
      material: task.material,
      scheduledQuantity: parseInt(scheduledQuantity, 10) || 0,
      pressNo: finalPressNo,
      dieNo: finalDieNo,
      timeTaken: timeTaken,
    };
    onSuccess(newScheduledTaskDetails, task, shift);
  };
  
  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    if (value === '') {
      setScheduledQuantity('');
      return;
    }

    if (/^\d*$/.test(value)) {
      const numValue = parseInt(value, 10);
      if (numValue > maxPossibleQty) {
          setScheduledQuantity(String(maxPossibleQty));
          toast({ title: "Quantity Exceeded", description: `Maximum possible quantity is ${maxPossibleQty}.`, variant: "destructive" });
      } else {
          setScheduledQuantity(value);
      }
    }
  };

  const getDialogDescription = () => {
    switch(step) {
      case 'details':
        return `Select or enter Press and Die numbers for item ${task.itemCode} on ${shift.day} ${shift.type} Shift.`;
      case 'select_operation':
        return 'This combination is valid. Please select the type of operation to perform.';
      case 'confirm':
        return `Confirm the quantity to schedule. Max possible is ${maxPossibleQty}.`;
      default:
        return '';
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Schedule Task: {task.jobCardNumber}</DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        {step === 'details' && (
          <form onSubmit={handleValidate}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="pressNo" className="text-right pt-2">Press No.</Label>
                <div className="col-span-3">
                  <Select value={pressNo} onValueChange={setPressNo}>
                    <SelectTrigger id="pressNo"><SelectValue placeholder="Select a press..." /></SelectTrigger>
                    <SelectContent>
                      {pressOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                      <SelectItem value="other">Other...</SelectItem>
                    </SelectContent>
                  </Select>
                  {pressNo === 'other' && (<Input id="otherPressNo" type="number" value={otherPressNo} onChange={e => setOtherPressNo(e.target.value)} placeholder="Enter Press No." className="mt-2" required />)}
                </div>
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="dieNo" className="text-right pt-2">Die No.</Label>
                <div className="col-span-3">
                  <Select value={dieNo} onValueChange={setDieNo} disabled={!pressNo}>
                    <SelectTrigger id="dieNo"><SelectValue placeholder={!pressNo ? "Select a press first" : "Select a die..."} /></SelectTrigger>
                    <SelectContent>
                      {dieOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                      <SelectItem value="other">Other...</SelectItem>
                    </SelectContent>
                  </Select>
                  {dieNo === 'other' && (<Input id="otherDieNo" type="number" value={otherDieNo} onChange={e => setOtherDieNo(e.target.value)} placeholder="Enter Die No." className="mt-2" required />)}
                  {pressNo && pressNo !== 'other' && dieOptions.length === 0 && (<p className="text-xs text-muted-foreground mt-2 px-1">No predefined dies. Select "Other..." to enter manually.</p>)}
                </div>
              </div>
            </div>
            {validationResult && !validationResult.isValid && (
               <Alert variant="destructive" className="mt-4">
                 <AlertCircle className="h-4 w-4" />
                 <AlertTitle>Validation Failed</AlertTitle>
                 <AlertDescription>{validationResult.reason}</AlertDescription>
               </Alert>
             )}
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Validate
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === 'select_operation' && (
          <div>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="operationType" className="text-right">Operation Type</Label>
                <Select value={operationType} onValueChange={setOperationType}>
                  <SelectTrigger id="operationType" className="col-span-3">
                    <SelectValue placeholder="Select an operation type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {operationOptions.length > 0 ? (
                      operationOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)
                    ) : (
                      <SelectItem value="none" disabled>No operations available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
             <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" onClick={() => setStep('details')}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button type="button" onClick={handleContinueToConfirm} disabled={!operationType}>
                Continue
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'confirm' && selectedCondition && (
          <div>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="quantity">Schedule Quantity</Label>
                  <Input id="quantity" type="number" value={scheduledQuantity} onChange={handleQuantityChange} className="col-span-2" max={maxPossibleQty} />
              </div>
              <div className="grid grid-cols-3 items-center gap-4 text-sm">
                <span className="text-muted-foreground">Remaining in Job:</span>
                <span className="col-span-2 font-medium">{task.remainingQuantity}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4 text-sm">
                <span className="text-muted-foreground">Time Required:</span>
                <span className="col-span-2 font-medium">{timeTaken} minutes</span>
              </div>
               <div className="grid grid-cols-3 items-center gap-4 text-sm">
                <span className="text-muted-foreground">Shift Capacity Left:</span>
                <span className="col-span-2 font-medium">{shift.remainingCapacity} minutes</span>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" onClick={() => setStep('select_operation')}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button type="button" onClick={handleConfirm} disabled={!scheduledQuantity || parseInt(scheduledQuantity, 10) <= 0 || timeTaken > shift.remainingCapacity}>
                Confirm Schedule
              </Button>
            </DialogFooter>
             {timeTaken > shift.remainingCapacity && (
                 <p className="text-sm text-destructive text-center mt-2">Scheduled time exceeds remaining shift capacity.</p>
             )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
