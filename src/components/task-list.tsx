
import React, { useState } from 'react';
import type { Task } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskCard } from './task-card';
import { ListTodo, Download, Loader2, KeyRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TaskListProps {
  tasks: Task[];
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
  onLoadTasks: (url: string) => void;
  isLoading: boolean;
  saveUrl: string;
  onSaveUrlChange: (url: string) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ tasks, onDragStart, onLoadTasks, isLoading, saveUrl, onSaveUrlChange }) => {
  const [url, setUrl] = useState('');

  const sortedTasks = React.useMemo(() => {
    const priorityOrder: Record<Task['priority'], number> = {
      'High': 1,
      'Normal': 2,
      'Low': 3,
      'None': 4,
    };

    return [...tasks].sort((a, b) => {
      // 1. Sort by priority
      const priorityA = priorityOrder[a.priority];
      const priorityB = priorityOrder[b.priority];
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // 2. Sort by delivery date (earliest first)
      if (a.deliveryDate && b.deliveryDate) {
        const dateA = new Date(a.deliveryDate).getTime();
        const dateB = new Date(b.deliveryDate).getTime();
        if (dateA !== dateB) {
          return dateA - dateB;
        }
      }
      // If one has a delivery date and the other doesn't, the one with the date comes first
      if (a.deliveryDate && !b.deliveryDate) return -1;
      if (!a.deliveryDate && b.deliveryDate) return 1;

      // 3. Sort by creation date (oldest first)
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
            placeholder="FMS 2 Sheet URL (Load Tasks)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
          />
          <Button onClick={() => onLoadTasks(url)} disabled={isLoading || !url}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Load
          </Button>
        </div>
        <div className="flex w-full items-center space-x-2 mb-4">
            <Input
              type="url"
              placeholder="Molding Sheet URL (Save Schedule)"
              value={saveUrl}
              onChange={(e) => onSaveUrlChange(e.target.value)}
            />
             <div className="p-2 rounded-md border bg-secondary">
               <KeyRound className="w-4 h-4 text-muted-foreground" />
             </div>
        </div>
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
