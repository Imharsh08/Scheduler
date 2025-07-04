
import type { ProductionCondition, Task } from '@/types';
import { subDays, addDays } from 'date-fns';

export const initialTasks: Task[] = [
  { jobCardNumber: 'JC-001', itemCode: 'Gasket001', material: 'EPDM', orderedQuantity: 1000, remainingQuantity: 1000, priority: 'High', creationDate: subDays(new Date(), 5).toISOString(), deliveryDate: addDays(new Date(), 2).toISOString() },
  { jobCardNumber: 'JC-002', itemCode: 'Gasket002', material: 'EPDM', orderedQuantity: 500, remainingQuantity: 500, priority: 'Normal', creationDate: subDays(new Date(), 3).toISOString(), deliveryDate: addDays(new Date(), 10).toISOString() },
  { jobCardNumber: 'JC-003', itemCode: 'Gasket003', material: 'NBR', orderedQuantity: 750, remainingQuantity: 750, priority: 'Normal', creationDate: subDays(new Date(), 2).toISOString(), deliveryDate: addDays(new Date(), 5).toISOString() },
  { jobCardNumber: 'JC-004', itemCode: 'Gasket001', material: 'EPDM', orderedQuantity: 200, remainingQuantity: 200, priority: 'Low', creationDate: subDays(new Date(), 7).toISOString(), deliveryDate: null },
];

export const initialProductionConditions: ProductionCondition[] = [
  { itemCode: 'Gasket001', pressNo: 11, dieNo: 562, material: 'EPDM', piecesPerCycle1: 3, piecesPerCycle2: 6, cureTime: 6 },
  { itemCode: 'Gasket001', pressNo: 11, dieNo: 551, material: 'EPDM', piecesPerCycle1: 3, piecesPerCycle2: 0, cureTime: 3 },
  { itemCode: 'Gasket002', pressNo: 8, dieNo: 541, material: 'EPDM', piecesPerCycle1: 6, piecesPerCycle2: 0, cureTime: 11 },
  { itemCode: 'Gasket003', pressNo: 8, dieNo: 551, material: 'NBR', piecesPerCycle1: 6, piecesPerCycle2: 0, cureTime: 3 },
  { itemCode: 'Gasket003', pressNo: 9, dieNo: 552, material: 'NBR', piecesPerCycle1: 5, piecesPerCycle2: 10, cureTime: 4 },
];
