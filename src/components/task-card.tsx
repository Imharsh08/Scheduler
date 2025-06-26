import React, { useState, useEffect } from 'react';
import type { Task } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical, Package, Clock, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onDragStart }) => {
  const [waitingTime, setWaitingTime] = useState('');

  useEffect(() => {
    if (task.creationDate) {
      setWaitingTime(formatDistanceToNow(new Date(task.creationDate), { addSuffix: true }));
    }
  }, [task.creationDate]);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.jobCardNumber)}
      className="cursor-grab active:cursor-grabbing"
    >
      <Card className={cn(
          "hover:shadow-md transition-shadow duration-200 bg-card hover:border-primary",
          task.isPriority && "border-destructive hover:border-destructive/80"
      )}>
        <CardHeader className="flex flex-row items-start justify-between p-4 pb-2">
            <div className="flex items-center gap-4">
                <Package className="w-6 h-6 text-primary" />
                <div>
                    <CardTitle className="text-base font-bold">{task.jobCardNumber}</CardTitle>
                    <CardDescription>{task.itemCode}</CardDescription>
                </div>
            </div>
            <div className="flex items-center gap-2">
              {task.isPriority && <AlertTriangle className="w-5 h-5 text-destructive" />}
              <GripVertical className="text-muted-foreground" />
            </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">Quantity: <span className="font-bold text-lg">{task.remainingQuantity}</span></p>
            </div>
            <Badge variant="secondary">{task.material}</Badge>
          </div>
          {waitingTime && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              <Clock className="w-3 h-3" />
              <span>Waiting {waitingTime}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
