
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductionCondition } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';

interface MaintenanceTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productionConditions: ProductionCondition[];
  presses: number[];
  onCreate: (pressNo: number, dieNo: number, duration: number, reason: string) => void;
  selectedPress: number | null;
  defaultDuration: number;
  onDefaultDurationChange: (duration: number) => void;
}

export const MaintenanceTaskDialog: React.FC<MaintenanceTaskDialogProps> = ({
  open,
  onOpenChange,
  productionConditions,
  presses,
  onCreate,
  selectedPress,
  defaultDuration,
  onDefaultDurationChange,
}) => {
  const [pressNo, setPressNo] = useState('');
  const [dieNo, setDieNo] = useState('');
  const [duration, setDuration] = useState('');
  const [reason, setReason] = useState('');
  const [localDefaultDuration, setLocalDefaultDuration] = useState(String(defaultDuration));

  const { toast } = useToast();

  useEffect(() => {
    if (selectedPress !== null) {
        setPressNo(String(selectedPress));
    }
  }, [selectedPress]);

  const dieOptions = useMemo(() => {
    if (!pressNo) return [];
    const selectedPressNum = parseInt(pressNo, 10);
    const dies = productionConditions
      .filter(pc => pc.pressNo === selectedPressNum)
      .map(pc => pc.dieNo);
    return [...new Set(dies)].sort((a, b) => a - b);
  }, [productionConditions, pressNo]);

  useEffect(() => {
    if (!open) {
      // Reset form when dialog is closed, but respect pre-selected press
      setDieNo('');
      setDuration('');
      setReason('');
      if (selectedPress === null) {
          setPressNo('');
      }
    } else {
        if (selectedPress !== null) {
            setPressNo(String(selectedPress));
        }
        setLocalDefaultDuration(String(defaultDuration));
    }
  }, [open, selectedPress, defaultDuration]);

  const handleCreate = () => {
    const numPressNo = parseInt(pressNo, 10);
    const numDieNo = parseInt(dieNo, 10);
    const numDuration = parseInt(duration, 10);

    if (isNaN(numPressNo) || isNaN(numDieNo) || isNaN(numDuration) || numDuration <= 0 || !reason) {
      toast({
        title: 'Invalid Input',
        description: 'Please fill out all fields for the manual task with valid values.',
        variant: 'destructive',
      });
      return;
    }

    onCreate(numPressNo, numDieNo, numDuration, reason);
  };
  
  const handleSaveSettings = () => {
      const numDuration = parseInt(localDefaultDuration, 10);
      if (isNaN(numDuration) || numDuration <= 0) {
          toast({
              title: "Invalid Duration",
              description: "Please enter a valid, positive number for the default duration.",
              variant: "destructive",
          });
          return;
      }
      onDefaultDurationChange(numDuration);
      toast({
          title: "Settings Saved",
          description: "Default maintenance duration updated.",
      });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Maintenance Settings</DialogTitle>
          <DialogDescription>
            Create a manual maintenance card or set the default duration for automatic cleaning tasks.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">

            <div className="space-y-2">
                <Label htmlFor="default_duration">Default Cleaning Duration (minutes)</Label>
                <div className='flex gap-2'>
                    <Input
                      id="default_duration"
                      type="number"
                      placeholder="e.g., 30"
                      value={localDefaultDuration}
                      onChange={(e) => setLocalDefaultDuration(e.target.value)}
                    />
                    <Button onClick={handleSaveSettings}>Save</Button>
                </div>
                <p className="text-xs text-muted-foreground">Used for automatic maintenance scheduling.</p>
            </div>
        
            <Separator className="my-6" />

            <div className='space-y-4'>
                <h3 className="text-sm font-semibold text-muted-foreground">Create Manual Maintenance Card</h3>
                 <div className="space-y-2">
                    <Label htmlFor="pressNo">Press Number</Label>
                    <Select value={pressNo} onValueChange={value => { setPressNo(value); setDieNo(''); }}>
                      <SelectTrigger id="pressNo">
                        <SelectValue placeholder="Select a press..." />
                      </SelectTrigger>
                      <SelectContent>
                        {presses.map(p => <SelectItem key={p} value={String(p)}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dieNo">Die Number</Label>
                     <Select value={dieNo} onValueChange={setDieNo} disabled={!pressNo}>
                      <SelectTrigger id="dieNo">
                        <SelectValue placeholder="Select a die..." />
                      </SelectTrigger>
                      <SelectContent>
                        {dieOptions.map(d => <SelectItem key={d} value={String(d)}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      placeholder="e.g., 60"
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason</Label>
                    <Input
                      id="reason"
                      placeholder="e.g., Deep Cleaning"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
            </div>
        </div>
        <DialogFooter className="flex justify-between w-full">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={handleCreate}>
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
