
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from "@/hooks/use-toast";
import type { ScheduledTask, ProductionCondition, Shift, Task } from '@/types';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { addMinutes } from 'date-fns';

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
  const [scheduledQuantity, setScheduledQuantity] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const originalTaskFromList = useMemo(() => {
    const originalUnscheduledTask = mainTaskList.find(t => t.jobCardNumber === task?.jobCardNumber);
    // If the task is not in the list, it means it was fully scheduled. 
    // We create a temporary representation for calculation.
    if (!originalUnscheduledTask && task) {
        return {
            ...task,
            remainingQuantity: 0,
            orderedQuantity: task.scheduledQuantity, // Best guess
        };
    }
    return originalUnscheduledTask;
  },[mainTaskList, task]);

  const totalAvailableQuantity = useMemo(() => {
    if (!task || !originalTaskFromList) return 0;
    return originalTaskFromList.remainingQuantity + task.scheduledQuantity;
  }, [originalTaskFromList, task]);

  const condition = useMemo(() => {
    if (!task) return null;
    return productionConditions.find(pc => 
      pc.itemCode === task.itemCode && 
      pc.pressNo === task.pressNo && 
      pc.dieNo === task.dieNo && 
      pc.material === task.material
    );
  }, [productionConditions, task]);
  
  const piecesPerCycle = useMemo(() => {
    if (!task || !condition || task.scheduledQuantity === 0 || condition.cureTime === 0) return 0;
    const originalCycles = task.timeTaken / condition.cureTime;
    // Handle potential floating point inaccuracies
    return Math.round(task.scheduledQuantity / originalCycles);
  }, [task, condition]);


  useEffect(() => {
    if (task) {
      setScheduledQuantity(String(task.scheduledQuantity));
    }
  }, [task, open]);

  if (!task || !shift || !condition || piecesPerCycle === 0) {
    return null;
  }

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d*$/.test(value)) {
      setScheduledQuantity(value);
    }
  };

  const handleUpdate = () => {
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
    const newTimeTaken = newCycles * condition.cureTime;
    const timeAvailableInShift = shift.remainingCapacity + task.timeTaken;

    if (newTimeTaken > timeAvailableInShift) {
      toast({ title: "Exceeds Capacity", description: `This quantity requires ${newTimeTaken} minutes, but only ${timeAvailableInShift} minutes are available in this shift.`, variant: "destructive" });
      return;
    }

    const newEndTime = addMinutes(new Date(task.startTime), newTimeTaken).toISOString();
    
    onUpdate({
      id: task.id,
      scheduledQuantity: newQuantity,
      timeTaken: newTimeTaken,
      endTime: newEndTime,
    });
  };

  const newQty = parseInt(scheduledQuantity, 10) || 0;
  const newTime = isNaN(newQty) || piecesPerCycle === 0 ? 0 : condition.cureTime * Math.ceil(newQty / piecesPerCycle);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Scheduled Task</DialogTitle>
          <DialogDescription>
            Adjust the quantity for job card {task.jobCardNumber}.
          </DialogDescription>
        </DialogHeader>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
