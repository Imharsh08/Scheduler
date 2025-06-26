import React from 'react';
import type { Shift, Schedule } from '@/types';
import { ShiftSlot } from './shift-slot';

interface ScheduleGridProps {
  shifts: Shift[];
  schedule: Schedule;
  onDrop: (e: React.DragEvent<HTMLDivElement>, shiftId: string) => void;
}

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({ shifts, schedule, onDrop }) => {
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
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};
