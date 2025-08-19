

'use client';

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PackageSearch, Circle, CheckCircle2, Cog, AlertTriangle } from 'lucide-react';
import type { ScheduledTask, ModuleSettings, TrackingStep, TrackingStatus } from '@/types';
import { cn } from '@/lib/utils';
import { format, isValid } from 'date-fns';

interface TrackingTableProps {
  tasks: ScheduledTask[];
  settings: ModuleSettings;
  onUpdateClick: (task: ScheduledTask, step: string) => void;
}

const statusConfig: Record<TrackingStatus, { icon: React.ElementType, color: string, savedColor?: string }> = {
    'Pending': { icon: Circle, color: 'text-muted-foreground' },
    'In Progress': { icon: Cog, color: 'text-blue-500 animate-spin' },
    'Completed': { icon: CheckCircle2, color: 'text-green-500', savedColor: 'bg-green-100 text-green-800 border-green-200' },
    'On Hold': { icon: AlertTriangle, color: 'text-yellow-500' },
    'Skipped': { icon: Circle, color: 'text-gray-400' }, // Example for skipped
};

const StatusBadge: React.FC<{ step: TrackingStep }> = ({ step }) => {
    const config = statusConfig[step.status] || statusConfig['Pending'];
    const Icon = config.icon;
    const isSavedAndCompleted = step.isSaved && step.status === 'Completed';

    return (
        <Badge 
            variant={isSavedAndCompleted ? "default" : "outline"} 
            className={cn(
                "cursor-pointer hover:bg-accent hover:border-primary transition-colors",
                isSavedAndCompleted && config.savedColor
            )}
        >
            <Icon className={cn('mr-2 h-3 w-3', config.color)} />
            {step.status}
        </Badge>
    );
};

export const TrackingTable: React.FC<TrackingTableProps> = ({ tasks, settings, onUpdateClick }) => {
  const enabledModules = React.useMemo(() => {
    return (Object.keys(settings) as Array<keyof ModuleSettings>).filter(key => settings[key]?.enabled);
  }, [settings]);
  
  const groupedTasks = React.useMemo(() => {
    const groups: Record<string, ScheduledTask[]> = {};
    
    // Sort tasks by start time before grouping
    const sortedTasks = [...tasks].sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    
    sortedTasks.forEach(task => {
        try {
            if (!isValid(new Date(task.startTime))) return;
            const dateKey = format(new Date(task.startTime), 'yyyy-MM-dd');
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(task);
        } catch (e) {
            // Ignore tasks with invalid start times
        }
    });

    const sortedDates = Object.keys(groups).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    return sortedDates.map(date => ({
        date: format(new Date(date + 'T12:00:00Z'), 'EEEE, dd MMM yyyy'),
        tasks: groups[date],
    }));
  }, [tasks]);

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-center text-muted-foreground bg-secondary/30 rounded-lg p-8">
        <PackageSearch className="w-16 h-16 mb-4 text-gray-400" />
        <h3 className="text-xl font-semibold mb-2">No Scheduled Tasks Found</h3>
        <p className="max-w-md">Once tasks are scheduled, they will appear here for production tracking.</p>
      </div>
    );
  }
  
  const renderCellContent = (task: ScheduledTask, moduleName: keyof ModuleSettings) => {
    const step = task.trackingSteps.find(s => s.stepName === moduleName);
    if (!step) return <span className="text-muted-foreground">-</span>;
    
    const plannedEndDate = step.plannedEndDate ? new Date(step.plannedEndDate) : null;
    const isDelayed = plannedEndDate && isValid(plannedEndDate) && new Date() > plannedEndDate && step.status !== 'Completed';

    return (
      <div className="flex flex-col items-center justify-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onUpdateClick(task, moduleName)}>
              <StatusBadge step={step} />
          </Button>
          {plannedEndDate && isValid(plannedEndDate) ? (
             <span className={cn("text-xs text-muted-foreground", isDelayed && "text-destructive font-semibold")}>
                {format(plannedEndDate, 'dd-MMM')}
            </span>
          ) : null}
      </div>
    );
  }

  return (
    <ScrollArea className="h-full border rounded-lg">
      <Table>
        <TableHeader className="sticky top-0 bg-background z-10">
          <TableRow>
            <TableHead className="w-[150px]">Job Card</TableHead>
            <TableHead>Item</TableHead>
            <TableHead className="text-center">Qty</TableHead>
            <TableHead className="text-center">End Time</TableHead>
            {enabledModules.map(moduleName => (
              <TableHead key={moduleName} className="text-center">
                <p>{moduleName}</p>
                <p className="text-xs font-normal text-muted-foreground">(Planned End)</p>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedTasks.map(group => (
            <React.Fragment key={group.date}>
              <TableRow>
                <TableCell colSpan={enabledModules.length + 4} className="bg-muted font-bold text-muted-foreground">
                  {group.date}
                </TableCell>
              </TableRow>
              {group.tasks.map(task => {
                const endDate = new Date(task.endTime);
                return (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium">{task.jobCardNumber}</TableCell>
                    <TableCell>{task.itemCode}</TableCell>
                    <TableCell className="text-center">{Math.round(task.scheduledQuantity)}</TableCell>
                    <TableCell className="text-center">{isValid(endDate) ? format(endDate, 'hh:mm a') : '-'}</TableCell>
                    {enabledModules.map(moduleName => (
                        <TableCell key={moduleName} className="text-center">
                            {renderCellContent(task, moduleName)}
                        </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
};
