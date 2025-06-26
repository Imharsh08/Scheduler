import type { Shift, ProductionCondition } from '@/types';

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
