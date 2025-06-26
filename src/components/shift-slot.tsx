import React, { useState } from 'react';
import type { Shift, ScheduledTask } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScheduledTaskCard } from './scheduled-task-card';
import { Sun, Moon, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ShiftSlotProps {
  shift: Shift;
  scheduledTasks: ScheduledTask[];
  onDrop: (e: React.DragEvent<HTMLDivElement>, shiftId: string) => void;
}

export const ShiftSlot: React.FC<ShiftSlotProps> = ({ shift, scheduledTasks, onDrop }) => {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    setIsOver(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    onDrop(e, shift.id);
    setIsOver(false);
  };
  
  const capacityUsed = ((shift.capacity - shift.remainingCapacity) / shift.capacity) * 100;

  return (
    <Card 
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 flex flex-col transition-all duration-200 ${isOver ? 'bg-accent shadow-2xl' : 'bg-card'}`}
    >
      <CardHeader className="p-4">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                {shift.type === 'Day' ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-blue-300" />}
                <CardTitle className="text-lg">{shift.type} Shift</CardTitle>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{Math.round(shift.remainingCapacity / 60)}h left</span>
            </div>
        </div>
        <Progress value={capacityUsed} className="w-full h-2 mt-2" />
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2 flex-1 bg-secondary/30 rounded-b-lg">
        {scheduledTasks.length > 0 ? (
            <div className="space-y-2 pt-2">
                {scheduledTasks.map(task => (
                  <ScheduledTaskCard key={task.id} task={task} />
                ))}
            </div>
         ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground border-2 border-dashed border-border rounded-lg">
                <p>Drop a task here</p>
            </div>
         )}
      </CardContent>
    </Card>
  );
};
