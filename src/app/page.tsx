
'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/header';
import { TaskList } from '@/components/task-list';
import { ScheduleGrid } from '@/components/schedule-grid';
import { PressWorkloadPanel } from '@/components/press-workload-panel';
import { ValidationDialog } from '@/components/validation-dialog';
import { initialShifts, initialProductionConditions, initialTasks } from '@/lib/mock-data';
import type { Task, Shift, Schedule, ProductionCondition, ScheduledTask, ValidationRequest, IntegrationUrls } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { IntegrationDialog } from '@/components/integration-dialog';
import { ColorSettingsDialog } from '@/components/color-settings-dialog';
import { ProductionConditionsDialog } from '@/components/production-conditions-dialog';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [schedule, setSchedule] = useState<Schedule>({});
  const [productionConditions, setProductionConditions] = useState<ProductionCondition[]>(initialProductionConditions);
  const [validationRequest, setValidationRequest] = useState<ValidationRequest | null>(null);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isLoadingConditions, setIsLoadingConditions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPress, setSelectedPress] = useState<number | null>(null);
  const { toast } = useToast();

  const [urls, setUrls] = useState<IntegrationUrls>({
    config: '',
    tasks: '',
    conditions: '',
    save: '',
  });

  const [isIntegrationDialogOpen, setIsIntegrationDialogOpen] = useState(false);
  const [isColorSettingsDialogOpen, setIsColorSettingsDialogOpen] = useState(false);
  const [isProductionConditionsDialogOpen, setIsProductionConditionsDialogOpen] = useState(false);
  const [dieColors, setDieColors] = useState<Record<number, string>>({});

  useEffect(() => {
    try {
      const savedUrls = localStorage.getItem('integrationUrls');
      if (savedUrls) {
        setUrls(JSON.parse(savedUrls));
      } else {
        setIsIntegrationDialogOpen(true);
      }

      const savedColors = localStorage.getItem('dieColors');
      if (savedColors) {
        setDieColors(JSON.parse(savedColors));
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  const handleLoadTasks = async (taskUrl?: string) => {
    const urlToUse = taskUrl || urls.tasks;
    if (!urlToUse) {
      toast({
        title: "Task URL Not Set",
        description: "Please set your Configuration URL and load the links first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingTasks(true);
    try {
      const proxyUrl = `/api/tasks?url=${encodeURIComponent(urlToUse)}`;
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

  const handleLoadProductionConditions = async (conditionUrl?: string) => {
    const urlToUse = conditionUrl || urls.conditions;
    if (!urlToUse) {
      toast({
        title: "Conditions URL Not Set",
        description: "Please set your Configuration URL and load the links first.",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingConditions(true);
    try {
      const proxyUrl = `/api/tasks?url=${encodeURIComponent(urlToUse)}`;
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

  const handleLoadUrlsFromSheet = async (configUrl: string) => {
    if (!configUrl) {
      toast({ title: "URL Required", description: "Please enter the Configuration URL.", variant: "destructive" });
      return null;
    }
    try {
      const proxyUrl = `/api/tasks?url=${encodeURIComponent(configUrl)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.details || data.error || 'Failed to fetch configuration.';
        throw new Error(errorMessage);
      }
      
      if (data.error) {
        console.error("Configuration error from Google Sheet:", data.error);
        let userFriendlyDescription = data.error;
        if (typeof userFriendlyDescription === 'string' && (userFriendlyDescription.includes("' not found") || userFriendlyDescription.includes("Missing 'Key' or 'Value' headers"))) {
            userFriendlyDescription = `There's a problem with your "Web Url" configuration sheet. Please ensure it exists and has "Key" and "Value" columns as described in the setup instructions.`;
        }
         toast({
            title: "Configuration Error",
            description: userFriendlyDescription,
            variant: "destructive",
        });
        return null;
      }
      
      const newUrls: IntegrationUrls = {
        config: configUrl,
        tasks: data.tasks || '',
        conditions: data.conditions || '',
        save: data.save || ''
      };

      handleSaveUrls(newUrls);
      toast({
        title: "Configuration Loaded",
        description: "Loading associated data automatically...",
      });

      // Automatically load data after successful config load
      if (newUrls.tasks) {
        handleLoadTasks(newUrls.tasks);
      }
      if (newUrls.conditions) {
        handleLoadProductionConditions(newUrls.conditions);
      }

      return newUrls;

    } catch (error) {
      console.error("Failed to load URLs from sheet:", error);
      const description = error instanceof Error ? error.message : "Could not fetch configuration. Check the URL and try again.";
      toast({
        title: "Error Loading Configuration",
        description: description,
        variant: "destructive",
      });
      return null;
    }
  };

  const handleSaveUrls = (newUrls: IntegrationUrls) => {
    setUrls(newUrls);
    try {
      localStorage.setItem('integrationUrls', JSON.stringify(newUrls));
      if(newUrls.config){ // Only show toast if it's not the initial blank save
         toast({
          title: "Links Saved",
          description: "Your integration links have been saved successfully.",
        });
      }
    } catch (error) {
      console.error("Failed to save URLs to localStorage", error);
      toast({
        title: "Error Saving Links",
        description: "Could not save links to your browser's local storage.",
        variant: "destructive",
      });
    }
  };

  const handleSaveDieColors = (newColors: Record<number, string>) => {
    setDieColors(newColors);
    try {
      localStorage.setItem('dieColors', JSON.stringify(newColors));
      toast({
        title: "Colors Saved",
        description: "Your die color settings have been updated.",
      });
    } catch (error) {
      console.error("Failed to save colors to localStorage", error);
      toast({
        title: "Error Saving Colors",
        description: "Could not save color settings to your browser's local storage.",
        variant: "destructive",
      });
    }
  };

  const handleSaveSchedule = async () => {
    const scheduledItems = Object.values(schedule).flat();
    if (scheduledItems.length === 0) {
      toast({ title: "Nothing to Save", description: "The schedule is empty." });
      return;
    }
    if (!urls.save) {
      toast({ title: "Save URL Not Set", description: "Please set your Configuration URL and load the links first.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetUrl: urls.save, schedule }),
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
    if (selectedPress === null) {
        toast({
            title: "Select a Press First",
            description: "Please select a press from the workload panel to schedule a task.",
            variant: "destructive"
        });
        return;
    }
    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find((t) => t.jobCardNumber === taskId);
    const shift = shifts.find((s) => s.id === shiftId);

    if (task && shift) {
        const isTaskValidForPress = productionConditions.some(
            pc => pc.itemCode === task.itemCode && pc.material === task.material && pc.pressNo === selectedPress
        );

        if (!isTaskValidForPress) {
            toast({
                title: "Incompatible Task",
                description: `Task for item ${task.itemCode} cannot be run on Press ${selectedPress}.`,
                variant: "destructive"
            });
            return;
        }
        setValidationRequest({ task, shift, pressNo: selectedPress });
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

  const filteredSchedule = React.useMemo(() => {
    if (selectedPress === null) {
      return {};
    }
    const newSchedule: Schedule = {};
    Object.keys(schedule).forEach(shiftId => {
      const shiftTasks = schedule[shiftId] || [];
      newSchedule[shiftId] = shiftTasks.filter(task => task.pressNo === selectedPress);
    });
    return newSchedule;
  }, [schedule, selectedPress]);


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

      const currentShiftTasks = scheduleUpdates.get(item.shiftId) || schedule[item.shiftId] || [];
      scheduleUpdates.set(item.shiftId, [...currentShiftTasks, scheduledTask]);

      const timeUpdate = shiftCapacityUpdates.get(item.shiftId) || 0;
      shiftCapacityUpdates.set(item.shiftId, timeUpdate + item.timeTaken);
    });

    setSchedule((currentSchedule) => {
      const newSchedule = { ...currentSchedule };
      for (const [shiftId, tasksToAdd] of scheduleUpdates.entries()) {
        newSchedule[shiftId] = tasksToAdd;
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

  const handleRefreshData = () => {
    toast({
      title: "Refreshing Data...",
      description: "Fetching the latest tasks and conditions.",
    });
    handleLoadTasks();
    handleLoadProductionConditions();
  };


  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header
        onSave={handleSaveSchedule}
        isSaving={isSaving}
        onOpenIntegrationDialog={() => setIsIntegrationDialogOpen(true)}
        onOpenColorSettingsDialog={() => setIsColorSettingsDialogOpen(true)}
        onOpenProductionConditionsDialog={() => setIsProductionConditionsDialogOpen(true)}
        onRefreshData={handleRefreshData}
      />
      <main className="flex-1 flex flex-col gap-4 p-4 lg:p-6 overflow-hidden">
        <PressWorkloadPanel
          tasks={tasks}
          schedule={schedule}
          productionConditions={productionConditions}
          onPressSelect={handlePressSelect}
          selectedPress={selectedPress}
        />
        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
            <div className="lg:w-1/3 flex flex-col pr-2">
              <TaskList
                tasks={filteredTasks}
                onDragStart={handleDragStart}
                onLoadTasks={handleLoadTasks}
                isLoading={isLoadingTasks}
              />
            </div>
            <div className="lg:w-2/3 flex-1 overflow-x-auto">
              <ScheduleGrid
                shifts={shifts}
                schedule={filteredSchedule}
                onDrop={handleDrop}
                dieColors={dieColors}
                selectedPress={selectedPress}
              />
            </div>
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
      <IntegrationDialog
        open={isIntegrationDialogOpen}
        onOpenChange={setIsIntegrationDialogOpen}
        urls={urls}
        onSaveUrls={handleSaveUrls}
        onLoadFromSheet={handleLoadUrlsFromSheet}
      />
      <ColorSettingsDialog
        open={isColorSettingsDialogOpen}
        onOpenChange={setIsColorSettingsDialogOpen}
        productionConditions={productionConditions}
        dieColors={dieColors}
        onSave={handleSaveDieColors}
      />
      <ProductionConditionsDialog
        open={isProductionConditionsDialogOpen}
        onOpenChange={setIsProductionConditionsDialogOpen}
        productionConditions={productionConditions}
        isLoading={isLoadingConditions}
      />
    </div>
  );
}
