
'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { TaskList } from '@/components/task-list';
import { ScheduleGrid } from '@/components/schedule-grid';
import { ProductionConditionsPanel } from '@/components/production-conditions-panel';
import { PressWorkloadPanel } from '@/components/press-workload-panel';
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveUrl, setSaveUrl] = useState('');
  const [selectedPress, setSelectedPress] = useState<number | null>(null);
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

  const handleSaveSchedule = async () => {
    const scheduledItems = Object.values(schedule).flat();
    if (scheduledItems.length === 0) {
      toast({ title: "Nothing to Save", description: "The schedule is empty." });
      return;
    }
    if (!saveUrl) {
      toast({ title: "URL Required", description: "Please provide the 'Molding Sheet' save URL in the tasks panel.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: saveUrl, schedule }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to save schedule.');
      }
      toast({
        title: "Schedule Saved",
        description: `Successfully saved ${result.count || scheduledItems.length} items to your sheet.`,
      });
    } catch (error) {
      console.error("Failed to save schedule:", error);
      const description = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({
        title: "Error Saving Schedule",
        description: description,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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

  const handlePressSelect = (pressNo: number | null) => {
    setSelectedPress(pressNo);
  };

  const filteredTasks = React.useMemo(() => {
    if (selectedPress === null) {
      return tasks;
    }
    const validItemCodesForPress = new Set(
      productionConditions
        .filter(pc => pc.pressNo === selectedPress)
        .map(pc => pc.itemCode)
    );
    return tasks.filter(task => validItemCodesForPress.has(task.itemCode));
  }, [tasks, selectedPress, productionConditions]);


  const handleValidationSuccess = (
    scheduledItems: Omit<ScheduledTask, 'id'>[],
  ) => {
    if (!validationRequest) return;
    const { task } = validationRequest;

    let currentBatchCount = Object.values(schedule)
      .flat()
      .filter(st => st.jobCardNumber === task.jobCardNumber).length;
    
    let totalQuantityScheduled = 0;
    const scheduleUpdates = new Map<string, ScheduledTask[]>();
    const shiftCapacityUpdates = new Map<string, number>();

    scheduledItems.forEach((item) => {
      const batchSuffix = String.fromCharCode('A'.charCodeAt(0) + currentBatchCount);
      const newId = `${item.jobCardNumber}-${batchSuffix}`;
      currentBatchCount++;
      
      const scheduledTask: ScheduledTask = { ...item, id: newId };
      totalQuantityScheduled += item.scheduledQuantity;

      const currentShiftTasks = scheduleUpdates.get(item.shiftId) || [];
      scheduleUpdates.set(item.shiftId, [...currentShiftTasks, scheduledTask]);

      const timeUpdate = shiftCapacityUpdates.get(item.shiftId) || 0;
      shiftCapacityUpdates.set(item.shiftId, timeUpdate + item.timeTaken);
    });

    setSchedule((currentSchedule) => {
      const newSchedule = { ...currentSchedule };
      for (const [shiftId, tasksToAdd] of scheduleUpdates.entries()) {
        newSchedule[shiftId] = [...(newSchedule[shiftId] || []), ...tasksToAdd];
      }
      return newSchedule;
    });

    setTasks((prevTasks) =>
      prevTasks
        .map((t) =>
          t.jobCardNumber === task.jobCardNumber
            ? { ...t, remainingQuantity: t.remainingQuantity - totalQuantityScheduled }
            : t
        )
        .filter((t) => t.remainingQuantity > 0)
    );

    setShifts((prevShifts) =>
      prevShifts.map((s) => {
        const timeToDecrement = shiftCapacityUpdates.get(s.id);
        if (timeToDecrement) {
          return { ...s, remainingCapacity: s.remainingCapacity - timeToDecrement };
        }
        return s;
      })
    );
    
    setValidationRequest(null);
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header onSave={handleSaveSchedule} isSaving={isSaving} />
      <main className="flex-1 flex flex-col lg:flex-row gap-6 p-4 lg:p-6 overflow-hidden">
        <div className="lg:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
           <PressWorkloadPanel
            tasks={tasks}
            schedule={schedule}
            productionConditions={productionConditions}
            onPressSelect={handlePressSelect}
            selectedPress={selectedPress}
          />
          <TaskList
            tasks={filteredTasks}
            onDragStart={handleDragStart}
            onLoadTasks={handleLoadTasks}
            isLoading={isLoadingTasks}
            saveUrl={saveUrl}
            onSaveUrlChange={setSaveUrl}
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
          shifts={shifts}
          onClose={() => setValidationRequest(null)}
          onSuccess={handleValidationSuccess}
        />
      )}
    </div>
  );
}
