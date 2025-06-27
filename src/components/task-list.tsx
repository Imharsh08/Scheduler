
import React from 'react';
import type { Task } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskCard } from './task-card';
import { ListTodo, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TaskListProps {
  tasks: Task[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onLoadTasks: () => void;
  isLoading: boolean;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onDragStart, onLoadTasks, isLoading }) => {
  const sortedTasks = React.useMemo(() => {
    const priorityOrder: Record<Task['priority'], number> = {
      'High': 1,
      'Normal': 2,
      'Low': 3,
      'None': 4,
    };

    return [...tasks].sort((a, b) => {
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
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div className='flex items-center gap-2'>
                <ListTodo className="w-6 h-6" />
                <CardTitle className="font-headline">Unscheduled Tasks</CardTitle>
            </div>
             <Button onClick={onLoadTasks} disabled={isLoading} size="sm">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Load
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 max-h-[calc(100vh-550px)] overflow-y-auto pr-2">
          {isLoading && tasks.length === 0 ? (
             <div className="flex justify-center items-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : sortedTasks.length > 0 ? (
            sortedTasks.map((task) => (
              <TaskCard key={task.jobCardNumber} task={task} onDragStart={onDragStart} />
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">No tasks loaded or matching filter.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
