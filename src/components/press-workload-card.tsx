import React from 'react';
import type { PressWorkload } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cog } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface PressWorkloadCardProps {
  workload: PressWorkload;
  onClick: (pressNo: number) => void;
  isSelected: boolean;
}

export const PressWorkloadCard: React.FC<PressWorkloadCardProps> = ({ workload, onClick, isSelected }) => {
  const { pressNo, pendingQuantity, scheduledQuantity } = workload;
  const totalQuantity = pendingQuantity + scheduledQuantity;
  const progress = totalQuantity > 0 ? (scheduledQuantity / totalQuantity) * 100 : 0;

  return (
    <Card
      onClick={() => onClick(pressNo)}
      className={cn(
          'cursor-pointer transition-all duration-200 hover:shadow-lg',
          isSelected ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50'
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between p-3 pb-2">
        <div className="flex items-center gap-2">
          <Cog className="w-5 h-5 text-muted-foreground" />
          <CardTitle className="text-base font-bold">Press {pressNo}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <div className="space-y-1 text-xs text-muted-foreground mb-2">
          <p>Pending: <span className="font-semibold text-foreground">{pendingQuantity.toLocaleString()}</span></p>
          <p>In Process: <span className="font-semibold text-foreground">{scheduledQuantity.toLocaleString()}</span></p>
        </div>
        <Progress value={progress} className="h-2" aria-label={`${progress.toFixed(0)}% of work scheduled`} />
      </CardContent>
    </Card>
  );
};
