import React from 'react';
import type { Task } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskCard } from './task-card';
import { ListTodo } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onDragStart }) => {
  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center gap-2">
        <ListTodo className="w-6 h-6" />
        <CardTitle className="font-headline">Unscheduled Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <TaskCard key={task.jobCardNumber} task={task} onDragStart={onDragStart} />
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">All tasks have been scheduled!</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
