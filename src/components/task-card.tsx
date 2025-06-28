
'use client';

import React, { useState, useEffect } from 'react';
import type { Task, Shift } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { GripVertical, Package, Clock, CalendarDays, CalendarPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuPortal, 
    DropdownMenuSub, 
    DropdownMenuSubContent, 
    DropdownMenuSubTrigger, 
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onScheduleClick: (task: Task, shiftId: string) => void;
  shifts: Shift[];
  isSchedulingDisabled: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onDragStart, onScheduleClick, shifts, isSchedulingDisabled }) => {
  const [waitingTime, setWaitingTime] = useState('');

  useEffect(() => {
    if (task.creationDate) {
      setWaitingTime(formatDistanceToNow(new Date(task.creationDate), { addSuffix: true }));
    }
  }, [task.creationDate]);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
        <CardHeader className="flex flex-row items-start justify-between p-3 pb-2">
            <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-primary" />
                <div>
                    <CardTitle className="text-base font-bold">{task.jobCardNumber}</CardTitle>
                    <CardDescription className="text-xs">{task.itemCode}</CardDescription>
                </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{task.material}</Badge>
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
              <GripVertical className="text-muted-foreground w-5 h-5" />
            </div>
        </CardHeader>
        <CardContent className="p-3 pt-0 pb-1">
          <div>
            <p className="text-sm font-medium">Quantity: <span className="font-bold">{task.remainingQuantity}</span></p>
          </div>
          <div className="flex flex-col gap-1 text-xs text-muted-foreground mt-1">
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
        <CardFooter className="p-3 pt-0 flex justify-end">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={isSchedulingDisabled}>
                        <CalendarPlus className="mr-2 h-4 w-4" />
                        Schedule
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuContent align="end">
                        {daysOfWeek.map(day => (
                            <DropdownMenuSub key={day}>
                                <DropdownMenuSubTrigger>{day}</DropdownMenuSubTrigger>
                                <DropdownMenuPortal>
                                    <DropdownMenuSubContent>
                                        {shifts.filter(s => s.day === day).map(shift => (
                                            <DropdownMenuItem 
                                                key={shift.id} 
                                                onSelect={() => onScheduleClick(task, shift.id)} 
                                                disabled={shift.remainingCapacity <= 0}
                                                className="flex justify-between gap-4"
                                            >
                                                <span>{shift.type}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {Math.floor(shift.remainingCapacity / 60)}h {shift.remainingCapacity % 60}m left
                                                </span>
                                            </DropdownMenuItem>
                                        ))}
                                        {shifts.filter(s => s.day === day).length === 0 && <DropdownMenuItem disabled>No shifts available</DropdownMenuItem>}
                                    </DropdownMenuSubContent>
                                </DropdownMenuPortal>
                            </DropdownMenuSub>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenuPortal>
            </DropdownMenu>
        </CardFooter>
      </Card>
    </div>
  );
};
