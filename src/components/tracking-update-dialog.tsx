

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, AlertCircle, Info, Star } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { ScheduledTask, TrackingStep, TrackingStepName, TrackingStatus, ModuleSettings } from '@/types';
import { cn } from '@/lib/utils';
import { format, setHours, setMinutes, getHours, getMinutes, isValid } from 'date-fns';
import { TRACKING_MODULES } from '@/lib/tracking-utils';
import { useToast } from "@/hooks/use-toast";

interface DateTimePickerProps {
    date: Date | undefined;
    setDate: (date: Date | undefined) => void;
    label: string;
    plannedDate: Date | null;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({ date, setDate, label, plannedDate }) => {
    const [time, setTime] = useState({
        hour: date ? getHours(date) : (plannedDate ? getHours(plannedDate) : 0),
        minute: date ? getMinutes(date) : (plannedDate ? getMinutes(plannedDate) : 0),
    });

    useEffect(() => {
        if (date) {
            setTime({ hour: getHours(date), minute: getMinutes(date) });
        } else if (plannedDate) {
            setTime({ hour: getHours(plannedDate), minute: getMinutes(plannedDate) });
        }
    }, [date, plannedDate]);

    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (selectedDate) {
            const newDate = setMinutes(setHours(selectedDate, time.hour), time.minute);
            setDate(newDate);
        } else {
            setDate(undefined);
        }
    };

    const handleTimeChange = (part: 'hour' | 'minute', value: string) => {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue)) return;

        const newTime = { ...time, [part]: numValue };
        setTime(newTime);

        if (date) {
            const newDate = setMinutes(setHours(date, newTime.hour), newTime.minute);
            setDate(newDate);
        } else if (plannedDate) {
            const newDate = setMinutes(setHours(plannedDate, newTime.hour), newTime.minute);
            setDate(newDate);
        }
    };
    
    const placeholderText = plannedDate ? `Planned: ${format(plannedDate, 'dd/MM/yyyy hh:mm a')}` : 'Pick a date';

    return (
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor={label} className="text-right">{label}</Label>
            <div className="col-span-3 flex gap-2">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant={"outline"} className={cn("flex-1 justify-start text-left font-normal", !date && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : 
                                (plannedDate ? format(plannedDate, "PPP") : <span>Pick a date</span>)
                            }
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus />
                    </PopoverContent>
                </Popover>
                <Input
                    type="number"
                    min="0"
                    max="23"
                    value={String(time.hour).padStart(2, '0')}
                    onChange={(e) => handleTimeChange('hour', e.target.value)}
                    className="w-16"
                    aria-label="Hour"
                />
                <Input
                    type="number"
                    min="0"
                    max="59"
                    value={String(time.minute).padStart(2, '0')}
                    onChange={(e) => handleTimeChange('minute', e.target.value)}
                    className="w-16"
                    aria-label="Minute"
                />
            </div>
            {!date && (
                <div className="col-start-2 col-span-3 -mt-3">
                    <p className="text-xs text-muted-foreground">{placeholderText}</p>
                </div>
            )}
        </div>
    );
};

interface TrackingUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: ScheduledTask;
  stepName: TrackingStepName;
  settings: ModuleSettings;
  onUpdate: (taskId: string, stepName: string, updatedStepData: any) => void;
}


