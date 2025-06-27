
'use client';

import React, { useState, useEffect } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { ProductionCondition } from '@/types';
import { cn } from '@/lib/utils';

interface ColorSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productionConditions: ProductionCondition[];
  pressColors: Record<number, string>;
  onSave: (newColors: Record<number, string>) => void;
}

// A palette of aesthetic, distinct colors.
export const COLOR_PALETTE = [
  'bg-sky-200 border-sky-400',
  'bg-emerald-200 border-emerald-400',
  'bg-amber-200 border-amber-400',
  'bg-rose-200 border-rose-400',
  'bg-violet-200 border-violet-400',
  'bg-lime-200 border-lime-400',
  'bg-cyan-200 border-cyan-400',
  'bg-fuchsia-200 border-fuchsia-400',
  'bg-orange-200 border-orange-400',
  'bg-teal-200 border-teal-400',
  'bg-indigo-200 border-indigo-400',
  'bg-yellow-200 border-yellow-400',
  'bg-pink-200 border-pink-400',
  'bg-slate-200 border-slate-400',
];

export const ColorSettingsDialog: React.FC<ColorSettingsDialogProps> = ({
  open,
  onOpenChange,
  productionConditions,
  pressColors,
  onSave,
}) => {
  const [localColors, setLocalColors] = useState<Record<number, string>>(pressColors);

  useEffect(() => {
    // When the dialog opens or the source colors change, update the local state.
    setLocalColors(pressColors);
  }, [pressColors, open]);

  const pressNos = React.useMemo(() => {
    const presses = productionConditions.map(pc => pc.pressNo);
    return [...new Set(presses)].sort((a, b) => a - b);
  }, [productionConditions]);

  const handleColorSelect = (pressNo: number, colorClass: string) => {
    setLocalColors(prev => ({
      ...prev,
      [pressNo]: colorClass,
    }));
  };

  const handleSave = () => {
    onSave(localColors);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Color Settings</DialogTitle>
          <DialogDescription>
            Assign a unique color to each press for better visibility on the schedule.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-6">
          <div className="space-y-4 py-4">
            {pressNos.length > 0 ? (
              pressNos.map(pressNo => (
                <div key={pressNo} className="space-y-2">
                  <Label>Press {pressNo}</Label>
                  <div className="grid grid-cols-7 gap-2">
                    {COLOR_PALETTE.map(colorClass => (
                      <button
                        key={colorClass}
                        type="button"
                        onClick={() => handleColorSelect(pressNo, colorClass)}
                        className={cn(
                          'h-8 w-8 rounded-md border-2 transition-all',
                          colorClass,
                          localColors[pressNo] === colorClass
                            ? 'ring-2 ring-offset-2 ring-ring'
                            : 'hover:opacity-80'
                        )}
                        aria-label={`Select color for Press ${pressNo}`}
                      />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                Load production conditions to see available presses.
              </p>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save Colors
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
