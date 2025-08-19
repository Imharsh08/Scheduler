

'use client';

import React, { useState, useEffect } from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import type { ModuleSettings, ModuleConfig, TrackingStepName } from '@/types';
import { TRACKING_MODULES } from '@/lib/tracking-utils';
import { Accordion, AccordionContent, AccordionItem } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ModuleSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSettings: ModuleSettings;
  onSave: (newSettings: ModuleSettings) => void;
}

export const ModuleSettingsDialog: React.FC<ModuleSettingsDialogProps> = ({
  open,
  onOpenChange,
  currentSettings,
  onSave,
}) => {
  const [settings, setSettings] = useState(currentSettings);

  useEffect(() => {
    setSettings(currentSettings);
  }, [currentSettings, open]);

  const handleConfigChange = (moduleName: TrackingStepName, key: keyof ModuleConfig, value: any) => {
      setSettings(prev => ({
          ...prev,
          [moduleName]: {
              ...prev[moduleName],
              [key]: value,
          }
      }));
  }

  const handleSave = () => {
    onSave(settings);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">Module Settings</DialogTitle>
          <DialogDescription>
            Configure each step of your production tracking workflow.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-4">
            <Accordion type="multiple" className="w-full py-4" defaultValue={TRACKING_MODULES}>
                {TRACKING_MODULES.map(moduleName => {
                    const config = settings[moduleName];
                    if (!config) return null;

                    const otherModules = TRACKING_MODULES.filter(m => m !== moduleName);

                    return (
                        <AccordionItem value={moduleName} key={moduleName}>
                            <AccordionPrimitive.Header className="flex items-center pl-2 pr-4">
                                <Switch
                                    checked={config.enabled}
                                    onCheckedChange={(checked) => handleConfigChange(moduleName, 'enabled', checked)}
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label={`Enable or disable the ${moduleName} module`}
                                />
                                <AccordionPrimitive.Trigger className="flex flex-1 items-center justify-between py-4 pl-4 font-medium transition-all hover:underline [&[data-state=open]>svg]:rotate-180">
                                    <span className={cn('font-medium', !config.enabled && "text-muted-foreground")}>
                                        {moduleName}
                                    </span>
                                    <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />
                                </AccordionPrimitive.Trigger>
                            </AccordionPrimitive.Header>
                            <AccordionContent className="pt-2 pl-4 border-l ml-4 space-y-4">
                                <div className="grid grid-cols-5 items-center gap-4">
                                    <Label className="col-span-2">Depends On</Label>
                                    <Select 
                                        value={config.dependsOn}
                                        onValueChange={(value) => handleConfigChange(moduleName, 'dependsOn', value)}
                                        disabled={!config.enabled}
                                    >
                                        <SelectTrigger className="col-span-3">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="scheduled_end_time">Schedule End Time</SelectItem>
                                            {otherModules.map(m => (
                                                <SelectItem key={m} value={m} disabled={!settings[m]?.enabled}>{m}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-5 items-center gap-4">
                                    <Label className="col-span-2">Turnaround Time</Label>
                                    <Input
                                        type="number"
                                        value={config.tat ?? ''}
                                        onChange={(e) => handleConfigChange(moduleName, 'tat', Number(e.target.value))}
                                        className="col-span-1"
                                        disabled={!config.enabled}
                                     />
                                     <Select
                                        value={config.tatUnit}
                                        onValueChange={(value) => handleConfigChange(moduleName, 'tatUnit', value)}
                                        disabled={!config.enabled}
                                     >
                                        <SelectTrigger className="col-span-2">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="days">Days</SelectItem>
                                            <SelectItem value="hours">Hours</SelectItem>
                                        </SelectContent>
                                     </Select>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    )
                })}
            </Accordion>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
