

import React, { useMemo, useState } from 'react';
import type { Task, Schedule, ProductionCondition, PressWorkload } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layers, X, ChevronDown } from 'lucide-react';
import { PressWorkloadCard } from './press-workload-card';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from '@/lib/utils';
import { DieWorkloadView } from './die-workload-view';

interface PressWorkloadPanelProps {
  tasks: Task[];
  scheduleByPress: Record<number, Schedule>;
  productionConditions: ProductionCondition[];
  onPressSelect: (pressNo: number | null) => void;
  selectedPress: number | null;
  onGenerateIdealSchedule: (pressNo: number) => void;
  generatingPressNo: number | null;
  onDieSelect: (dieNo: number | null) => void;
  selectedDie: number | null;
}

export const PressWorkloadPanel: React.FC<PressWorkloadPanelProps> = ({ 
    tasks, 
    scheduleByPress, 
    productionConditions, 
    onPressSelect, 
    selectedPress, 
    onGenerateIdealSchedule, 
    generatingPressNo,
    onDieSelect,
    selectedDie
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const pressWorkloads = useMemo(() => {
    const pressNosFromConditions = productionConditions.map(pc => pc.pressNo);
    const pressNosFromSchedule = Object.keys(scheduleByPress).map(Number);
    const allPressNos = [...new Set([...pressNosFromConditions, ...pressNosFromSchedule])];
    
    const workloads: Record<number, PressWorkload> = {};

    allPressNos.forEach(pressNo => {
      workloads[pressNo] = {
        pressNo,
        pendingQuantity: 0,
        scheduledQuantity: 0,
      };
    });

    tasks.forEach(task => {
        if (task.taskType !== 'production') return;
        const produciblePresses = new Set(productionConditions
            .filter(pc => pc.itemCode === task.itemCode)
            .map(pc => pc.pressNo)
        );

        produciblePresses.forEach(pressNo => {
            if (workloads[pressNo]) {
                workloads[pressNo].pendingQuantity += task.remainingQuantity;
            }
        });
    });

    Object.values(scheduleByPress).flat().forEach(pressSchedule => {
      Object.values(pressSchedule).flat().forEach(scheduledTask => {
        if (workloads[scheduledTask.pressNo] && scheduledTask.type === 'production') {
          workloads[scheduledTask.pressNo].scheduledQuantity += scheduledTask.scheduledQuantity;
        }
      });
    });
    
    return Object.values(workloads)
      .filter(w => w.pendingQuantity > 0 || w.scheduledQuantity > 0)
      .sort((a, b) => a.pressNo - b.pressNo);

  }, [tasks, scheduleByPress, productionConditions]);


  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-lg relative pt-6">
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-4 py-1 rounded-full border shadow-sm flex items-center gap-2 z-10">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold font-headline whitespace-nowrap">
            {selectedPress === null ? 'Press Workload' : `Die Workload for Press ${selectedPress}`}
          </h2>
        </div>

        <div className="absolute top-2 right-2 flex items-center gap-1">
          {selectedPress !== null && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPressSelect(null)}
              className="h-8"
            >
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  isOpen && 'rotate-180'
                )}
              />
              <span className="sr-only">Toggle Workload Panel</span>
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
            {selectedPress === null ? (
                <CardContent className="p-4 pt-2">
                    {pressWorkloads.length > 0 ? (
                        <ScrollArea className="w-full whitespace-nowrap">
                            <div className="flex w-max space-x-4 pb-4">
                            {pressWorkloads.map((workload) => (
                                <PressWorkloadCard
                                key={workload.pressNo}
                                workload={workload}
                                onClick={() => onPressSelect(workload.pressNo)}
                                isSelected={selectedPress === workload.pressNo}
                                onGenerateIdealSchedule={onGenerateIdealSchedule}
                                isGenerating={generatingPressNo === workload.pressNo}
                                />
                            ))}
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    ) : (
                        <p className="text-muted-foreground text-center py-4">
                            No presses with pending or scheduled work.
                        </p>
                    )}
                </CardContent>
            ) : (
                <DieWorkloadView
                    selectedPress={selectedPress}
                    tasks={tasks}
                    scheduleByPress={scheduleByPress}
                    productionConditions={productionConditions}
                    onDieSelect={onDieSelect}
                    selectedDie={selectedDie}
                />
            )}
        </CollapsibleContent>

        {!isOpen && (
          <CardContent className="pt-2 pb-4">
            {pressWorkloads.length > 0 ? (
              <div className="flex flex-wrap gap-2 items-center">
                {pressWorkloads.map((workload) => (
                  <Button
                    key={workload.pressNo}
                    variant={
                      selectedPress === workload.pressNo
                        ? 'default'
                        : 'secondary'
                    }
                    size="sm"
                    onClick={() => onPressSelect(workload.pressNo)}
                    className="rounded-full px-4 h-8"
                  >
                    Press {workload.pressNo}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-2 text-sm">
                No active presses.
              </p>
            )}
          </CardContent>
        )}
      </Card>
    </Collapsible>
  );
};
