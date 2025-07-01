
import React from 'react';
import type { Shift } from '@/types';
import { ShiftSlot } from './shift-slot';
import { PackageSearch } from 'lucide-react';
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, format } from 'date-fns';
import { cn } from '@/lib/utils';
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

  const { isMonthlyView, monthDays, weekDayPlaceholders, sortedDates, shiftsByDay } = React.useMemo(() => {
    if (shifts.length === 0) {
      return { isMonthlyView: false, monthDays: [], weekDayPlaceholders: [], sortedDates: [], shiftsByDay: {} };
    }

    const isMonthly = shifts.length > 14; // Simple heuristic: 7 days * 2 shifts = 14

    const sbd: Record<string, Shift[]> = shifts.reduce((acc, shift) => {
        (acc[shift.date] = acc[shift.date] || []).push(shift);
        return acc;
    }, {} as Record<string, Shift[]>);

    const sd = Object.keys(sbd).sort();

    if (!isMonthly) {
        return { isMonthlyView: false, monthDays: [], weekDayPlaceholders: [], sortedDates: sd, shiftsByDay: sbd };
    }

    const firstShiftDate = new Date(shifts[0].date + 'T12:00:00Z'); // Use UTC to avoid timezone issues
    const start = startOfMonth(firstShiftDate);
    const end = endOfMonth(firstShiftDate);
    const md = eachDayOfInterval({ start, end });

    // getDay() is 0 for Sunday, 1 for Monday... We want our week to start on Monday.
    const firstDayIndex = getDay(start);
    const placeholdersCount = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const wdp = Array.from({ length: placeholdersCount });

    return { isMonthlyView: isMonthly, monthDays: md, weekDayPlaceholders: wdp, sortedDates: sd, shiftsByDay: sbd };
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

  if (isMonthlyView) {
      return (
          <div className="grid grid-cols-7 gap-1 h-full auto-rows-fr">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <div key={day} className="text-center font-bold font-headline text-sm p-2 border-b">{day}</div>
              ))}
              {weekDayPlaceholders.map((_, index) => <div key={`placeholder-${index}`} className="border rounded-lg bg-secondary/20" />)}
              {monthDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayShifts = shiftsByDay[dateStr] || [];
                  const isHoliday = dayShifts.length === 0;
                  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

                  return (
                      <div key={dateStr} className={cn("border rounded-lg flex flex-col gap-1 p-1 min-h-[150px]", isToday && "bg-blue-50 border-blue-200")}>
                          <p className={cn("font-bold text-sm text-right pr-1", isToday && "text-primary")}>{format(day, 'd')}</p>
                           <div className="flex flex-col gap-1 flex-1">
                              {isHoliday ? (
                                <div className="flex-1 flex items-center justify-center">
                                    <p className="text-xs text-muted-foreground text-center">Non-Working Day</p>
                                </div>
                              ) : (
                                  dayShifts.map(shift => (
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
                                  ))
                              )}
                           </div>
                      </div>
                  );
              })}
          </div>
      )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 min-w-max h-full">
      {sortedDates.map(date => (
        <div key={date} className="flex flex-col gap-4">
          <h3 className="font-headline text-xl text-center font-semibold">{format(new Date(date + 'T12:00:00Z'), 'EEEE')}</h3>
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
