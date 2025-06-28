
'use server';

import type { Task, ProductionCondition, Shift, Schedule, ScheduledTask } from '@/types';
import { startOfWeek, nextDay, setHours, setMinutes, setSeconds, addMinutes } from 'date-fns';

const dayIndexMap: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6,
};

const getShiftStartDateTime = (shift: Shift): Date => {
  const now = new Date();
  const thisMonday = startOfWeek(now, { weekStartsOn: 1 });
  const targetDayIndex = dayIndexMap[shift.day];
  let shiftDate = nextDay(thisMonday, targetDayIndex);
  
  if (shiftDate < now && shiftDate.getDate() !== now.getDate()) {
    shiftDate = nextDay(addMinutes(thisMonday, 10080), targetDayIndex);
  }
  
  const hours = shift.type === 'Day' ? 8 : 20;
  return setSeconds(setMinutes(setHours(shiftDate, hours), 0), 0);
};

const priorityOrder: Record<Task['priority'], number> = { 'High': 1, 'Normal': 2, 'Low': 3, 'None': 4 };

interface GenerateScheduleParams {
  tasksToSchedule: Task[];
  productionConditions: ProductionCondition[];
  shifts: Shift[];
  pressNo: number;
}

interface GenerateScheduleResult {
  newSchedule: Schedule;
  newShifts: Shift[];
  remainingTasks: Task[];
}

export const generateIdealSchedule = async ({
  tasksToSchedule,
  productionConditions,
  shifts,
  pressNo,
}: GenerateScheduleParams): Promise<GenerateScheduleResult> => {
  const sortedTasks = [...tasksToSchedule].sort((a, b) => {
    const priorityA = priorityOrder[a.priority];
    const priorityB = priorityOrder[b.priority];
    if (priorityA !== priorityB) return priorityA - priorityB;

    const dateA = a.deliveryDate ? new Date(a.deliveryDate).getTime() : Infinity;
    const dateB = b.deliveryDate ? new Date(b.deliveryDate).getTime() : Infinity;
    if (dateA !== dateB) return dateA - dateB;
    
    return new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime();
  });

  const localShifts = JSON.parse(JSON.stringify(shifts));
  const newSchedule: Schedule = {};
  const tasksMap = new Map<string, Task>(sortedTasks.map(t => [t.jobCardNumber, JSON.parse(JSON.stringify(t))]));

  for (const task of sortedTasks) {
    if (tasksMap.get(task.jobCardNumber)!.remainingQuantity <= 0) continue;

    const compatibleConditions = productionConditions.filter(
      pc => pc.itemCode === task.itemCode && pc.pressNo === pressNo && pc.material === task.material
    );
    if (compatibleConditions.length === 0) continue;

    const bestCondition = compatibleConditions.sort((a, b) => {
      const piecesA = Math.max(a.piecesPerCycle1, a.piecesPerCycle2);
      const piecesB = Math.max(b.piecesPerCycle1, b.piecesPerCycle2);
      return piecesB - piecesA;
    })[0];

    const piecesPerCycle = Math.max(bestCondition.piecesPerCycle1, bestCondition.piecesPerCycle2);
    if (piecesPerCycle <= 0 || bestCondition.cureTime <= 0) continue;

    let remainingQtyForThisTask = tasksMap.get(task.jobCardNumber)!.remainingQuantity;
    let batchCounter = 0;

    for (const shift of localShifts) {
      if (remainingQtyForThisTask <= 0) break;
      if (shift.remainingCapacity <= 0) continue;

      const maxCyclesInShift = Math.floor(shift.remainingCapacity / bestCondition.cureTime);
      if (maxCyclesInShift <= 0) continue;

      const maxQtyInShift = maxCyclesInShift * piecesPerCycle;
      const qtyToSchedule = Math.min(remainingQtyForThisTask, maxQtyInShift);

      if (qtyToSchedule <= 0) continue;
      
      const cyclesForThisBatch = Math.ceil(qtyToSchedule / piecesPerCycle);
      const timeTaken = cyclesForThisBatch * bestCondition.cureTime;

      const timeUsedInShift = shift.capacity - shift.remainingCapacity;
      const shiftStartDateTime = getShiftStartDateTime(shift);
      const taskStartTime = addMinutes(shiftStartDateTime, timeUsedInShift);
      const taskEndTime = addMinutes(taskStartTime, timeTaken);
      
      const batchSuffix = String.fromCharCode('A'.charCodeAt(0) + batchCounter++);
      const newScheduledTask: ScheduledTask = {
        id: `${task.jobCardNumber}-${pressNo}-${batchSuffix}`,
        jobCardNumber: task.jobCardNumber,
        itemCode: task.itemCode,
        material: task.material,
        priority: task.priority,
        scheduledQuantity: qtyToSchedule,
        pressNo: pressNo,
        dieNo: bestCondition.dieNo,
        timeTaken: timeTaken,
        shiftId: shift.id,
        startTime: taskStartTime.toISOString(),
        endTime: taskEndTime.toISOString(),
        creationDate: task.creationDate,
        deliveryDate: task.deliveryDate,
        orderedQuantity: task.orderedQuantity,
      };

      if (!newSchedule[shift.id]) newSchedule[shift.id] = [];
      newSchedule[shift.id].push(newScheduledTask);

      shift.remainingCapacity -= timeTaken;
      remainingQtyForThisTask -= qtyToSchedule;
      tasksMap.get(task.jobCardNumber)!.remainingQuantity -= qtyToSchedule;
    }
  }

  const remainingTasks = Array.from(tasksMap.values()).filter(t => t.remainingQuantity > 0);

  return { newSchedule, newShifts: localShifts, remainingTasks };
};
