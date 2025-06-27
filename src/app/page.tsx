
'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { TaskList } from '@/components/task-list';
import { ScheduleGrid } from '@/components/schedule-grid';
import { ProductionConditionsPanel } from '@/components/production-conditions-panel';
import { ValidationDialog } from '@/components/validation-dialog';
import { initialShifts, initialProductionConditions, initialTasks } from '@/lib/mock-data';
import type { Task, Shift, Schedule, ProductionCondition, ScheduledTask, ValidationRequest } from '@/types';
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [schedule, setSchedule] = useState<Schedule>({});
  const [productionConditions, setProductionConditions] = useState<ProductionCondition[]>(initialProductionConditions);
  const [validationRequest, setValidationRequest] = useState<ValidationRequest | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoadingConditions, setIsLoadingConditions] = useState(false);
  const { toast } = useToast();

  const handleLoadTasks = async (url: string) => {
    if (!url) {
      toast({
        title: "URL Required",
        description: "Please enter the Apps Script URL.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingTasks(true);
    try {
      // Use the Next.js API route as a proxy to avoid CORS issues
      const proxyUrl = `/api/tasks?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json(); // Always expect JSON now from our proxy

      if (!response.ok) {
        // Use the detailed error message from our proxy if available
        const errorMessage = data.details || data.error || `Request failed with status: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      // Handle cases where the script returns an error object in a 200 OK response
      if (data.error) {
        throw new Error(`Error from Google Script: ${data.error}`);
      }

      const fetchedTasks: Task[] = data.map((item: any) => ({
        jobCardNumber: item.jobCardNumber,
        orderedQuantity: item.orderedQuantity,
        itemCode: item.itemCode,
        material: item.material,
        remainingQuantity: item.orderedQuantity,
        priority: item.priority || 'None',
        creationDate: item.creationDate ? new Date(item.creationDate).toISOString() : new Date().toISOString(),
        deliveryDate: item.deliveryDate ? new Date(item.deliveryDate).toISOString() : null,
      }));

      setTasks(fetchedTasks);
      toast({
        title: "Success",
        description: `Loaded ${fetchedTasks.length} tasks successfully.`,
      });

    } catch (error) {
      console.error("Failed to load tasks:", error);
      const description = error instanceof Error ? error.message : "Could not fetch tasks. Check the URL and try again.";
      toast({
        title: "Error Loading Tasks",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleLoadProductionConditions = async (url: string) => {
    if (!url) {
      toast({
        title: "URL Required",
        description: "Please enter the Production Conditions Apps Script URL.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingConditions(true);
    try {
      const proxyUrl = `/api/tasks?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.details || data.error || `Request failed with status: ${response.status}`;
        throw new Error(errorMessage);
      }
      
      if (data.error) {
        throw new Error(`Error from Google Script: ${data.error}`);
      }

      const fetchedConditions: ProductionCondition[] = data.map((item: any) => ({
        itemCode: item.itemCode,
        pressNo: item.pressNo,
        dieNo: item.dieNo,
        material: item.material,
        piecesPerCycle1: item.piecesPerCycle1 || 0,
        piecesPerCycle2: item.piecesPerCycle2 || 0,
        cureTime: item.cureTime,
      }));

      setProductionConditions(fetchedConditions);
      toast({
        title: "Success",
        description: `Loaded ${fetchedConditions.length} production conditions.`,
      });

    } catch (error) {
      console.error("Failed to load production conditions:", error);
      const description = error instanceof Error ? error.message : "Could not fetch conditions. Check the URL and try again.";
      toast({
        title: "Error Loading Conditions",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsLoadingConditions(false);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, shiftId: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find((t) => t.jobCardNumber === taskId);
    const shift = shifts.find((s) => s.id === shiftId);

    if (task && shift) {
      setValidationRequest({ task, shift });
    }
  };

  const handleValidationSuccess = (
    scheduledTaskDetails: Omit<ScheduledTask, 'id'>,
    task: Task,
    shift: Shift
  ) => {
    setSchedule((currentSchedule) => {
      // Logic to generate the new unique ID goes *inside* the state setter
      const batchCount = Object.values(currentSchedule)
        .flat()
        .filter(st => st.jobCardNumber === task.jobCardNumber).length;
      
      const batchSuffix = String.fromCharCode('A'.charCodeAt(0) + batchCount);
      const newId = `${task.jobCardNumber}-${batchSuffix}`;

      const scheduledTask: ScheduledTask = {
        ...scheduledTaskDetails,
        id: newId,
      };

      // Update tasks by reducing the remaining quantity
      setTasks((prevTasks) =>
        prevTasks
          .map((t) =>
            t.jobCardNumber === task.jobCardNumber
              ? { ...t, remainingQuantity: t.remainingQuantity - scheduledTaskDetails.scheduledQuantity }
              : t
          )
          .filter((t) => t.remainingQuantity > 0)
      );

      // Update the specific shift's remaining capacity
      setShifts((prevShifts) =>
        prevShifts.map((s) =>
          s.id === shift.id
            ? { ...s, remainingCapacity: s.remainingCapacity - scheduledTaskDetails.timeTaken }
            : s
        )
      );
      
      // Add the task to the schedule
      const newSchedule = { ...currentSchedule };
      const newShiftTasks = [...(newSchedule[shift.id] || []), scheduledTask];
      newSchedule[shift.id] = newShiftTasks;
      return newSchedule;
    });

    setValidationRequest(null);
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header />
      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-6 overflow-hidden">
        <div className="lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
          <TaskList
            tasks={tasks}
            onDragStart={handleDragStart}
            onLoadTasks={handleLoadTasks}
            isLoading={isLoadingTasks}
          />
          <ProductionConditionsPanel
            productionConditions={productionConditions}
            onLoadConditions={handleLoadProductionConditions}
            isLoading={isLoadingConditions}
          />
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
