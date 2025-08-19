
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, ArrowLeft, Calendar, Wrench } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import type { ValidationRequest, ProductionCondition, ScheduledTask, Shift } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { addMinutes } from 'date-fns';
import { getShiftStartDateTime } from '@/lib/time-utils';

interface ValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ValidationRequest;
  productionConditions: ProductionCondition[];
  shifts: Shift[];
  onClose: () => void;
  onSuccess: (scheduledItems: Omit<ScheduledTask, 'id' | 'isSaved' | 'trackingSteps'>[]) => void;
  onConditionUpdate: (updatedCondition: ProductionCondition) => void;
  defaultMaintenanceDuration: number;
}

export const ValidationDialog: React.FC<ValidationDialogProps> = ({
  open,
  onOpenChange,
  request,
  productionConditions,
  shifts,
  onClose,
  onSuccess,
  onConditionUpdate,
  defaultMaintenanceDuration,
}) => {
  const { task, shift, pressNo: preselectedPressNo } = request;
  const { toast } = useToast();
  
  const [step, setStep] = useState<'details' | 'select_operation' | 'confirm' | 'multi_shift_confirm'>('details');

  const pressNo = String(preselectedPressNo);
  const [dieNo, setDieNo] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  
  const [selectedCondition, setSelectedCondition] = useState<ProductionCondition | null>(null);
  const [operationType, setOperationType] = useState('');
  const [piecesPerCycle, setPiecesPerCycle] = useState(0);

  const [scheduledQuantity, setScheduledQuantity] = useState('');
  const [maxPossibleQty, setMaxPossibleQty] = useState(0);
  
  const [multiShiftPlan, setMultiShiftPlan] = useState<Omit<ScheduledTask, 'id' | 'isSaved' | 'trackingSteps'>[] | null>(null);

  const [manualPiecesPerHour, setManualPiecesPerHour] = useState('');
  const [manualCureTime, setManualCureTime] = useState('');

  const dieOptions = useMemo(() => {
    const selectedPressNum = parseInt(pressNo, 10);
    const dies = productionConditions
      .filter(pc => pc.itemCode === task.itemCode && pc.pressNo === selectedPressNum)
      .map(pc => pc.dieNo);
    return [...new Set(dies)].map(d => String(d)).sort((a,b) => Number(a) - Number(b));
  }, [productionConditions, task.itemCode, pressNo]);

  const materialOptions = useMemo(() => {
    if (!dieNo) return [];
    const selectedPressNum = parseInt(pressNo, 10);
    const selectedDieNum = parseInt(dieNo, 10);
    const materials = productionConditions
        .filter(pc => 
            pc.itemCode === task.itemCode &&
            pc.pressNo === selectedPressNum &&
            pc.dieNo === selectedDieNum
        )
        .map(pc => pc.material);
    return [...new Set(materials)];
  }, [productionConditions, task.itemCode, pressNo, dieNo]);

  // Effect to derive the selected condition once die and material are chosen
  useEffect(() => {
    if (dieNo && selectedMaterial) {
        const condition = productionConditions.find(pc =>
            pc.itemCode === task.itemCode &&
            pc.pressNo === parseInt(pressNo, 10) &&
            pc.dieNo === parseInt(dieNo, 10) &&
            pc.material === selectedMaterial
        );
        setSelectedCondition(condition || null);
    } else {
        setSelectedCondition(null);
    }
  }, [dieNo, selectedMaterial, pressNo, task.itemCode, productionConditions]);


  // Effect to auto-select if only one option is available
  useEffect(() => {
    if (step === 'details') {
        if (dieOptions.length === 1 && !dieNo) {
            setDieNo(dieOptions[0]);
        }
        if (materialOptions.length === 1 && !selectedMaterial) {
            setSelectedMaterial(materialOptions[0]);
        }
    }
  }, [step, dieOptions, materialOptions, dieNo, selectedMaterial]);

  // Effect to pre-fill operation selection or manual data
  useEffect(() => {
    if (step === 'select_operation' && selectedCondition) {
      const hasValidOps = (selectedCondition.piecesPerHour1 > 0 || selectedCondition.piecesPerHour2 > 0);
      const hasValidCure = selectedCondition.cureTime > 0;
      
      const opOptions = [];
      if (selectedCondition.piecesPerHour1 > 0) opOptions.push('1');
      if (selectedCondition.piecesPerHour2 > 0) opOptions.push('2');

      if (opOptions.length === 1) {
        setOperationType(opOptions[0]);
      } else {
        setOperationType('');
      }

      if (!hasValidOps || !hasValidCure) {
        // Pre-fill with existing data, even if it's 0 or invalid, to give the user a starting point.
        setManualCureTime(String(selectedCondition.cureTime || ''));
        const suggestedPcs = selectedCondition.piecesPerHour1 || selectedCondition.piecesPerHour2;
        setManualPiecesPerHour(String(suggestedPcs || ''));
      }
    }
  }, [step, selectedCondition]);

  const operationOptions = useMemo(() => {
    if (!selectedCondition || selectedCondition.cureTime <= 0) return [];
    const options = [];
    if (selectedCondition.piecesPerHour1 > 0) {
      options.push({ value: '1', label: `One Side (${selectedCondition.piecesPerHour1} pcs/hour)` });
    }
    if (selectedCondition.piecesPerHour2 > 0) {
      options.push({ value: '2', label: `Two Side (${selectedCondition.piecesPerHour2} pcs/hour)` });
    }
    return options;
  }, [selectedCondition]);

  const handleContinueToConfirm = () => {
    let currentPcsPerHour = 0;
    let currentCureTime = 0;
    
    const hasValidOperations = operationOptions.length > 0;
    const hasValidCureTime = selectedCondition && selectedCondition.cureTime > 0;
    const wasManualEntry = !hasValidOperations || !hasValidCureTime;

    if (!wasManualEntry) {
      if (!selectedCondition || !operationType) {
        setTimeout(() => toast({ title: 'Operation Type Required', description: 'Please select an operation type.', variant: 'destructive' }), 0);
        return;
      }
      currentPcsPerHour = operationType === '1' ? selectedCondition.piecesPerHour1 : selectedCondition.piecesPerHour2;
      currentCureTime = selectedCondition.cureTime;
    } else {
      currentPcsPerHour = parseInt(manualPiecesPerHour, 10);
      currentCureTime = parseInt(manualCureTime, 10);
      if (isNaN(currentPcsPerHour) || currentPcsPerHour <= 0 || isNaN(currentCureTime) || currentCureTime <= 0) {
        setTimeout(() => toast({ title: 'Invalid Input', description: 'Please enter a valid positive number for pieces and cure time.', variant: 'destructive' }), 0);
        return;
      }
      
      if (selectedCondition) {
        const updatedCondition: ProductionCondition = {
          ...selectedCondition,
          piecesPerHour1: currentPcsPerHour,
          piecesPerHour2: 0, // When entering manually, we simplify to one operation type
          cureTime: currentCureTime,
        };
        onConditionUpdate(updatedCondition);
        setSelectedCondition(updatedCondition);
      }
    }
    
    setPiecesPerCycle((currentPcsPerHour * currentCureTime) / 60);

    const qty = task.remainingQuantity;
    setMaxPossibleQty(qty);
    setScheduledQuantity(String(Math.ceil(qty)));
    setStep('confirm');
  };

  const handleCalculateMultiShift = () => {
    if (!selectedCondition || piecesPerCycle <= 0) return;

    // Use the quantity from the input field directly to avoid state race conditions.
    const initialRequestedQuantity = parseInt(scheduledQuantity, 10);
    if (isNaN(initialRequestedQuantity) || initialRequestedQuantity <= 0) {
        toast({ title: "Invalid Quantity", description: "Please enter a valid quantity.", variant: "destructive" });
        return;
    }

    const finalPressNo = parseInt(pressNo, 10);
    const finalDieNo = parseInt(dieNo, 10);
    const MAINTENANCE_DURATION = defaultMaintenanceDuration; 
    const maintenanceTriggerQty = selectedCondition.maintenanceAfterQty;
    
    let remainingQtyToSchedule = initialRequestedQuantity;
    const plan: Omit<ScheduledTask, 'id' | 'isSaved' | 'trackingSteps'>[] = [];
    let cumulativeQtyForDie = 0;

    const startIndex = shifts.findIndex(s => s.id === shift.id);
    if (startIndex === -1) {
        setTimeout(() => toast({ title: "Error", description: "Could not find starting shift.", variant: "destructive" }), 0);
        return;
    }
    
    const availableShifts = JSON.parse(JSON.stringify(shifts.slice(startIndex)));
    
    for (const currentShift of availableShifts) {
        if (remainingQtyToSchedule <= 0) break;
        
        let shiftCapacity = currentShift.remainingCapacity;
        
        const timeUsedSoFarInShift = currentShift.capacity - shiftCapacity;

        // Check if we need to schedule maintenance at the beginning of this shift
        if (maintenanceTriggerQty && cumulativeQtyForDie >= maintenanceTriggerQty) {
            if (shiftCapacity >= MAINTENANCE_DURATION) {
                const maintStartTime = addMinutes(getShiftStartDateTime(currentShift), timeUsedSoFarInShift);
                const maintEndTime = addMinutes(maintStartTime, MAINTENANCE_DURATION);
                
                plan.push({
                    type: 'maintenance',
                    jobCardNumber: `MAINT-${finalDieNo}`,
                    itemCode: 'Scheduled Cleaning',
                    pressNo: finalPressNo,
                    dieNo: finalDieNo,
                    scheduledQuantity: 0,
                    timeTaken: MAINTENANCE_DURATION,
                    shiftId: currentShift.id,
                    startTime: maintStartTime.toISOString(),
                    endTime: maintEndTime.toISOString(),
                    creationDate: new Date().toISOString(),
                });

                shiftCapacity -= MAINTENANCE_DURATION;
                cumulativeQtyForDie = 0; // Reset counter after maintenance
            } else {
                 // Not enough time for maintenance, skip this shift for this job
                 continue;
            }
        }
        
        if (shiftCapacity <= 0) continue;


        const maxCyclesInShift = Math.floor(shiftCapacity / selectedCondition.cureTime);
        if (maxCyclesInShift <= 0) continue;
        
        const maxQtyInShift = Math.floor(maxCyclesInShift * piecesPerCycle);
        const qtyToSchedule = Math.min(remainingQtyToSchedule, maxQtyInShift);

        if (qtyToSchedule <= 0) continue;
        
        const cyclesForThisBatch = Math.ceil(qtyToSchedule / piecesPerCycle);
        const timeTaken = cyclesForThisBatch * selectedCondition.cureTime;
        
        const taskStartTime = addMinutes(getShiftStartDateTime(currentShift), timeUsedSoFarInShift + (plan.some(p => p.type === 'maintenance' && p.shiftId === currentShift.id) ? MAINTENANCE_DURATION : 0));
        const taskEndTime = addMinutes(taskStartTime, timeTaken);

        plan.push({
            type: 'production',
            jobCardNumber: task.jobCardNumber,
            itemCode: task.itemCode,
            material: selectedMaterial,
            priority: task.priority,
            scheduledQuantity: qtyToSchedule,
            pressNo: finalPressNo,
            dieNo: finalDieNo,
            timeTaken: timeTaken,
            shiftId: currentShift.id,
            startTime: taskStartTime.toISOString(),
            endTime: taskEndTime.toISOString(),
            creationDate: task.creationDate,
            deliveryDate: task.deliveryDate,
            orderedQuantity: task.orderedQuantity,
        });
        
        cumulativeQtyForDie += qtyToSchedule;
        remainingQtyToSchedule -= qtyToSchedule;
        currentShift.remainingCapacity -= timeTaken;
    }

    if (remainingQtyToSchedule > 0) {
        const schedulableQty = initialRequestedQuantity - Math.ceil(remainingQtyToSchedule);
        setTimeout(() => toast({
            title: "Insufficient Capacity",
            description: `With available capacity, you can schedule approximately ${schedulableQty} pieces.`,
            variant: "destructive"
        }), 0);
        setMultiShiftPlan(null);
    } else {
        setMultiShiftPlan(plan);
        setStep('multi_shift_confirm');
    }
  };

  const handleSingleShiftConfirm = () => {
    if (!selectedCondition || !scheduledQuantity || piecesPerCycle <= 0) return;
    
    const qty = parseInt(scheduledQuantity, 10);
    if(qty <= 0) return;

    const calculatedCycles = Math.ceil(qty / piecesPerCycle);
    const timeTaken = calculatedCycles * selectedCondition.cureTime;

    if (timeTaken > shift.remainingCapacity) {
        return; // This case is now handled by disabling the button.
    }

    const finalPressNo = parseInt(pressNo, 10);
    const finalDieNo = parseInt(dieNo, 10);

    const timeUsedInShift = shift.capacity - shift.remainingCapacity;
    const shiftStartDateTime = getShiftStartDateTime(shift);
    const taskStartTime = addMinutes(shiftStartDateTime, timeUsedInShift);
    const taskEndTime = addMinutes(taskStartTime, timeTaken);
    
    const newScheduledTask: Omit<ScheduledTask, 'id' | 'isSaved' | 'trackingSteps'> = {
      type: 'production',
      jobCardNumber: task.jobCardNumber,
      itemCode: task.itemCode,
      material: selectedMaterial,
      priority: task.priority,
      scheduledQuantity: qty,
      pressNo: finalPressNo,
      dieNo: finalDieNo,
      timeTaken: timeTaken,
      shiftId: shift.id,
      startTime: taskStartTime.toISOString(),
      endTime: taskEndTime.toISOString(),
      creationDate: task.creationDate,
      deliveryDate: task.deliveryDate,
      orderedQuantity: task.orderedQuantity,
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
    if (!selectedCondition) return;
    const numValue = parseInt(scheduledQuantity, 10);
    if (isNaN(numValue) || numValue <= 0) {
        setScheduledQuantity('1');
    } else if (numValue > maxPossibleQty) {
        setScheduledQuantity(String(maxPossibleQty));
        setTimeout(() => toast({ title: "Quantity Exceeded", description: `Maximum possible quantity is ${maxPossibleQty}.`, variant: "destructive" }), 0);
    }
  }

  const getDialogDescription = () => {
    switch(step) {
      case 'details':
        return `Select a valid die and material for item ${task.itemCode} on Press ${pressNo}.`;
      case 'select_operation':
        return 'Select an operation or enter production data manually if missing.';
      case 'confirm':
        return `Confirm the quantity to schedule. You can schedule up to ${Math.ceil(maxPossibleQty)} pieces.`;
      case 'multi_shift_confirm':
        return 'Review the proposed schedule plan across multiple upcoming shifts.';
      default:
        return '';
    }
  }

  const maxQtyInShift = useMemo(() => {
    if (!selectedCondition || piecesPerCycle <= 0 || shift.remainingCapacity <= 0) return 0;
    const maxCyclesInShift = Math.floor(shift.remainingCapacity / selectedCondition.cureTime);
    return Math.floor(maxCyclesInShift * piecesPerCycle);
  }, [selectedCondition, piecesPerCycle, shift]);


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
                <div className="font-medium text-right">{Math.ceil(task.remainingQuantity)} pcs</div>
                <div className="text-muted-foreground">Shift Capacity Left:</div>
                <div className="font-medium text-right">{shift.remainingCapacity} min</div>
                <Separator className="col-span-2 my-1" />
                 <div className="text-muted-foreground">Pieces/Hour:</div>
                <div className="font-mono text-right">{operationType === '1' ? selectedCondition.piecesPerHour1 : selectedCondition.piecesPerHour2}</div>
                <div className="text-muted-foreground">Time / Cycle:</div>
                <div className="font-mono text-right">{selectedCondition.cureTime} min</div>
                <div className="text-muted-foreground">Pieces / Cycle:</div>
                <div className="font-mono text-right">{piecesPerCycle.toFixed(2)}</div>
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
        <DialogFooter className="mt-4 flex-wrap gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => {
              setOperationType('');
              setStep('select_operation');
          }}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex flex-wrap gap-2 justify-end">
            
              {fitsInSingleShift && (
                <Button type="button" onClick={handleSingleShiftConfirm} disabled={scheduledQtyNum <= 0}>
                  Confirm Schedule
                </Button>
              )}
            
              <Button type="button" onClick={handleCalculateMultiShift} disabled={scheduledQtyNum <= 0}>
                <Calendar className="mr-2 h-4 w-4" /> Schedule Across Multiple Shifts
              </Button>
            
          </div>
        </DialogFooter>
         {!fitsInSingleShift && (
            <p className="text-sm text-destructive text-center mt-2">
                Time exceeds capacity. Adjust quantity to {maxQtyInShift} pcs or schedule across multiple shifts.
            </p>
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
                            <TableHead className="text-right">Qty / Action</TableHead>
                            <TableHead className="text-right">Time</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {multiShiftPlan.map((item, index) => {
                            const p_shift = shifts.find(s => s.id === item.shiftId);
                            const isMaint = item.type === 'maintenance';
                            return (
                                <TableRow key={index} className={isMaint ? 'bg-amber-100' : ''}>
                                    <TableCell className="font-medium">{p_shift?.day} {p_shift?.type}</TableCell>
                                    <TableCell className="text-right font-semibold">
                                        {isMaint ? (
                                            <div className="flex items-center justify-end gap-2">
                                                <Wrench className="h-4 w-4 text-amber-600" />
                                                <span>Die Cleaning</span>
                                            </div>
                                        ) : (
                                            <span>{Math.round(item.scheduledQuantity)} pcs</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">{item.timeTaken} min</TableCell>
                                </TableRow>
                            )
                        })}
                    </TableBody>
                </Table>
                </ScrollArea>
            </div>
            <DialogFooter className="mt-4 sm:justify-between">
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

  const renderSelectOperationStep = () => {
    const hasValidOperations = operationOptions.length > 0;
    const hasValidCureTime = selectedCondition && selectedCondition.cureTime > 0;
    const showManual = !hasValidOperations || !hasValidCureTime;

    return (
    <div>
        {showManual ? (
          <div className="grid gap-4 py-4">
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Missing Production Data</AlertTitle>
                <AlertDescription>
                    Please enter the production values to continue scheduling. This will be saved for your current session.
                </AlertDescription>
            </Alert>
            <div className="grid grid-cols-4 items-center gap-4 pt-2">
                <Label htmlFor="manualPcs" className="text-right">
                    Pieces / Hour
                </Label>
                <Input
                    id="manualPcs"
                    type="number"
                    placeholder="e.g., 60"
                    value={manualPiecesPerHour}
                    onChange={(e) => setManualPiecesPerHour(e.target.value)}
                    className="col-span-3"
                />
            </div>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="manualCureTime" className="text-right">
                    Cure Time (min)
                </Label>
                <Input
                    id="manualCureTime"
                    type="number"
                    placeholder="e.g., 5"
                    value={manualCureTime}
                    onChange={(e) => setManualCureTime(e.target.value)}
                    className="col-span-3"
                />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="operationType" className="text-right">Operation Type</Label>
              <Select value={operationType} onValueChange={setOperationType}>
                <SelectTrigger id="operationType" className="col-span-3">
                  <SelectValue placeholder="Select an operation type..." />
                </SelectTrigger>
                <SelectContent>
                  {operationOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <DialogFooter className="mt-4 sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => setStep('details')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button 
            type="button" 
            onClick={handleContinueToConfirm} 
            disabled={(!showManual && !operationType) || (showManual && (!manualPiecesPerHour || !manualCureTime))}
          >
            Continue
          </Button>
        </DialogFooter>
    </div>
    )
  };

  useEffect(() => {
    if (!open) {
      onClose();
    }
  }, [open, onClose]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Schedule Task: {task.jobCardNumber}</DialogTitle>
          <DialogDescription>
            {getDialogDescription()}
          </DialogDescription>
        </DialogHeader>

        {step === 'details' && (
          <div>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="pressNo" className="text-right">Press No.</Label>
                  <Input id="pressNo" value={pressNo} readOnly className="col-span-3 bg-secondary" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="dieNo" className="text-right">Die No.</Label>
                <div className="col-span-3">
                  <Select value={dieNo} onValueChange={d => { setDieNo(d); setSelectedMaterial(''); }}>
                    <SelectTrigger id="dieNo"><SelectValue placeholder="Select a die..." /></SelectTrigger>
                    <SelectContent>
                      {dieOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="material" className="text-right">Material (MOC)</Label>
                <div className="col-span-3">
                  <Select value={selectedMaterial} onValueChange={setSelectedMaterial} disabled={!dieNo || materialOptions.length === 0}>
                    <SelectTrigger id="material"><SelectValue placeholder="Select a material..." /></SelectTrigger>
                    <SelectContent>
                      {materialOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="button" onClick={() => setStep('select_operation')} disabled={!selectedCondition}>
                Next
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'select_operation' && renderSelectOperationStep()}
        {step === 'confirm' && renderConfirmStep()}
        {step === 'multi_shift_confirm' && renderMultiShiftConfirmStep()}
      </DialogContent>
    </Dialog>
  );
};
