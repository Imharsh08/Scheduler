
import React, { useState, useEffect } from 'react';
import type { Task } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical, Package, Clock, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';

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
          task.priority === 'High' && "border-destructive hover:border-destructive/80"
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
              {task.priority !== 'None' && (
                <Badge 
                    variant={
                        task.priority === 'High' ? 'destructive' : 
                        task.priority === 'Normal' ? 'default' : 'secondary'
                    }
                >
                    {task.priority}
                </Badge>
              )}
              <GripVertical className="text-muted-foreground" />
            </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex justify-between items-center mb-2">
            <div>
              <p className="text-sm font-medium">Quantity: <span className="font-bold text-lg">{task.remainingQuantity}</span></p>
            </div>
            <Badge variant="secondary">{task.material}</Badge>
          </div>
          <div className="flex flex-col gap-2 text-xs text-muted-foreground mt-2">
            {task.deliveryDate && (
                <div className="flex items-center gap-2">
                    <CalendarDays className="w-3 h-3" />
                    <span>Deliver by: {format(new Date(task.deliveryDate), 'dd MMM yyyy')}</span>
                </div>
            )}
            {waitingTime && (
                <div className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                <span>Waiting {waitingTime}</span>
                </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
