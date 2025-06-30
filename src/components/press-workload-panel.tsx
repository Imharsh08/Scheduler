
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

interface PressWorkloadPanelProps {
  tasks: Task[];
  scheduleByPress: Record<number, Schedule>;
  productionConditions: ProductionCondition[];
  onPressSelect: (pressNo: number | null) => void;
  selectedPress: number | null;
  onGenerateIdealSchedule: (pressNo: number) => void;
  generatingPressNo: number | null;
}

export const PressWorkloadPanel: React.FC<PressWorkloadPanelProps> = ({ tasks, scheduleByPress, productionConditions, onPressSelect, selectedPress, onGenerateIdealSchedule, generatingPressNo }) => {
  const [isOpen, setIsOpen] = useState(true);

  const pressWorkloads = useMemo(() => {
    if (productionConditions.length === 0) return [];
    
    const pressNos = [...new Set(productionConditions.map(pc => pc.pressNo))];
    const workloads: Record<number, PressWorkload> = {};

    pressNos.forEach(pressNo => {
      workloads[pressNo] = {
        pressNo,
        pendingQuantity: 0,
        scheduledQuantity: 0,
      };
    });

    const tasksWithPresses = tasks.map(task => {
        const relevantPresses = [...new Set(productionConditions
            .filter(pc => pc.itemCode === task.itemCode && pc.material === task.material)
            .map(pc => pc.pressNo))];
        return { task, relevantPresses };
    });

    tasksWithPresses.forEach(({ task, relevantPresses }) => {
        relevantPresses.forEach(pressNo => {
            if (workloads[pressNo]) {
                workloads[pressNo].pendingQuantity += task.remainingQuantity;
            }
        });
    });

    Object.values(scheduleByPress).forEach(pressSchedule => {
      Object.values(pressSchedule).flat().forEach(scheduledTask => {
        if (workloads[scheduledTask.pressNo]) {
          workloads[scheduledTask.pressNo].scheduledQuantity += scheduledTask.scheduledQuantity;
        }
      });
    });

    return Object.values(workloads).sort((a, b) => a.pressNo - b.pressNo);
  }, [tasks, scheduleByPress, productionConditions]);


  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-lg relative pt-6">
        
        {/* The cool title effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-4 py-1 rounded-full border shadow-sm flex items-center gap-2 z-10">
          <Layers className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold font-headline whitespace-nowrap">
            Press Workload
          </h2>
        </div>

        {/* Controls are always visible in the top right */}
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

        {/* This is the content that gets collapsed */}
        <CollapsibleContent>
          <CardContent className="pt-2">
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
                Load production conditions to see press workloads.
              </p>
            )}
          </CardContent>
        </CollapsibleContent>

        {/* This content shows ONLY when collapsed */}
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
                No presses available.
              </p>
            )}
          </CardContent>
        )}
      </Card>
    </Collapsible>
  );
};
