
import React from 'react';
import type { Shift, Schedule } from '@/types';
import { ShiftSlot } from './shift-slot';
import { PackageSearch } from 'lucide-react';

interface ScheduleGridProps {
  shifts: Shift[];
  schedule: Schedule;
  onDrop: (e: React.DragEvent<HTMLDivElement>, shiftId: string) => void;
  dieColors: Record<number, string>;
  selectedPress: number | null;
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({ shifts, schedule, onDrop, dieColors, selectedPress }) => {

  if (selectedPress === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-center text-muted-foreground bg-secondary/30 rounded-lg p-8">
          <PackageSearch className="w-16 h-16 mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold mb-2">No Press Selected</h3>
          <p className="max-w-md">Please select a press from the workload panel above to view its schedule or to start scheduling tasks for it.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 min-w-max h-full">
      {daysOfWeek.map(day => (
        <div key={day} className="flex flex-col gap-4">
          <h3 className="font-headline text-xl text-center font-semibold">{day}</h3>
          <div className="flex flex-col gap-4 flex-1">
            {shifts
              .filter(shift => shift.day === day)
              .map(shift => (
                <ShiftSlot
                  key={shift.id}
                  shift={shift}
                  scheduledTasks={schedule[shift.id] || []}
                  onDrop={onDrop}
                  dieColors={dieColors}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};
