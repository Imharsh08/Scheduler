
'use client';

import React from 'react';
import type { Task } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MaintenanceTaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  isSchedulingDisabled: boolean;
}

export const MaintenanceTaskCard: React.FC<MaintenanceTaskCardProps> = ({ 
  task, 
  onDragStart, 
  isSchedulingDisabled,
}) => {
  return (
    <div
      draggable={!isSchedulingDisabled}
      onDragStart={(e) => onDragStart(e, task.jobCardNumber)}
      className={cn("cursor-grab active:cursor-grabbing", isSchedulingDisabled && "cursor-not-allowed")}
    >
      <Card className="border-amber-500 hover:border-amber-400 hover:shadow-md transition-all">
        <CardHeader className="flex flex-row items-start justify-between p-3 pb-2">
            <div className="flex items-center gap-3">
                <Wrench className="w-5 h-5 text-amber-500" />
                <div>
                    <CardTitle className="text-base font-bold">{task.itemCode}</CardTitle>
                    <CardDescription className="text-xs">
                        Die: {task.dieNo}
                    </CardDescription>
                </div>
            </div>
            <GripVertical className="text-muted-foreground w-5 h-5" />
        </CardHeader>
        <CardContent className="p-3 pt-1">
            <p className="text-sm font-medium">Duration: <span className="font-bold">{task.timeTaken} min</span></p>
        </CardContent>
      </Card>
    </div>
  );
};
