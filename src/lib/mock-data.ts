
import type { Shift, ProductionCondition, Task } from '@/types';
import { subDays, addDays } from 'date-fns';

export const initialTasks: Task[] = [
  { jobCardNumber: 'JC-001', itemCode: 'Gasket001', material: 'EPDM', orderedQuantity: 1000, remainingQuantity: 1000, priority: 'High', creationDate: subDays(new Date(), 5).toISOString(), deliveryDate: addDays(new Date(), 2).toISOString() },
  { jobCardNumber: 'JC-002', itemCode: 'Gasket002', material: 'EPDM', orderedQuantity: 500, remainingQuantity: 500, priority: 'Normal', creationDate: subDays(new Date(), 3).toISOString(), deliveryDate: addDays(new Date(), 10).toISOString() },
  { jobCardNumber: 'JC-003', itemCode: 'Gasket003', material: 'NBR', orderedQuantity: 750, remainingQuantity: 750, priority: 'Normal', creationDate: subDays(new Date(), 2).toISOString(), deliveryDate: addDays(new Date(), 5).toISOString() },
  { jobCardNumber: 'JC-004', itemCode: 'Gasket001', material: 'EPDM', orderedQuantity: 200, remainingQuantity: 200, priority: 'Low', creationDate: subDays(new Date(), 7).toISOString(), deliveryDate: null },
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const initialShifts: Shift[] = days.flatMap(day => [
  { id: `${day.toLowerCase()}-day`, day, type: 'Day', capacity: 720, remainingCapacity: 720 },
  { id: `${day.toLowerCase()}-night`, day, type: 'Night', capacity: 720, remainingCapacity: 720 },
]);

export const initialProductionConditions: ProductionCondition[] = [
  { itemCode: 'Gasket001', pressNo: 11, dieNo: 562, material: 'EPDM', piecesPerCycle: 3, cureTime: 6 },
  { itemCode: 'Gasket001', pressNo: 11, dieNo: 551, material: 'EPDM', piecesPerCycle: 3, cureTime: 3 },
  { itemCode: 'Gasket002', pressNo: 8, dieNo: 541, material: 'EPDM', piecesPerCycle: 6, cureTime: 11 },
  { itemCode: 'Gasket003', pressNo: 8, dieNo: 551, material: 'NBR', piecesPerCycle: 6, cureTime: 3 },
  { itemCode: 'Gasket003', pressNo: 9, dieNo: 552, material: 'NBR', piecesPerCycle: 5, cureTime: 4 },
];
