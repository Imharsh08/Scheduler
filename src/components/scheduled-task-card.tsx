
import React from 'react';
import type { ScheduledTask } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDieColorClass } from '@/lib/color-utils';
import { format } from 'date-fns';

interface ScheduledTaskCardProps {
  task: ScheduledTask;
  dieColors: Record<number, string>;
}

export const ScheduledTaskCard: React.FC<ScheduledTaskCardProps> = ({ task, dieColors }) => {
  const colorClass = getDieColorClass(task.dieNo, dieColors);

  const formatTime = (dateString: string) => {
    try {
      return format(new Date(dateString), 'HH:mm');
    } catch {
      return 'Invalid time';
    }
  }

  return (
    <Card className={cn("shadow-sm border-2", colorClass)}>
      <CardContent className="p-3">
        <div className="flex justify-between items-start">
            <div>
                <p className="font-bold text-sm text-gray-800">{task.jobCardNumber}</p>
                <p className="text-xs text-muted-foreground">{task.itemCode}</p>
            </div>
            <Badge variant="outline" className="text-xs">{task.material}</Badge>
        </div>
        <div className="flex justify-between items-center mt-2 text-xs text-gray-700">
            <div className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-600" />
                <span>Qty: {task.scheduledQuantity}</span>
            </div>
            <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatTime(task.startTime)} - {formatTime(task.endTime)} ({task.timeTaken} min)</span>
            </div>
        </div>
        <div className="text-xs mt-1 text-muted-foreground">
            Press: {task.pressNo} / Die: {task.dieNo}
        </div>
      </CardContent>
    </Card>
  );
};
