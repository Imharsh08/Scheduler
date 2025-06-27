
'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, ArrowLeft, Calendar, Clock } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { ValidationRequest, ProductionCondition, ScheduledTask, Task, Shift } from '@/types';
import { validatePressDieCombination, type ValidatePressDieCombinationOutput } from '@/ai/flows/validate-press-die-combination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ValidationDialogProps {
  request: ValidationRequest;
  productionConditions: ProductionCondition[];
  shifts: Shift[];
  onClose: () => void;
  onSuccess: (scheduledItems: Omit<ScheduledTask, 'id'>[]) => void;
}

export const ValidationDialog: React.FC<ValidationDialogProps> = ({ request, productionConditions, shifts, onClose, onSuccess }) => {
  const { task, shift } = request;
  const { toast } = useToast();
  
  const [step, setStep] = useState<'details' | 'select_operation' | 'confirm' | 'multi_shift_confirm'>('details');

  const [pressNo, setPressNo] = useState('');
  const [otherPressNo, setOtherPressNo] = useState('');
  
  const [dieNo, setDieNo] = useState('');
  const [otherDieNo, setOtherDieNo] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidatePressDieCombinationOutput | null>(null);

  const [selectedCondition, setSelectedCondition] = useState<ProductionCondition | null>(null);
  const [operationType, setOperationType] = useState('');
  const [piecesPerCycle, setPiecesPerCycle] = useState(0);

  const [scheduledQuantity, setScheduledQuantity] = useState('');
  const [maxPossibleQty, setMaxPossibleQty] = useState(0);
  
  const [multiShiftPlan, setMultiShiftPlan] = useState<Omit<ScheduledTask, 'id'>[] | null>(null);

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

    const qty = task.remainingQuantity;
    setMaxPossibleQty(qty);
    setScheduledQuantity(String(qty));
    setStep('confirm');
  }

  const handleCalculateMultiShift = () => {
    if (!selectedCondition) return;

    const finalPressNo = parseInt(pressNo === 'other' ? otherPressNo : pressNo, 10);
    const finalDieNo = parseInt(dieNo === 'other' ? otherDieNo : dieNo, 10);
    
    let remainingQtyToSchedule = parseInt(scheduledQuantity, 10);
    const plan: Omit<ScheduledTask, 'id'>[] = [];

    const startIndex = shifts.findIndex(s => s.id === shift.id);
    if (startIndex === -1) {
        toast({ title: "Error", description: "Could not find starting shift.", variant: "destructive" });
        return;
    }
    
    const availableShifts = JSON.parse(JSON.stringify(shifts.slice(startIndex)));
    
    for (const currentShift of availableShifts) {
        if (remainingQtyToSchedule <= 0) break;
        if (currentShift.remainingCapacity <= 0) continue;

        const maxCycles = Math.floor(currentShift.remainingCapacity / selectedCondition.cureTime);
        if (maxCycles <= 0) continue;

        const producibleQty = maxCycles * piecesPerCycle;
        const qtyForThisShift = Math.min(producibleQty, remainingQtyToSchedule);

        if (qtyForThisShift <= 0) continue;
        
        const cyclesForThisShift = Math.ceil(qtyForThisShift / piecesPerCycle);
        const timeForThisShift = cyclesForThisShift * selectedCondition.cureTime;

        plan.push({
            jobCardNumber: task.jobCardNumber,
            itemCode: task.itemCode,
            material: task.material,
            scheduledQuantity: qtyForThisShift,
            pressNo: finalPressNo,
            dieNo: finalDieNo,
            timeTaken: timeForThisShift,
            shiftId: currentShift.id,
        });

        remainingQtyToSchedule -= qtyForThisShift;
        currentShift.remainingCapacity -= timeForThisShift;
    }

    if (remainingQtyToSchedule > 0) {
        toast({
            title: "Insufficient Capacity",
            description: `Cannot schedule the full quantity. Not enough capacity in all available future shifts. ${remainingQtyToSchedule} pieces remaining.`,
            variant: "destructive"
        });
        setMultiShiftPlan(null);
    } else {
        setMultiShiftPlan(plan);
        setStep('multi_shift_confirm');
    }
  };

  const handleSingleShiftConfirm = () => {
    if (!selectedCondition || !scheduledQuantity) return;
    
    const qty = parseInt(scheduledQuantity, 10);
    if(qty <= 0) return;

    const calculatedCycles = Math.ceil(qty / piecesPerCycle);
    const timeTaken = calculatedCycles * selectedCondition.cureTime;

    if (timeTaken > shift.remainingCapacity) {
        toast({ title: "Exceeds Capacity", description: "This quantity takes more time than available in the shift.", variant: "destructive" });
        return;
    }

    const finalPressNo = parseInt(pressNo === 'other' ? otherPressNo : pressNo, 10);
    const finalDieNo = parseInt(dieNo === 'other' ? otherDieNo : dieNo, 10);
    
    const newScheduledTask: Omit<ScheduledTask, 'id'> = {
      jobCardNumber: task.jobCardNumber,
      itemCode: task.itemCode,
      material: task.material,
      scheduledQuantity: qty,
      pressNo: finalPressNo,
      dieNo: finalDieNo,
      timeTaken: timeTaken,
      shiftId: shift.id,
    };
    onSuccess([newScheduledTask]);
  };
  
  const handleMultiShiftConfirm = () => {
    if (multiShiftPlan) {
        onSuccess(multiShiftPlan);
    }
  }

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
     if (value === '' || /^\d*$/.test(value)) {
        setScheduledQuantity(value);
    }
  };

  const handleQuantityBlur = () => {
    const numValue = parseInt(scheduledQuantity, 10);
    if (isNaN(numValue) || numValue <= 0) {
        setScheduledQuantity('1');
    } else if (numValue > maxPossibleQty) {
        setScheduledQuantity(String(maxPossibleQty));
        toast({ title: "Quantity Exceeded", description: `Maximum possible quantity is ${maxPossibleQty}.`, variant: "destructive" });
    }
  }

  const getDialogDescription = () => {
    switch(step) {
      case 'details':
        return `Select or enter Press and Die numbers for item ${task.itemCode} on ${shift.day} ${shift.type} Shift.`;
      case 'select_operation':
        return 'This combination is valid. Please select the type of operation to perform.';
      case 'confirm':
        return `Confirm the quantity to schedule. You can schedule up to ${maxPossibleQty} pieces.`;
      case 'multi_shift_confirm':
        return 'Review the proposed schedule plan across multiple upcoming shifts.';
      default:
        return '';
    }
  }

  const renderConfirmStep = () => {
    if (!selectedCondition) return null;

    const scheduledQtyNum = parseInt(scheduledQuantity, 10) || 0;
    const calculatedCycles = piecesPerCycle > 0 ? Math.ceil(scheduledQtyNum / piecesPerCycle) : 0;
    const timeTaken = calculatedCycles * selectedCondition.cureTime;
    const fitsInSingleShift = timeTaken <= shift.remainingCapacity;

    return (
      <div>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="quantity" className="text-right">Schedule Qty</Label>
              <Input id="quantity" type="text" value={scheduledQuantity} onChange={handleQuantityChange} onBlur={handleQuantityBlur} className="col-span-2" />
          </div>
          
          <Card className="bg-secondary/50">
            <CardContent className="p-3">
              <h4 className="text-sm font-semibold mb-2 text-center">Calculation Details</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                 <div className="text-muted-foreground">Total Remaining Job:</div>
                <div className="font-medium text-right">{task.remainingQuantity} pcs</div>
                <div className="text-muted-foreground">Shift Capacity Left:</div>
                <div className="font-medium text-right">{shift.remainingCapacity} min</div>
                <Separator className="col-span-2 my-1" />
                <div className="text-muted-foreground">Pieces / Cycle:</div>
                <div className="font-mono text-right">{piecesPerCycle}</div>
                <div className="text-muted-foreground">Time / Cycle:</div>
                <div className="font-mono text-right">{selectedCondition.cureTime} min</div>
                <div className="text-muted-foreground">Calculated Cycles:</div>
                <div className="font-mono text-right">{calculatedCycles}</div>
              </div>
              <Separator className="my-2 bg-border/50" />
              <div className="flex justify-between items-center text-sm font-bold">
                  <span>Total Time Required:</span>
                  <span className={!fitsInSingleShift ? 'text-destructive' : ''}>{timeTaken} min</span>
              </div>
            </CardContent>
          </Card>
        </div>
        <DialogFooter className="mt-4 sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => setStep('select_operation')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex gap-2">
            {fitsInSingleShift ? (
              <Button type="button" onClick={handleSingleShiftConfirm} disabled={scheduledQtyNum <= 0}>
                Confirm Schedule
              </Button>
            ) : (
              <Button type="button" onClick={handleCalculateMultiShift} disabled={scheduledQtyNum <= 0}>
                <Calendar className="mr-2 h-4 w-4" /> Schedule Across Multiple Shifts
              </Button>
            )}
          </div>
        </DialogFooter>
         {!fitsInSingleShift && (
            <p className="text-sm text-destructive text-center mt-2">Scheduled time exceeds remaining shift capacity. You can schedule across multiple shifts.</p>
        )}
      </div>
    );
  };
  
  const renderMultiShiftConfirmStep = () => {
    if (!multiShiftPlan) return null;
    return (
        <div>
            <div className="my-4">
                <ScrollArea className="h-48">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Shift</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead className="text-right">Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {multiShiftPlan.map((item, index) => {
                            const p_shift = shifts.find(s => s.id === item.shiftId);
                            return (
                                <TableRow key={index}>
                                    <TableCell className="font-medium">{p_shift?.day} {p_shift?.type}</TableCell>
                                    <TableCell className="text-right">{item.scheduledQuantity}</TableCell>
                                    <TableCell className="text-right">{item.timeTaken} min</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
                </ScrollArea>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" onClick={() => setStep('confirm')}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button type="button" onClick={handleMultiShiftConfirm}>
                Confirm Multi-Shift Schedule
              </Button>
            </DialogFooter>
        </div>
    );
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

        {step === 'confirm' && renderConfirmStep()}
        {step === 'multi_shift_confirm' && renderMultiShiftConfirmStep()}
      </DialogContent>
    </Dialog>
  );
};
