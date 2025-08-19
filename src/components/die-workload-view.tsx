
'use client';

import React, { useMemo } from 'react';
import type { Task, Schedule, ProductionCondition, ScheduledTask } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface DieWorkload {
  dieNo: number;
  pendingQuantity: number;
  scheduledQuantity: number;
}

interface DieWorkloadCardProps {
    workload: DieWorkload;
    onClick: () => void;
    isSelected: boolean;
}

const DieWorkloadCard: React.FC<DieWorkloadCardProps> = ({ workload, onClick, isSelected }) => {
  const { dieNo, pendingQuantity, scheduledQuantity } = workload;
  const totalQuantity = pendingQuantity + scheduledQuantity;
  const progress = totalQuantity > 0 ? (scheduledQuantity / totalQuantity) * 100 : 0;

  return (
    <div 
        onClick={onClick}
        className={cn(
            "p-3 rounded-lg bg-background/50 border flex-shrink-0 w-40 cursor-pointer transition-all",
            isSelected ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50'
        )}
    >
        <h4 className="font-bold text-center">Die {dieNo}</h4>
        <div className="space-y-1 text-xs text-muted-foreground my-2">
            <p>Pending: <span className="font-semibold text-foreground">{Math.ceil(pendingQuantity).toLocaleString()}</span></p>
            <p>In Process: <span className="font-semibold text-foreground">{Math.ceil(scheduledQuantity).toLocaleString()}</span></p>
        </div>
        <Progress value={progress} className="h-2" />
    </div>
  );
};

interface DieWorkloadViewProps {
  selectedPress: number;
  tasks: Task[];
  scheduleByPress: Record<number, Schedule>;
  productionConditions: ProductionCondition[];
  onDieSelect: (dieNo: number | null) => void;
  selectedDie: number | null;
}


export const DieWorkloadView: React.FC<DieWorkloadViewProps> = ({
  selectedPress,
  tasks,
  scheduleByPress,
  productionConditions,
  onDieSelect,
  selectedDie,
}) => {

  const dieWorkloads = useMemo(() => {
    const workloads: Record<number, DieWorkload> = {};

    const possibleDies = new Set(
        productionConditions
            .filter(pc => pc.pressNo === selectedPress)
            .map(pc => pc.dieNo)
    );

    possibleDies.forEach(dieNo => {
        workloads[dieNo] = { dieNo, pendingQuantity: 0, scheduledQuantity: 0 };
    });

    tasks.forEach(task => {
        if (task.taskType !== 'production') return;

        const compatibleDies = new Set(
            productionConditions
                .filter(pc => pc.itemCode === task.itemCode && pc.pressNo === selectedPress)
                .map(pc => pc.dieNo)
        );
        
        if (compatibleDies.size > 0) {
            compatibleDies.forEach(dieNo => {
                if (workloads[dieNo]) {
                    workloads[dieNo].pendingQuantity += task.remainingQuantity / compatibleDies.size;
                }
            });
        }
    });

    const scheduledTasksForPress = scheduleByPress[selectedPress] ? Object.values(scheduleByPress[selectedPress]).flat() : [];
    scheduledTasksForPress.forEach((scheduledTask: ScheduledTask) => {
        if (scheduledTask.type !== 'production') return;
        const dieNo = scheduledTask.dieNo;
        if (workloads[dieNo]) {
            workloads[dieNo].scheduledQuantity += scheduledTask.scheduledQuantity;
        } else {
            workloads[dieNo] = { dieNo, pendingQuantity: 0, scheduledQuantity: scheduledTask.scheduledQuantity };
        }
    });

    return Object.values(workloads)
        .filter(w => w.pendingQuantity > 0 || w.scheduledQuantity > 0)
        .sort((a, b) => a.dieNo - b.dieNo);

  }, [selectedPress, tasks, scheduleByPress, productionConditions]);

  if (dieWorkloads.length === 0) {
      return (
         <CardContent className="p-4 pt-2">
            <p className="text-muted-foreground text-center py-4">
                No dies with pending or scheduled work for this press.
            </p>
         </CardContent>
      );
  }

  return (
    <CardContent className="p-4 pt-2">
        <div className="flex gap-4 overflow-x-auto pb-2">
            {dieWorkloads.map(workload => (
                <DieWorkloadCard 
                    key={workload.dieNo} 
                    workload={workload} 
                    onClick={() => onDieSelect(selectedDie === workload.dieNo ? null : workload.dieNo)}
                    isSelected={selectedDie === workload.dieNo}
                />
            ))}
        </div>
    </CardContent>
  );
};
