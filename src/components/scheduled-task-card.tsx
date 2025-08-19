

'use client';

import React from 'react';
import type { ScheduledTask } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Pencil, X, Check, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDieColorClass } from '@/lib/color-utils';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ScheduledTaskCardProps {
  task: ScheduledTask;
  dieColors: Record<number, string>;
  onRemoveRequest: (task: ScheduledTask) => void;
  onEditRequest: (task: ScheduledTask) => void;
  onTaskDragStart: (e: React.DragEvent, task: ScheduledTask) => void;
}

export const ScheduledTaskCard: React.FC<ScheduledTaskCardProps> = ({ task, dieColors, onRemoveRequest, onEditRequest, onTaskDragStart }) => {
  const isMaintenanceTask = task.type === 'maintenance';
  const colorClass = isMaintenanceTask ? 'bg-amber-200 border-amber-400' : getDieColorClass(task.dieNo, dieColors);

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'hh:mm a');
    } catch {
      return 'Invalid time';
    }
  }

  return (
    <Card 
      className={cn("shadow-sm border-2 group relative cursor-grab active:cursor-grabbing", colorClass)}
      draggable
      onDragStart={(e) => onTaskDragStart(e, task)}
    >
       <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {!isMaintenanceTask && (
            <Button variant="ghost" size="icon" className="h-6 w-6 bg-background/70 hover:bg-background" onClick={() => onEditRequest(task)}>
                <Pencil className="h-3 w-3" />
                <span className="sr-only">Edit Task</span>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive bg-background/70 hover:bg-destructive/10" onClick={() => onRemoveRequest(task)}>
              <X className="h-4 w-4" />
              <span className="sr-only">Remove Task</span>
          </Button>
      </div>
      <CardContent className="p-3">
        <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-sm text-gray-800">{task.jobCardNumber}</p>
              {task.isSaved && (
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger>
                      <Check className="h-4 w-4 text-green-600" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Saved to Sheet</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {task.material && <Badge variant="outline" className="text-xs">{task.material}</Badge>}
            {!isMaintenanceTask && (
                <div className="flex items-center gap-1 text-xs">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    <span>Qty: {Math.round(task.scheduledQuantity)}</span>
                </div>
            )}
            {isMaintenanceTask && (
                 <div className="flex items-center gap-1 text-xs">
                    <Wrench className="w-3 h-3 text-amber-600" />
                    <span>Maintenance</span>
                </div>
            )}
        </div>
        <p className="text-xs text-muted-foreground -mt-1">{task.itemCode}</p>
        
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-700">
            <Clock className="w-3 h-3" />
            <span>{formatTime(task.startTime)} - {formatTime(task.endTime)} ({task.timeTaken} min)</span>
        </div>

        <div className="text-xs mt-1 text-muted-foreground">
            Press: {task.pressNo} / Die: {task.dieNo}
        </div>
      </CardContent>
    </Card>
  );
};
