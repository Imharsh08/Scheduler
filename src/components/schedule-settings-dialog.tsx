
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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import type { AppSettings } from '@/types';
import { ScrollArea } from './ui/scroll-area';

interface ScheduleSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  onSave: () => void;
}

export const ScheduleSettingsDialog: React.FC<ScheduleSettingsDialogProps> = ({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
  onSave,
}) => {

  const handleSave = () => {
    onSave();
    onOpenChange(false);
  }

  const handleFieldChange = (field: keyof AppSettings, value: any) => {
    onSettingsChange({ ...settings, [field]: value });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-headline">Schedule Settings</DialogTitle>
          <DialogDescription>
            Configure the schedule view, shift timings, and non-working days.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="grid gap-6 py-4 pr-6">
              <div className="space-y-2">
                  <Label>Schedule Horizon</Label>
                  <RadioGroup value={settings.scheduleHorizon} onValueChange={(value) => handleFieldChange('scheduleHorizon', value)} className="flex gap-4 pt-2">
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

              <Separator />

              <div className="space-y-4">
                  <Label>Shift Timings (IST)</Label>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label htmlFor="dayShiftStart">Day Shift Start</Label>
                          <Input id="dayShiftStart" type="time" value={settings.dayShiftStart} onChange={(e) => handleFieldChange('dayShiftStart', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="dayShiftEnd">Day Shift End</Label>
                          <Input id="dayShiftEnd" type="time" value={settings.dayShiftEnd} onChange={(e) => handleFieldChange('dayShiftEnd', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="nightShiftStart">Night Shift Start</Label>
                          <Input id="nightShiftStart" type="time" value={settings.nightShiftStart} onChange={(e) => handleFieldChange('nightShiftStart', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                          <Label htmlFor="nightShiftEnd">Night Shift End</Label>
                          <Input id="nightShiftEnd" type="time" value={settings.nightShiftEnd} onChange={(e) => handleFieldChange('nightShiftEnd', e.target.value)} />
                      </div>
                  </div>
              </div>

              <Separator />

              <div className="space-y-2">
                  <Label>Holidays & Non-Working Days</Label>
                  <p className="text-sm text-muted-foreground">Select dates on the calendar to exclude them from scheduling.</p>
                  <div className="flex justify-center rounded-md border">
                      <Calendar
                          mode="multiple"
                          selected={settings.holidays}
                          onSelect={(dates) => handleFieldChange('holidays', dates || [])}
                      />
                  </div>
              </div>

              <Separator />
              
              <div className="space-y-2">
                  <Label>Ideal Schedule Generation</Label>
                  <div className="flex items-center space-x-2 pt-2">
                      <Checkbox
                          id="includeToday"
                          checked={settings.includeToday}
                          onCheckedChange={(checked) => handleFieldChange('includeToday', checked === true)}
                      />
                      <Label htmlFor="includeToday" className="font-normal cursor-pointer leading-snug">
                          Include today's shifts when generating an "Ideal Schedule"
                      </Label>
                  </div>
              </div>
          </div>
        </ScrollArea>
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
