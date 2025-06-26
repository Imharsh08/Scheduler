import React, { useState } from 'react';
import type { Task } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskCard } from './task-card';
import { ListTodo, Download, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TaskListProps {
  tasks: Task[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onLoadTasks: (url: string) => void;
  isLoading: boolean;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onDragStart, onLoadTasks, isLoading }) => {
  const [url, setUrl] = useState('');

  const sortedTasks = React.useMemo(() => {
    return [...tasks].sort((a, b) => {
      const priorityA = a.isPriority ? 1 : 0;
      const priorityB = b.isPriority ? 1 : 0;
      if (priorityA !== priorityB) {
        return priorityB - priorityA;
      }
      // If priorities are the same, sort by creation date (oldest first)
      return new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime();
    });
  }, [tasks]);

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center gap-2">
        <ListTodo className="w-6 h-6" />
        <CardTitle className="font-headline">Unscheduled Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex w-full items-center space-x-2 mb-4">
          <Input
            type="url"
            placeholder="FMS 2 Sheet Web App URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
          />
          <Button onClick={() => onLoadTasks(url)} disabled={isLoading || !url}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Load
          </Button>
        </div>
        <div className="space-y-4 max-h-[calc(100vh-450px)] overflow-y-auto pr-2">
          {isLoading && tasks.length === 0 ? (
             <div className="flex justify-center items-center py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : sortedTasks.length > 0 ? (
            sortedTasks.map((task) => (
              <TaskCard key={task.jobCardNumber} task={task} onDragStart={onDragStart} />
            ))
          ) : (
            <p className="text-muted-foreground text-center py-4">No tasks loaded. Enter URL and click Load.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
