import React from 'react';
import type { Task } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GripVertical, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onDragStart }) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.jobCardNumber)}
      className="cursor-grab active:cursor-grabbing"
    >
      <Card className="hover:shadow-md transition-shadow duration-200 bg-card hover:border-primary">
        <CardHeader className="flex flex-row items-start justify-between p-4">
            <div className="flex items-center gap-4">
                <Package className="w-6 h-6 text-primary" />
                <div>
                    <CardTitle className="text-base font-bold">{task.jobCardNumber}</CardTitle>
                    <CardDescription>{task.itemCode}</CardDescription>
                </div>
            </div>
            <GripVertical className="text-muted-foreground" />
        </CardHeader>
        <CardContent className="p-4 pt-0 flex justify-between items-center">
          <div>
            <p className="text-sm font-medium">Quantity: <span className="font-bold text-lg">{task.remainingQuantity}</span></p>
          </div>
          <Badge variant="secondary">{task.material}</Badge>
        </CardContent>
      </Card>
    </div>
  );
};
