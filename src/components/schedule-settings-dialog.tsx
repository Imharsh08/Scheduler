
'use client';

import React from 'react';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';

interface ScheduleSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  horizon: 'weekly' | 'monthly';
  onHorizonChange: (horizon: 'weekly' | 'monthly') => void;
  holidays: Date[];
  onHolidaysChange: (dates: Date[] | undefined) => void;
  onSave: () => void;
}

export const ScheduleSettingsDialog: React.FC<ScheduleSettingsDialogProps> = ({
  open,
  onOpenChange,
  horizon,
  onHorizonChange,
  holidays,
  onHolidaysChange,
  onSave,
}) => {

  const handleSave = () => {
    onSave();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-headline">Schedule Settings</DialogTitle>
          <DialogDescription>
            Configure the schedule view and set non-working days.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
            <div className="space-y-2">
                <Label>Schedule Horizon</Label>
                <RadioGroup value={horizon} onValueChange={(value) => onHorizonChange(value as 'weekly' | 'monthly')} className="flex gap-4 pt-2">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="weekly" id="weekly" />
                        <Label htmlFor="weekly" className="font-normal cursor-pointer">Weekly</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="monthly" id="monthly" />
                        <Label htmlFor="monthly" className="font-normal cursor-pointer">Monthly</Label>
                    </div>
                </RadioGroup>
            </div>

            <div className="space-y-2">
                <Label>Holidays & Non-Working Days</Label>
                <p className="text-sm text-muted-foreground">Select dates on the calendar to exclude them from scheduling.</p>
                <div className="flex justify-center rounded-md border">
                    <Calendar
                        mode="multiple"
                        selected={holidays}
                        onSelect={onHolidaysChange}
                    />
                </div>
            </div>

        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