export const TrackingUpdateDialog: React.FC<TrackingUpdateDialogProps> = ({
  open,
  onOpenChange,
  task,
  stepName,
  settings,
  onUpdate,
}) => {
  const [currentStep, setCurrentStep] = useState<TrackingStep | null>(null);
  const [status, setStatus] = useState<TrackingStatus>('Pending');
  const [outputQty, setOutputQty] = useState('');
  const [rejectedQty, setRejectedQty] = useState('');
  const [notes, setNotes] = useState('');
  const [actualStartDate, setActualStartDate] = useState<Date | undefined>();
  const [actualEndDate, setActualEndDate] = useState<Date | undefined>();
  const [isStatusManuallySet, setIsStatusManuallySet] = useState(false);
  const [satisfactionRating, setSatisfactionRating] = useState(0);

  const { toast } = useToast();

  const inputQty = useMemo(() => {
    if (!task || !settings) return 0;
    
    let dependencyName = settings[stepName].dependsOn;
    while(dependencyName !== 'scheduled_end_time' && !settings[dependencyName]?.enabled) {
      dependencyName = settings[dependencyName].dependsOn;
    }

    if (dependencyName === 'scheduled_end_time') {
      return Math.round(task.scheduledQuantity);
    }

    const prevStepData = task.trackingSteps.find(s => s.stepName === dependencyName);
    return prevStepData?.outputQty || 0;
  }, [task, stepName, settings]);

  const passedQty = useMemo(() => {
    if (stepName !== 'Inspection') return 0;
    return inputQty - (parseInt(rejectedQty, 10) || 0);
  }, [stepName, inputQty, rejectedQty]);

  const excessQty = useMemo(() => {
    if (stepName !== 'Inspection') return 0;
    return Math.max(0, passedQty - Math.round(task.scheduledQuantity));
  }, [stepName, passedQty, task.scheduledQuantity]);
  
  const finalOutputQty = useMemo(() => {
    if (stepName !== 'Inspection') return parseInt(outputQty, 10) || 0;
    return passedQty - excessQty;
  }, [stepName, outputQty, passedQty, excessQty]);


  useEffect(() => {
    if (open) {
      const stepData = task.trackingSteps.find(s => s.stepName === stepName);
      if (stepData) {
        setCurrentStep(stepData);
        setStatus(stepData.status);
        setOutputQty(String(stepData.outputQty || ''));
        setRejectedQty(String(stepData.rejectedQty || ''));
        setNotes(stepData.notes || '');
        setSatisfactionRating(stepData.satisfactionRating || 0);
        
        let start: Date | undefined = undefined;
        if (stepData.actualStartDate && isValid(new Date(stepData.actualStartDate))) {
            start = new Date(stepData.actualStartDate);
        } 
        setActualStartDate(start);
        
        let end: Date | undefined = undefined;
        if (stepData.actualEndDate && isValid(new Date(stepData.actualEndDate))) {
            end = new Date(stepData.actualEndDate);
        }
        setActualEndDate(end);

        setIsStatusManuallySet(false);
      }
    }
  }, [open, task, stepName, settings]);

  useEffect(() => {
    if (isStatusManuallySet || !open) return;
    
    const numOutputQty = (stepName === 'Inspection') ? passedQty : (parseInt(outputQty, 10) || 0);

    if (isNaN(numOutputQty) || numOutputQty <= 0) {
        setStatus('Pending');
    } else if (numOutputQty < inputQty) {
        setStatus('In Progress');
    } else if (numOutputQty >= inputQty) {
        setStatus('Completed');
    }
  }, [outputQty, rejectedQty, inputQty, isStatusManuallySet, open, stepName, passedQty]);


  const handleSave = () => {
    if (!currentStep) return;

    const finalStartDate = actualStartDate;
    const finalEndDate = actualEndDate;
    
    let finalStatus = status;
    if (stepName === 'Feedback' && satisfactionRating > 0) {
        finalStatus = 'Completed';
    }
    
    const updatedData: Partial<TrackingStep> = {
      status: finalStatus,
      outputQty: finalOutputQty,
      rejectedQty: parseInt(rejectedQty, 10) || 0,
      excessQty: excessQty,
      notes,
      actualStartDate: finalStartDate?.toISOString(),
      actualEndDate: finalEndDate?.toISOString(),
      satisfactionRating: satisfactionRating,
    };

    if (excessQty > 0) {
      toast({
        title: "Excess Quantity Recorded",
        description: `${excessQty} pieces will be moved to Finished Goods Stock.`,
      });
    }

    onUpdate(task.id, stepName, updatedData);
  };

  const handleStatusChange = (value: TrackingStatus) => {
    setStatus(value);
    setIsStatusManuallySet(true);
  }
  
  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOutputQty(e.target.value);
    setIsStatusManuallySet(false);
  }

  const handleRejectedQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setRejectedQty(e.target.value);
      setIsStatusManuallySet(false);
  }

  if (!currentStep) return null;

  const plannedStartDate = currentStep.plannedStartDate && isValid(new Date(currentStep.plannedStartDate)) ? new Date(currentStep.plannedStartDate) : null;
  const plannedEndDate = currentStep.plannedEndDate && isValid(new Date(currentStep.plannedEndDate)) ? new Date(currentStep.plannedEndDate) : null;
  
  const renderNormalStep = () => (
    <>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="inputQty" className="text-right">Input Qty</Label>
          <Input id="inputQty" value={inputQty} readOnly className="col-span-3 bg-secondary" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="outputQty" className="text-right">Output Qty</Label>
            <Input id="outputQty" type="number" value={outputQty} onChange={handleQtyChange} className="col-span-3" />
        </div>
    </>
  );

  const renderInspectionStep = () => (
    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
        <div className="space-y-1">
            <Label htmlFor="inputQty">Input Qty</Label>
            <Input id="inputQty" value={inputQty} readOnly className="bg-secondary" />
        </div>
        <div className="space-y-1">
            <Label htmlFor="rejectedQty" className="text-destructive">Rejected Qty</Label>
            <Input id="rejectedQty" type="number" value={rejectedQty} onChange={handleRejectedQtyChange} />
        </div>
        <div className="space-y-1">
            <Label htmlFor="passedQty" className="text-blue-600">Passed Qty</Label>
            <Input id="passedQty" value={passedQty} readOnly className="bg-secondary" />
        </div>
         <div className="space-y-1">
            <Label htmlFor="excessQty" className="text-amber-600">Excess Qty (to FG)</Label>
            <Input id="excessQty" value={excessQty} readOnly className="bg-secondary" />
        </div>
        <div className="space-y-1 col-span-2">
            <Label htmlFor="outputQty" className="text-green-600">Final Output (to Dispatch)</Label>
            <Input id="outputQty" value={finalOutputQty} readOnly className="bg-secondary font-bold" />
        </div>
    </div>
  );
  
  const renderFeedbackStep = () => (
    <>
      <div className="grid grid-cols-4 items-center gap-4">
          <Label className="text-right">Rating</Label>
          <div className="col-span-3 flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                  <Button
                      key={star}
                      variant="ghost"
                      size="icon"
                      onClick={() => setSatisfactionRating(star)}
                      className="text-yellow-400 hover:text-yellow-300"
                  >
                      <Star className={cn("h-6 w-6", satisfactionRating >= star ? "fill-current" : "")} />
                  </Button>
              ))}
          </div>
      </div>
      <div className="grid grid-cols-4 items-start gap-4">
          <Label htmlFor="notes" className="text-right pt-2">Feedback Notes</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="col-span-3" placeholder="Add customer feedback or other notes..." />
      </div>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{stepName} - {task.jobCardNumber}</DialogTitle>
          <DialogDescription>
            {currentStep.plannedEndDate 
                ? `Planned End Date: ${format(new Date(currentStep.plannedEndDate), "dd MMM yyyy, hh:mm a")}`
                : "Update the status and details for this tracking step."
            }
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          
          {stepName !== 'Feedback' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">Status</Label>
              <Select value={status} onValueChange={handleStatusChange}>
                <SelectTrigger id="status" className="col-span-3">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          
          {stepName === 'Inspection' ? renderInspectionStep() :
           stepName === 'Feedback' ? renderFeedbackStep() :
           renderNormalStep()
          }

          {stepName !== 'Feedback' && (
            <>
              <DateTimePicker date={actualStartDate} setDate={setActualStartDate} label="Start Date" plannedDate={plannedStartDate} />
              <DateTimePicker date={actualEndDate} setDate={setActualEndDate} label="End Date" plannedDate={plannedEndDate}/>
               <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="notes" className="text-right pt-2">Notes</Label>
                  <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="col-span-3" placeholder="Add any relevant notes..." />
               </div>
            </>
           )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
