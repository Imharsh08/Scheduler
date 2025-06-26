'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { TaskList } from '@/components/task-list';
import { ScheduleGrid } from '@/components/schedule-grid';
import { ProductionConditionsPanel } from '@/components/production-conditions-panel';
import { ValidationDialog } from '@/components/validation-dialog';
import { initialTasks, initialShifts, initialProductionConditions } from '@/lib/mock-data';
import type { Task, Shift, Schedule, ProductionCondition, ScheduledTask, ValidationRequest } from '@/types';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [schedule, setSchedule] = useState<Schedule>({});
  const [productionConditions, setProductionConditions] = useState<ProductionCondition[]>(initialProductionConditions);
  const [validationRequest, setValidationRequest] = useState<ValidationRequest | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, shiftId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    const task = tasks.find((t) => t.jobCardNumber === taskId);
    const shift = shifts.find((s) => s.id === shiftId);

    if (task && shift) {
      setValidationRequest({ task, shift });
    }
  };

  const handleValidationSuccess = (
    scheduledTask: ScheduledTask,
    task: Task,
    shift: Shift
  ) => {
    // Update tasks
    setTasks((prevTasks) =>
      prevTasks.map((t) =>
        t.jobCardNumber === task.jobCardNumber
          ? { ...t, remainingQuantity: t.remainingQuantity - scheduledTask.scheduledQuantity }
          : t
      ).filter(t => t.remainingQuantity > 0)
    );

    // Update shifts
    setShifts((prevShifts) =>
      prevShifts.map((s) =>
        s.id === shift.id
          ? { ...s, remainingCapacity: s.remainingCapacity - scheduledTask.timeTaken }
          : s
      )
    );

    // Update schedule
    setSchedule((prevSchedule) => {
      const newSchedule = { ...prevSchedule };
      if (!newSchedule[shift.id]) {
        newSchedule[shift.id] = [];
      }
      newSchedule[shift.id].push(scheduledTask);
      return newSchedule;
    });

    setValidationRequest(null);
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-6 overflow-hidden">
        <div className="lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
          <TaskList tasks={tasks} onDragStart={handleDragStart} />
          <ProductionConditionsPanel productionConditions={productionConditions} />
        </div>
        <div className="lg:w-2/3 flex-1 overflow-x-auto">
          <ScheduleGrid
            shifts={shifts}
            schedule={schedule}
            onDrop={handleDrop}
          />
        </div>
      </main>
      {validationRequest && (
        <ValidationDialog
          request={validationRequest}
          productionConditions={productionConditions}
          onClose={() => setValidationRequest(null)}
          onSuccess={handleValidationSuccess}
        />
      )}
    </div>
  );
}
