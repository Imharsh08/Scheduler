
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
import type { Schedule, Shift, Task } from '@/types';
import { format } from 'date-fns';

interface AllScheduledTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleByPress: Record<number, Schedule>;
  shiftsByPress: Record<number, Shift[]>;
}

export const AllScheduledTasksDialog: React.FC<AllScheduledTasksDialogProps> = ({
  open,
  onOpenChange,
  scheduleByPress,
  shiftsByPress,
}) => {
  const allTasks = React.useMemo(() => {
    const flattenedTasks = Object.entries(scheduleByPress)
      .flatMap(([pressNo, pressSchedule]) =>
        Object.values(pressSchedule).flatMap(shiftTasks => shiftTasks)
      );

    return flattenedTasks.sort((a, b) => {
      if (a.pressNo !== b.pressNo) return a.pressNo - b.pressNo;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }, [scheduleByPress]);

  const getShiftInfo = (shiftId: string, pressNo: number) => {
    const shiftsForPress = shiftsByPress[pressNo] || [];
    const shift = shiftsForPress.find(s => s.id === shiftId);
    return shift ? `${shift.day} ${shift.type}` : 'Unknown';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="font-headline">All Scheduled Tasks</DialogTitle>
          <DialogDescription>
            A master list of all scheduled jobs across all presses for the week.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-6">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="text-center">Press</TableHead>
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
                    <TableCell>{getShiftInfo(task.shiftId, task.pressNo)}</TableCell>
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
                  <TableCell colSpan={9} className="h-24 text-center">
                    No tasks have been scheduled yet.
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
