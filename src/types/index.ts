

export type TrackingStatus = 'Pending' | 'In Progress' | 'Completed' | 'On Hold' | 'Skipped';
export type TrackingStepName = 'Molding' | 'Finishing' | 'Inspection' | 'Pre-Dispatch' | 'Dispatch' | 'Feedback' | 'FG Stock';

export interface TrackingStep {
  stepName: TrackingStepName;
  status: TrackingStatus;
  inputQty: number;
  outputQty: number;
  notes: string;
  plannedStartDate?: string | null;
  plannedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  rejectedQty?: number;
  excessQty?: number;
  satisfactionRating?: number;
  isSaved?: boolean;
}

export interface Task {
  jobCardNumber: string;
  orderedQuantity: number;
  itemCode: string;
  material: string;
  remainingQuantity: number;
  priority: 'High' | 'Normal' | 'Low' | 'None';
  creationDate: string; // ISO 8601 date string
  deliveryDate?: string | null; // ISO 8601 date string
  taskType: 'production' | 'maintenance';
  timeTaken?: number;
  dieNo?: number;
  fgStockConsumed?: number;
}

export interface ProductionCondition {
  itemCode: string;
  pressNo: number;
  dieNo: number;
  material: string;
  piecesPerHour1: number; // Pieces for one-side operation
  piecesPerHour2: number; // Pieces for two-side operation
  cureTime: number; // in minutes
  maintenanceAfterQty?: number; // Optional: The quantity after which die cleaning is needed
}

export interface Shift {
  id: string; // e.g., '2024-07-15-day'
  date: string; // e.g., '2024-07-15'
  day: string; // e.g., 'Monday'
  type: 'Day' | 'Night';
  capacity: number; // in minutes
  remainingCapacity: number;
  startTime: string; // e.g., "08:00"
  endTime: string; // e.g., "20:00"
}

export interface ScheduledTask {
  id: string; // unique id for this scheduled entry
  jobCardNumber: string;
  itemCode: string; // For maintenance tasks, this stores the reason.
  material?: string;
  priority?: Task['priority'];
  scheduledQuantity: number;
  pressNo: number;
  dieNo: number;
  timeTaken: number; // in minutes
  shiftId: string;
  startTime: string; // ISO 8601 date string
  endTime: string; // ISO 8601 date string
  orderedQuantity?: number;
  creationDate: string; // ISO 8601 date string
  deliveryDate?: string | null; // ISO 8601 date string
  isSaved?: boolean;
  trackingSteps: TrackingStep[];
  type: 'production' | 'maintenance';
}

export type Schedule = Record<string, ScheduledTask[]>; // key is shiftId

export interface ValidationRequest {
  task: Task;
  shift: Shift;
  pressNo: number;
}

export interface PressWorkload {
  pressNo: number;
  pendingQuantity: number;
  scheduledQuantity: number;
}

export interface IntegrationUrls {
  config: string;
  tasks: string;
  conditions: string;
  save: string;
  scheduledTasks: string;
  tracking: string;
}

export interface ModuleConfig {
  name: TrackingStepName;
  enabled: boolean;
  dependsOn: TrackingStepName | 'scheduled_end_time';
  tat: number; // Turnaround time
  tatUnit: 'days' | 'hours';
}

export type ModuleSettings = Record<TrackingStepName, ModuleConfig>;

export interface FGStockItem {
  itemCode: string;
  quantity: number;
  sourceJobCard: string;
  creationDate: string;
}

export interface AppSettings {
  scheduleHorizon: 'weekly' | 'monthly';
  holidays: Date[];
  includeToday: boolean;
  dayShiftStart: string; // "HH:mm" format
  dayShiftEnd: string;
  nightShiftStart: string;
  nightShiftEnd: string;
  defaultMaintenanceDuration: number;
}
