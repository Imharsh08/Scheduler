
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import type { ScheduledTask, ProductionCondition, Shift, Task } from '@/types';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { addMinutes } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface EditScheduledTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: ScheduledTask | null;
  shift: Shift | null;
  mainTaskList: Task[];
  productionConditions: ProductionCondition[];
  onUpdate: (updatedTask: Partial<ScheduledTask>) => void;
}

export const EditScheduledTaskDialog: React.FC<EditScheduledTaskDialogProps> = ({
  open,
  onOpenChange,
  task,
  shift,
  mainTaskList,
  productionConditions,
  onUpdate,
}) => {
  const [step, setStep] = useState<'details' | 'confirm'>('details');
  
  const [editedDieNo, setEditedDieNo] = useState('');
  const [editedMaterial, setEditedMaterial] = useState('');
  const [editedOperation, setEditedOperation] = useState('');
  const [scheduledQuantity, setScheduledQuantity] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const originalTaskFromList = useMemo(() => {
    if (!task) return null;
    const originalUnscheduledTask = mainTaskList.find(t => t.jobCardNumber === task.jobCardNumber);
    if (!originalUnscheduledTask) {
        return { ...task, remainingQuantity: 0 };
    }
    return originalUnscheduledTask;
  },[mainTaskList, task]);

  const totalAvailableQuantity = useMemo(() => {
    if (!task || !originalTaskFromList) return 0;
    return originalTaskFromList.remainingQuantity + task.scheduledQuantity;
  }, [originalTaskFromList, task]);

  // Derived state for available options
  const dieOptions = useMemo(() => {
    if (!task) return [];
    return [...new Set(productionConditions
      .filter(pc => pc.itemCode === task.itemCode && pc.pressNo === task.pressNo)
      .map(pc => String(pc.dieNo))
    )].sort((a,b) => Number(a) - Number(b));
  }, [productionConditions, task]);

  const materialOptions = useMemo(() => {
    if (!task || !editedDieNo) return [];
    const dieNum = Number(editedDieNo);
    return [...new Set(productionConditions
        .filter(pc => pc.itemCode === task.itemCode && pc.pressNo === task.pressNo && pc.dieNo === dieNum)
        .map(pc => pc.material)
    )];
  }, [productionConditions, task, editedDieNo]);

  const selectedCondition = useMemo(() => {
    if (!task || !editedDieNo || !editedMaterial) return null;
    return productionConditions.find(pc => 
      pc.itemCode === task.itemCode && 
      pc.pressNo === task.pressNo && 
      pc.dieNo === Number(editedDieNo) && 
      pc.material === editedMaterial
    );
  }, [productionConditions, task, editedDieNo, editedMaterial]);
  
  const operationOptions = useMemo(() => {
    if (!selectedCondition) return [];
    const options = [];
    if (selectedCondition.piecesPerCycle1 > 0) options.push({ value: '1', label: `One Side (${selectedCondition.piecesPerCycle1} pcs/cycle)` });
    if (selectedCondition.piecesPerCycle2 > 0) options.push({ value: '2', label: `Two Side (${selectedCondition.piecesPerCycle2} pcs/cycle)` });
    return options;
  }, [selectedCondition]);

  const piecesPerCycle = useMemo(() => {
    if (!selectedCondition || !editedOperation) return 0;
    return editedOperation === '1' ? selectedCondition.piecesPerCycle1 : selectedCondition.piecesPerCycle2;
  }, [selectedCondition, editedOperation]);

  useEffect(() => {
    if (task && open) {
      setStep('details');
      setEditedDieNo(String(task.dieNo));
      setEditedMaterial(task.material);
      setScheduledQuantity(String(task.scheduledQuantity));
      
      const originalCondition = productionConditions.find(pc => 
        pc.itemCode === task.itemCode && 
        pc.pressNo === task.pressNo && 
        pc.dieNo === task.dieNo && 
        pc.material === task.material
      );

      if (originalCondition) {
        const originalCycles = task.timeTaken / originalCondition.cureTime;
        const originalPcsPerCycle = Math.round(task.scheduledQuantity / originalCycles);
        if (originalPcsPerCycle === originalCondition.piecesPerCycle1) {
            setEditedOperation('1');
        } else if (originalPcsPerCycle === originalCondition.piecesPerCycle2) {
            setEditedOperation('2');
        } else {
            setEditedOperation('');
        }
      } else {
        setEditedOperation('');
      }
    }
  }, [task, open, productionConditions]);

  // Reset material/operation when die changes
  useEffect(() => { if (open) { setEditedMaterial(''); setEditedOperation(''); } }, [editedDieNo, open]);
  // Reset operation when material changes
  useEffect(() => { if (open) setEditedOperation(''); }, [editedMaterial, open]);


  const handleContinue = () => {
    if (!editedDieNo || !editedMaterial || !editedOperation) {
        toast({ title: "Details Incomplete", description: "Please select a die, material, and operation.", variant: "destructive" });
        return;
    }
    setStep('confirm');
  }

  const handleUpdate = () => {
    if (!selectedCondition) return;

    const newQuantity = parseInt(scheduledQuantity, 10);
    if (isNaN(newQuantity) || newQuantity <= 0) {
      toast({ title: "Invalid Quantity", description: "Please enter a valid quantity greater than zero.", variant: "destructive" });
      return;
    }

    if (newQuantity > totalAvailableQuantity) {
      toast({ title: "Quantity Exceeded", description: `Cannot schedule more than the total job quantity of ${totalAvailableQuantity}.`, variant: "destructive" });
      return;
    }
    
    const newCycles = Math.ceil(newQuantity / piecesPerCycle);
    const newTimeTaken = newCycles * selectedCondition.cureTime;
    const timeAvailableInShift = shift!.remainingCapacity + task!.timeTaken;

    if (newTimeTaken > timeAvailableInShift) {
      toast({ title: "Exceeds Capacity", description: `This quantity requires ${newTimeTaken} minutes, but only ${timeAvailableInShift} minutes are available in this shift.`, variant: "destructive" });
      return;
    }

    const newEndTime = addMinutes(new Date(task!.startTime), newTimeTaken).toISOString();
    
    onUpdate({
      id: task!.id,
      scheduledQuantity: newQuantity,
      timeTaken: newTimeTaken,
      endTime: newEndTime,
      dieNo: Number(editedDieNo),
      material: editedMaterial,
    });
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*$/.test(value)) {
      setScheduledQuantity(value);
    }
  };

  const newQty = parseInt(scheduledQuantity, 10) || 0;
  const newTime = isNaN(newQty) || piecesPerCycle === 0 || !selectedCondition ? 0 : selectedCondition.cureTime * Math.ceil(newQty / piecesPerCycle);

  if (!task || !shift) {
    return null;
  }

  const renderDetailsStep = () => (
    <>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="dieNo" className="text-right">Die No.</Label>
          <Select value={editedDieNo} onValueChange={setEditedDieNo}>
            <SelectTrigger id="dieNo" className="col-span-3"><SelectValue placeholder="Select a die..." /></SelectTrigger>
            <SelectContent>{dieOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="material" className="text-right">Material</Label>
          <Select value={editedMaterial} onValueChange={setEditedMaterial} disabled={!editedDieNo}>
            <SelectTrigger id="material" className="col-span-3"><SelectValue placeholder="Select a material..." /></SelectTrigger>
            <SelectContent>{materialOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="operation" className="text-right">Operation</Label>
          <Select value={editedOperation} onValueChange={setEditedOperation} disabled={!editedMaterial}>
            <SelectTrigger id="operation" className="col-span-3"><SelectValue placeholder="Select an operation..." /></SelectTrigger>
            <SelectContent>{operationOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button onClick={handleContinue} disabled={!editedOperation}>Next</Button>
      </DialogFooter>
    </>
  );

  const renderConfirmStep = () => (
    <>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="quantity" className="text-right">Schedule Qty</Label>
          <Input id="quantity" value={scheduledQuantity} onChange={handleQuantityChange} className="col-span-3" />
        </div>
        <Card className="bg-secondary/50">
          <CardContent className="p-3">
            <h4 className="text-sm font-semibold mb-2 text-center">Calculation Details</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                <div className="text-muted-foreground">Total Job Quantity:</div>
              <div className="font-medium text-right">{totalAvailableQuantity} pcs</div>
              <div className="text-muted-foreground">Shift Capacity Available:</div>
              <div className="font-medium text-right">{shift.remainingCapacity + task.timeTaken} min</div>
              <Separator className="col-span-2 my-1" />
              <div className="text-muted-foreground">New Time Required:</div>
              <div className="font-mono text-right">{isNaN(newTime) ? 0 : newTime} min</div>
            </div>
          </CardContent>
        </Card>
      </div>
      <DialogFooter className="sm:justify-between">
        <Button variant="ghost" onClick={() => setStep('details')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={handleUpdate} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Task
        </Button>
      </DialogFooter>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Scheduled Task</DialogTitle>
          <DialogDescription>
            Adjust the details for job card {task.jobCardNumber}.
          </DialogDescription>
        </DialogHeader>
        {step === 'details' ? renderDetailsStep() : renderConfirmStep()}
      </DialogContent>
    </Dialog>
  );
};
