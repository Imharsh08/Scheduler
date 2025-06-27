
export interface Task {
  jobCardNumber: string;
  orderedQuantity: number;
  itemCode: string;
  material: string;
  remainingQuantity: number;
  priority: 'High' | 'Normal' | 'Low' | 'None';
  creationDate: string; // ISO 8601 date string
  deliveryDate?: string | null; // ISO 8601 date string
}

export interface ProductionCondition {
  itemCode: string;
  pressNo: number;
  dieNo: number;
  material: string;
  piecesPerCycle: number;
  cureTime: number; // in minutes
}

export interface Shift {
  id: string; // e.g., 'monday-day'
  day: string;
  type: 'Day' | 'Night';
  capacity: number; // in minutes (e.g., 12 hours * 60 min = 720)
  remainingCapacity: number;
}

export interface ScheduledTask {
  id: string; // unique id for this scheduled entry
  jobCardNumber: string;
  itemCode: string;
  material: string;
  scheduledQuantity: number;
  pressNo: number;
  dieNo: number;
  timeTaken: number; // in minutes
}

export type Schedule = Record<string, ScheduledTask[]>; // key is shiftId

export interface ValidationRequest {
  task: Task;
  shift: Shift;
}
