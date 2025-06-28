
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
import { COLOR_PALETTE } from '@/lib/color-utils';

interface ColorSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productionConditions: ProductionCondition[];
  dieColors: Record<number, string>;
  onSave: (newColors: Record<number, string>) => void;
}

export const ColorSettingsDialog: React.FC<ColorSettingsDialogProps> = ({
  open,
  onOpenChange,
  productionConditions,
  dieColors,
  onSave,
}) => {
  const [localColors, setLocalColors] = useState<Record<number, string>>(dieColors);

  useEffect(() => {
    // When the dialog opens or the source colors change, update the local state.
    setLocalColors(dieColors);
  }, [dieColors, open]);

  const dieNos = React.useMemo(() => {
    const dies = productionConditions.map(pc => pc.dieNo);
    return [...new Set(dies)].sort((a, b) => a - b);
  }, [productionConditions]);

  const handleColorSelect = (dieNo: number, colorClass: string) => {
    setLocalColors(prev => ({
      ...prev,
      [dieNo]: colorClass,
    }));
  };

  const handleSave = () => {
    onSave(localColors);
    onOpenChange(false);
  };
  
  const usedColors = React.useMemo(() => {
      return new Set(Object.values(localColors));
  }, [localColors]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Die Color Settings</DialogTitle>
          <DialogDescription>
            Assign a unique color to each die for better visibility on the schedule.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] pr-6">
          <div className="space-y-4 py-4">
            {dieNos.length > 0 ? (
              dieNos.map(dieNo => (
                <div key={dieNo} className="space-y-2">
                  <Label>Die {dieNo}</Label>
                  <div className="grid grid-cols-7 gap-2">
                    {COLOR_PALETTE.map(colorClass => {
                      const currentColorForThisDie = localColors[dieNo];
                      const isUsedByAnotherDie = usedColors.has(colorClass) && currentColorForThisDie !== colorClass;
                      
                      return (
                        <button
                          key={colorClass}
                          type="button"
                          onClick={() => handleColorSelect(dieNo, colorClass)}
                          disabled={isUsedByAnotherDie}
                          className={cn(
                            'h-8 w-8 rounded-md border-2 transition-all',
                            colorClass,
                            localColors[dieNo] === colorClass
                              ? 'ring-2 ring-offset-2 ring-ring'
                              : 'hover:opacity-80',
                            isUsedByAnotherDie && 'opacity-25 cursor-not-allowed'
                          )}
                          aria-label={`Select color for Die ${dieNo}`}
                        />
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center">
                Load production conditions to see available dies.
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
