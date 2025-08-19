

'use server';

import type { Task, ProductionCondition, Shift, Schedule, ScheduledTask } from '@/types';
import { addMinutes } from 'date-fns';
import { getShiftStartDateTime } from './time-utils';

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
      const pphA = Math.max(a.piecesPerHour1, a.piecesPerHour2);
      const pphB = Math.max(b.piecesPerHour1, b.piecesPerHour2);
      if (pphA !== pphB) return pphB - pphA;
      // If pieces are equal, prefer lower cure time
      return a.cureTime - b.cureTime;
    })[0];

    const piecesPerHour = Math.max(bestCondition.piecesPerHour1, bestCondition.piecesPerHour2);
    if (piecesPerHour <= 0 || bestCondition.cureTime <= 0) continue;
    
    const piecesPerCycle = (piecesPerHour * bestCondition.cureTime) / 60;
    if (piecesPerCycle <= 0) continue;

    let remainingQtyForThisTask = tasksMap.get(task.jobCardNumber)!.remainingQuantity;

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
      
      const newScheduledTask: ScheduledTask = {
        id: `${task.jobCardNumber}-${pressNo}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
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
        isSaved: false,
        trackingSteps: [],
        type: 'production'
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
