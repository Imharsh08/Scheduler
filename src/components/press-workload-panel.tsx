import React, { useMemo } from 'react';
import type { Task, Schedule, ProductionCondition, PressWorkload } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layers, X } from 'lucide-react';
import { PressWorkloadCard } from './press-workload-card';

interface PressWorkloadPanelProps {
  tasks: Task[];
  schedule: Schedule;
  productionConditions: ProductionCondition[];
  onPressSelect: (pressNo: number | null) => void;
  selectedPress: number | null;
}

export const PressWorkloadPanel: React.FC<PressWorkloadPanelProps> = ({ tasks, schedule, productionConditions, onPressSelect, selectedPress }) => {

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

    Object.values(schedule).flat().forEach(scheduledTask => {
      if (workloads[scheduledTask.pressNo]) {
        workloads[scheduledTask.pressNo].scheduledQuantity += scheduledTask.scheduledQuantity;
      }
    });

    return Object.values(workloads).sort((a, b) => a.pressNo - b.pressNo);
  }, [tasks, schedule, productionConditions]);


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div className='flex items-center gap-2'>
                <Layers className="w-6 h-6" />
                <CardTitle className="font-headline">Press Workload</CardTitle>
            </div>
            {selectedPress !== null && (
                <Button variant="ghost" size="sm" onClick={() => onPressSelect(null)}>
                    <X className="mr-2 h-4 w-4" />
                    Clear Filter
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        {pressWorkloads.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[250px] overflow-y-auto pr-2">
            {pressWorkloads.map(workload => (
              <PressWorkloadCard
                key={workload.pressNo}
                workload={workload}
                onClick={() => onPressSelect(workload.pressNo)}
                isSelected={selectedPress === workload.pressNo}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">Load production conditions to see press workloads.</p>
        )}
      </CardContent>
    </Card>
  );
};
