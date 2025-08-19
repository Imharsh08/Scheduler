

'use client';

import React from 'react';
import type { Task, Shift, ProductionCondition } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskCard } from './task-card';
import { MaintenanceTaskCard } from './maintenance-task-card';
import { ListTodo, Loader2, Wrench, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface TaskListProps {
  tasks: Task[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  isLoading: boolean;
  onScheduleClick: (task: Task, shiftId: string) => void;
  shifts: Shift[];
  isSchedulingDisabled: boolean;
  productionConditions: ProductionCondition[];
  dieColors: Record<number, string>;
  selectedPress: number | null;
  onAddMaintenanceClick: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ 
  tasks, 
  onDragStart, 
  isLoading, 
  onScheduleClick, 
  shifts, 
  isSchedulingDisabled,
  productionConditions,
  dieColors,
  selectedPress,
  onAddMaintenanceClick,
  searchQuery,
  setSearchQuery
}) => {
  const sortedTasks = React.useMemo(() => {
    const priorityOrder: Record<Task['priority'], number> = {
      'High': 1,
      'Normal': 2,
      'Low': 3,
      'None': 4,
    };

    return [...tasks].sort((a, b) => {
      // Maintenance tasks always on top
      if (a.taskType === 'maintenance' && b.taskType !== 'maintenance') return -1;
      if (a.taskType !== 'maintenance' && b.taskType === 'maintenance') return 1;

      const priorityA = priorityOrder[a.priority];
      const priorityB = priorityOrder[b.priority];
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      if (a.deliveryDate && b.deliveryDate) {
        const dateA = new Date(a.deliveryDate).getTime();
        const dateB = new Date(b.deliveryDate).getTime();
        if (dateA !== dateB) {
          return dateA - dateB;
        }
      }
      if (a.deliveryDate && !b.deliveryDate) return -1;
      if (!a.deliveryDate && b.deliveryDate) return 1;

      return new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime();
    });
  }, [tasks]);

  return (
    <Card className="shadow-lg flex-1 flex flex-col overflow-hidden">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div className='flex items-center gap-2'>
                <ListTodo className="w-6 h-6" />
                <CardTitle className="font-headline">Unscheduled Tasks</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={onAddMaintenanceClick}>
                <Wrench className="mr-2 h-4 w-4" />
                Maintenance
            </Button>
        </div>
         <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Job Card or Item..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-0">
        <div className="h-full overflow-hidden p-4 pt-0">
          <ScrollArea className="h-full pr-2">
            <div className="space-y-4">
              {isLoading && tasks.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : sortedTasks.length > 0 ? (
                sortedTasks.map((task, index) => (
                  task.taskType === 'maintenance' ? (
                    <MaintenanceTaskCard 
                      key={`${task.jobCardNumber}-${index}`}
                      task={task}
                      onDragStart={onDragStart}
                      isSchedulingDisabled={isSchedulingDisabled}
                    />
                  ) : (
                    <TaskCard 
                      key={`${task.jobCardNumber}-${index}`}
                      task={task} 
                      onDragStart={onDragStart}
                      onScheduleClick={onScheduleClick}
                      shifts={shifts}
                      isSchedulingDisabled={isSchedulingDisabled}
                      productionConditions={productionConditions}
                      dieColors={dieColors}
                      selectedPress={selectedPress}
                    />
                  )
                ))
              ) : (
                <p className="text-muted-foreground text-center py-4">No tasks loaded or matching filter.</p>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
