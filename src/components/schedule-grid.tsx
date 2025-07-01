
import React from 'react';
import type { Shift } from '@/types';
import { ShiftSlot } from './shift-slot';
import { PackageSearch } from 'lucide-react';
import { format } from 'date-fns';
import type { Schedule, ScheduledTask } from '@/types';

interface ScheduleGridProps {
  shifts: Shift[];
  schedule: Schedule;
  onDrop: (e: React.DragEvent<HTMLDivElement>, shiftId: string) => void;
  dieColors: Record<number, string>;
  selectedPress: number | null;
  onRemoveRequest: (task: ScheduledTask) => void;
  onEditRequest: (task: ScheduledTask) => void;
  onTaskDragStart: (e: React.DragEvent, task: ScheduledTask) => void;
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({ shifts, schedule, onDrop, dieColors, selectedPress, onRemoveRequest, onEditRequest, onTaskDragStart }) => {

  const { sortedDates, shiftsByDay } = React.useMemo(() => {
    if (shifts.length === 0) {
      return { sortedDates: [], shiftsByDay: {} };
    }
    
    const sbd: Record<string, Shift[]> = shifts.reduce((acc, shift) => {
        (acc[shift.date] = acc[shift.date] || []).push(shift);
        // Ensure shifts are sorted Day then Night
        acc[shift.date].sort((a, b) => a.type === 'Day' ? -1 : 1);
        return acc;
    }, {} as Record<string, Shift[]>);

    const sd = Object.keys(sbd).sort();

    return { sortedDates: sd, shiftsByDay: sbd };
  }, [shifts]);

  if (selectedPress === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-center text-muted-foreground bg-secondary/30 rounded-lg p-8">
          <PackageSearch className="w-16 h-16 mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">No Press Selected</h3>
          <p className="max-w-md">Please select a press from the workload panel above to view its schedule or to start scheduling tasks for it.</p>
      </div>
    );
  }
  
  if (shifts.length === 0 && selectedPress !== null) {
      return (
          <div className="flex flex-col items-center justify-center h-full w-full text-center text-muted-foreground bg-secondary/30 rounded-lg p-8">
              <PackageSearch className="w-16 h-16 mb-4 text-gray-400" />
              <h3 className="text-xl font-semibold mb-2">No Shifts Available</h3>
              <p className="max-w-md">There are no shifts to display for the selected period.</p>
          </div>
      )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 min-w-max h-full">
      {sortedDates.map(date => (
        <div key={date} className="flex flex-col gap-4">
          <h3 className="font-headline text-lg text-center font-semibold">{format(new Date(date + 'T12:00:00Z'), 'EEE, d MMM')}</h3>
          <div className="flex flex-col gap-4 flex-1">
            {shiftsByDay[date].map(shift => (
                <ShiftSlot
                  key={shift.id}
                  shift={shift}
                  scheduledTasks={schedule[shift.id] || []}
                  onDrop={onDrop}
                  dieColors={dieColors}
                  onRemoveRequest={onRemoveRequest}
                  onEditRequest={onEditRequest}
                  onTaskDragStart={onTaskDragStart}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};

    