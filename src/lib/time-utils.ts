
import { parse, differenceInMinutes, addDays } from 'date-fns';

/**
 * Parses a "HH:mm" time string into a Date object for a given base date.
 * @param timeStr The time string, e.g., "08:00".
 * @param baseDate The date to apply the time to.
 * @returns A Date object.
 */
const parseTime = (timeStr: string, baseDate: Date): Date => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const newDate = new Date(baseDate);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
};

/**
 * Calculates the total capacity of a shift in minutes.
 * It correctly handles overnight shifts.
 * @param startTime The start time string, e.g., "20:00".
 * @param endTime The end time string, e.g., "08:00".
 * @returns The total duration of the shift in minutes.
 */
export const getShiftCapacityInMinutes = (startTime: string, endTime: string): number => {
  const today = new Date();
  let startDate = parseTime(startTime, today);
  let endDate = parseTime(endTime, today);
  
  // If the end time is on the next day (e.g., a night shift from 20:00 to 08:00)
  if (endDate <= startDate) {
    endDate = addDays(endDate, 1);
  }
  
  return differenceInMinutes(endDate, startDate);
};

/**
 * Gets the precise start Date object for a given shift.
 * @param shift The shift object.
 * @returns A Date object representing the shift's start time.
 */
export const getShiftStartDateTime = (shift: { date: string, startTime: string }): Date => {
  const baseDate = new Date(shift.date + 'T00:00:00.000Z'); // Work in UTC context
  return parseTime(shift.startTime, baseDate);
};

/**
 * Gets the precise end Date object for a given shift.
 * It correctly handles overnight shifts that cross into the next calendar day.
 * @param shift The shift object.
 * @returns A Date object representing the shift's end time.
 */
export const getShiftEndDateTime = (shift: { date: string, startTime: string, endTime: string }): Date => {
    const startDate = getShiftStartDateTime(shift);
    const endDate = parseTime(shift.endTime, startDate);

    if (endDate <= startDate) {
        return addDays(endDate, 1);
    }
    return endDate;
};
