
'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Schedule, Shift, ScheduledTask } from '@/types';
import { format, isWithinInterval } from 'date-fns';

interface AllScheduledTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleByPress: Record<number, Schedule>;
  shiftsByPress: Record<number, Shift[]>;
  scheduleHorizon: 'weekly' | 'monthly';
  weeksInMonth: { start: Date; end: Date }[];
  currentWeek: number;
}

export const AllScheduledTasksDialog: React.FC<AllScheduledTasksDialogProps> = ({
  open,
  onOpenChange,
  scheduleByPress,
  scheduleHorizon,
  weeksInMonth,
  currentWeek,
}) => {
  const { allTasks, dialogDescription } = React.useMemo(() => {
    let flattenedTasks = Object.values(scheduleByPress).flatMap(pressSchedule => 
      Object.values(pressSchedule).flat()
    );

    let description = "A master list of all scheduled jobs for the current period.";
    
    if (scheduleHorizon === 'monthly' && weeksInMonth.length > 0 && currentWeek < weeksInMonth.length) {
        const interval = weeksInMonth[currentWeek];
        flattenedTasks = flattenedTasks.filter(task => {
            const taskDate = new Date(task.startTime);
            return isWithinInterval(taskDate, interval);
        });
        description = `Showing all tasks for the week of ${format(interval.start, 'MMM d')} to ${format(interval.end, 'MMM d')}.`;
    }

    flattenedTasks.sort((a, b) => {
      if (a.pressNo !== b.pressNo) return a.pressNo - b.pressNo;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    return { allTasks: flattenedTasks, dialogDescription: description };
  }, [scheduleByPress, scheduleHorizon, weeksInMonth, currentWeek]);

  const getShiftInfo = (shiftId: string): Shift['type'] | 'Unknown' => {
      const parts = shiftId.split('-');
      const type = parts[parts.length -1];
      if (type === 'day' || type === 'night') {
          return type.charAt(0).toUpperCase() + type.slice(1) as Shift['type'];
      }
      return 'Unknown';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="font-headline">All Scheduled Tasks</DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-6">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="text-center">Press</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Job Card</TableHead>
                <TableHead>Item Code</TableHead>
                <TableHead className="text-center">Die</TableHead>
                <TableHead className="text-center">Priority</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allTasks.length > 0 ? (
                allTasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="text-center font-medium">{task.pressNo}</TableCell>
                    <TableCell>{format(new Date(task.startTime), 'dd MMM')}</TableCell>
                    <TableCell>{getShiftInfo(task.shiftId)}</TableCell>
                    <TableCell>{task.jobCardNumber}</TableCell>
                    <TableCell>{task.itemCode}</TableCell>
                    <TableCell className="text-center">{task.dieNo}</TableCell>
                    <TableCell className="text-center">
                        <Badge 
                            variant={
                                task.priority === 'High' ? 'destructive' : 
                                task.priority === 'Normal' ? 'default' : 'secondary'
                            }
                        >
                            {task.priority}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-center">{task.scheduledQuantity}</TableCell>
                    <TableCell>{format(new Date(task.startTime), 'HH:mm')}</TableCell>
                    <TableCell>{format(new Date(task.endTime), 'HH:mm')}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="h-24 text-center">
                    No tasks have been scheduled for this period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

    