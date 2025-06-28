
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
import { AllScheduledTasksDialog } from '@/components/all-scheduled-tasks-dialog';
import { generateSchedulePdf } from '@/lib/pdf-utils';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EditScheduledTaskDialog } from '@/components/edit-scheduled-task-dialog';
import { generateIdealSchedule } from '@/lib/scheduler';
import { GanttChartView } from '@/components/gantt-chart-view';

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [shiftsByPress, setShiftsByPress] = useState<Record<number, Shift[]>>({});
  const [scheduleByPress, setScheduleByPress] = useState<Record<number, Schedule>>({});
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
  const [isAllTasksDialogOpen, setIsAllTasksDialogOpen] = useState(false);
  const [dieColors, setDieColors] = useState<Record<number, string>>({});
  
  const [taskToRemove, setTaskToRemove] = useState<ScheduledTask | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<ScheduledTask | null>(null);
  const [generatingPressNo, setGeneratingPressNo] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'gantt'>('grid');

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

      const savedViewMode = localStorage.getItem('viewMode') as 'grid' | 'gantt' | null;
      if (savedViewMode) {
          setViewMode(savedViewMode);
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
    }
  }, []);

  useEffect(() => {
    if (productionConditions.length > 0) {
      const pressNos = [...new Set(productionConditions.map(pc => pc.pressNo))];
      
      const newShiftsByPress: Record<number, Shift[]> = {};
      pressNos.forEach(pressNo => {
        // Ensure each press gets a deep copy of the initial shifts
        newShiftsByPress[pressNo] = JSON.parse(JSON.stringify(initialShifts));
      });
      setShiftsByPress(newShiftsByPress);

      const newScheduleByPress: Record<number, Schedule> = {};
        pressNos.forEach(pressNo => {
          newScheduleByPress[pressNo] = {};
        });
      setScheduleByPress(newScheduleByPress);

    }
  }, [productionConditions]);

  const handleSetViewMode = (mode: 'grid' | 'gantt') => {
    setViewMode(mode);
    try {
        localStorage.setItem('viewMode', mode);
    } catch (error) {
        console.error("Failed to save view mode to localStorage", error);
        toast({
            title: "Could not save view setting",
            description: "Your browser may be preventing saving to local storage.",
            variant: "destructive"
        })
    }
  };

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
      if(newUrls.config){ 
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
    const mergedSchedule: Schedule = {};
    Object.values(scheduleByPress).forEach(pressSchedule => {
      Object.keys(pressSchedule).forEach(shiftId => {
        if (!mergedSchedule[shiftId]) {
          mergedSchedule[shiftId] = [];
        }
        mergedSchedule[shiftId].push(...pressSchedule[shiftId]);
      });
    });

    const scheduledItems = Object.values(mergedSchedule).flat();
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
        body: JSON.stringify({ sheetUrl: urls.save, schedule: mergedSchedule }),
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
    
    const pressShifts = shiftsByPress[selectedPress] || [];
    const shift = pressShifts.find((s) => s.id === shiftId);

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

  const handleScheduleClick = (task: Task, shiftId: string) => {
    if (selectedPress === null) {
        toast({
            title: "Select a Press First",
            description: "Please select a press from the workload panel to schedule a task.",
            variant: "destructive"
        });
        return;
    }

    const pressShifts = shiftsByPress[selectedPress] || [];
    const shift = pressShifts.find((s) => s.id === shiftId);

    if (shift) {
         setValidationRequest({ task, shift, pressNo: selectedPress });
    } else {
         toast({
            title: "Shift Not Found",
            description: "The selected shift could not be found for the current press.",
            variant: "destructive"
        });
    }
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
    const { task, pressNo: pressToUpdate } = validationRequest;

    let totalQuantityScheduled = 0;
    
    setScheduleByPress(current => {
      const pressSchedule = { ...(current[pressToUpdate] || {}) };
      
      const allScheduledTasks = Object.values(current).flatMap(ps => Object.values(ps).flat());
      let currentBatchCount = allScheduledTasks.filter(st => st.jobCardNumber === task.jobCardNumber).length;
      
      const newScheduledTasksWithIds: ScheduledTask[] = [];
      scheduledItems.forEach(item => {
        totalQuantityScheduled += item.scheduledQuantity;
        const batchSuffix = String.fromCharCode('A'.charCodeAt(0) + currentBatchCount);
        const newId = `${item.jobCardNumber}-${item.pressNo}-${batchSuffix}`;
        currentBatchCount++;
        newScheduledTasksWithIds.push({ ...item, id: newId });
      });

      newScheduledTasksWithIds.forEach(scheduledTask => {
        const currentShiftTasks = pressSchedule[scheduledTask.shiftId] || [];
        pressSchedule[scheduledTask.shiftId] = [...currentShiftTasks, scheduledTask];
      });

      return { ...current, [pressToUpdate]: pressSchedule };
    });

    setShiftsByPress(current => {
      const pressShifts = JSON.parse(JSON.stringify(current[pressToUpdate] || []));
      scheduledItems.forEach(item => {
        const shiftToUpdate = pressShifts.find((s: Shift) => s.id === item.shiftId);
        if (shiftToUpdate) {
            shiftToUpdate.remainingCapacity -= item.timeTaken;
        }
      });
      return { ...current, [pressToUpdate]: pressShifts };
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

  const pressNumbers = React.useMemo(() => {
    return [...new Set(productionConditions.map(pc => pc.pressNo))].sort((a,b) => a - b);
  }, [productionConditions]);

  const handleDownloadPdf = (pressNo: 'all' | number) => {
    generateSchedulePdf(pressNo, scheduleByPress, shiftsByPress);
  }

  const handleRemoveRequest = (task: ScheduledTask) => {
    setTaskToRemove(task);
  };

  const handleConfirmRemove = () => {
    if (!taskToRemove) return;

    const { pressNo, shiftId, timeTaken, scheduledQuantity, jobCardNumber, itemCode, material, priority, creationDate, deliveryDate, orderedQuantity } = taskToRemove;

    setShiftsByPress(current => {
      const pressShifts = JSON.parse(JSON.stringify(current[pressNo] || []));
      const shiftToUpdate = pressShifts.find((s: Shift) => s.id === shiftId);
      if (shiftToUpdate) {
        shiftToUpdate.remainingCapacity += timeTaken;
      }
      return { ...current, [pressNo]: pressShifts };
    });
    
    setTasks(currentTasks => {
      const existingTaskIndex = currentTasks.findIndex(t => t.jobCardNumber === jobCardNumber);
      if (existingTaskIndex > -1) {
        const newTasks = [...currentTasks];
        newTasks[existingTaskIndex].remainingQuantity += scheduledQuantity;
        return newTasks;
      } else {
        // Task was fully scheduled, so add it back to the list preserving original data
        return [
          ...currentTasks,
          {
            jobCardNumber,
            itemCode,
            material,
            priority,
            orderedQuantity: orderedQuantity,
            remainingQuantity: scheduledQuantity,
            creationDate: creationDate,
            deliveryDate: deliveryDate,
          }
        ];
      }
    });

    setScheduleByPress(current => {
      const pressSchedule = { ...(current[pressNo] || {}) };
      const shiftTasks = (pressSchedule[shiftId] || []).filter(t => t.id !== taskToRemove.id);
      pressSchedule[shiftId] = shiftTasks;
      return { ...current, [pressNo]: pressSchedule };
    });

    toast({ title: "Task Removed", description: `Task ${jobCardNumber} has been removed from the schedule.` });
    setTaskToRemove(null);
  };

  const handleCancelRemove = () => {
    setTaskToRemove(null);
  };

  const handleEditRequest = (task: ScheduledTask) => {
    setTaskToEdit(task);
  };

  const handleCancelEdit = () => {
      setTaskToEdit(null);
  }

  const handleUpdateScheduledTask = (updatedDetails: Partial<ScheduledTask>) => {
    if (!taskToEdit) return;

    const { pressNo, shiftId, scheduledQuantity: oldQty, timeTaken: oldTime } = taskToEdit;
    const { scheduledQuantity: newQty, timeTaken: newTime, endTime: newEndTime } = updatedDetails;

    if (newQty === undefined || newTime === undefined || newEndTime === undefined) return;

    const qtyDifference = newQty - oldQty;
    const timeDifference = newTime - oldTime;

    setTasks(currentTasks => {
        const jobCardNumber = taskToEdit.jobCardNumber;
        const existingTaskIndex = currentTasks.findIndex(t => t.jobCardNumber === jobCardNumber);

        if (existingTaskIndex > -1) {
            // Task already exists in the unscheduled list, just update its quantity
            const updatedTasks = [...currentTasks];
            updatedTasks[existingTaskIndex].remainingQuantity -= qtyDifference;
            return updatedTasks.filter(t => t.remainingQuantity > 0);
        } else {
            // Task was fully scheduled and is not in the list.
            // We need to add it back if the quantity was reduced.
            const returnedQuantity = -qtyDifference;
            if (returnedQuantity > 0) {
                const { itemCode, material, priority, creationDate, deliveryDate, orderedQuantity } = taskToEdit;
                const newTask: Task = {
                    jobCardNumber,
                    itemCode,
                    material,
                    priority,
                    orderedQuantity,
                    remainingQuantity: returnedQuantity,
                    creationDate,
                    deliveryDate,
                };
                return [...currentTasks, newTask];
            }
            return currentTasks;
        }
    });

    setShiftsByPress(current => {
        const pressShifts = JSON.parse(JSON.stringify(current[pressNo] || []));
        const shiftToUpdate = pressShifts.find((s: Shift) => s.id === shiftId);
        if (shiftToUpdate) {
            shiftToUpdate.remainingCapacity -= timeDifference;
        }
        return { ...current, [pressNo]: pressShifts };
    });

    setScheduleByPress(current => {
        const pressSchedule = { ...(current[pressNo] || {}) };
        const shiftTasks = (pressSchedule[shiftId] || []).map(t =>
            t.id === taskToEdit.id ? { ...t, ...updatedDetails } : t
        );
        pressSchedule[shiftId] = shiftTasks;
        return { ...current, [pressNo]: pressSchedule };
    });

    toast({ title: "Task Updated", description: `Task ${taskToEdit.jobCardNumber} quantity has been adjusted.` });
    setTaskToEdit(null);
  };

  const handleGenerateIdealSchedule = async (pressNo: number) => {
    setGeneratingPressNo(pressNo);
    toast({
        title: `Generating schedule for Press ${pressNo}...`,
        description: "This may take a moment. Please wait.",
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const taskPool = new Map<string, Task>();
        tasks.forEach(task => {
            taskPool.set(task.jobCardNumber, JSON.parse(JSON.stringify(task)));
        });

        const scheduledTasksOnPress = scheduleByPress[pressNo] ? Object.values(scheduleByPress[pressNo]).flat() : [];
        scheduledTasksOnPress.forEach(st => {
            if (taskPool.has(st.jobCardNumber)) {
                taskPool.get(st.jobCardNumber)!.remainingQuantity += st.scheduledQuantity;
            } else {
                taskPool.set(st.jobCardNumber, {
                    jobCardNumber: st.jobCardNumber,
                    orderedQuantity: st.orderedQuantity,
                    itemCode: st.itemCode,
                    material: st.material,
                    remainingQuantity: st.scheduledQuantity,
                    priority: st.priority,
                    creationDate: st.creationDate,
                    deliveryDate: st.deliveryDate,
                });
            }
        });

        const tasksToSchedule = Array.from(taskPool.values());

        const freshShiftsForPress = JSON.parse(JSON.stringify(initialShifts));
        const { newSchedule, newShifts, remainingTasks } = await generateIdealSchedule({
            tasksToSchedule,
            productionConditions,
            shifts: freshShiftsForPress,
            pressNo,
        });
        
        const otherPressSchedules: Record<number, Schedule> = {};
        Object.keys(scheduleByPress).forEach(pNoStr => {
            const pNo = parseInt(pNoStr, 10);
            if(pNo !== pressNo) {
                otherPressSchedules[pNo] = scheduleByPress[pNo];
            }
        });

        setScheduleByPress({ ...otherPressSchedules, [pressNo]: newSchedule });
        setShiftsByPress(current => ({ ...current, [pressNo]: newShifts }));
        setTasks(remainingTasks);
        
        toast({
            title: "Schedule Generated Successfully",
            description: `A new optimized schedule has been created for Press ${pressNo}.`,
        });

    } catch (error) {
        console.error("Failed to generate ideal schedule:", error);
        toast({
            title: "Error Generating Schedule",
            description: error instanceof Error ? error.message : "An unknown error occurred.",
            variant: "destructive",
        });
    } finally {
        setGeneratingPressNo(null);
    }
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
        onViewAllTasksClick={() => setIsAllTasksDialogOpen(true)}
        onDownloadPdfClick={handleDownloadPdf}
        pressNumbers={pressNumbers}
        viewMode={viewMode}
        onSetViewMode={handleSetViewMode}
      />
      <main className="flex-1 flex flex-col gap-4 p-4 lg:p-6 overflow-hidden">
        <PressWorkloadPanel
          tasks={tasks}
          scheduleByPress={scheduleByPress}
          productionConditions={productionConditions}
          onPressSelect={handlePressSelect}
          selectedPress={selectedPress}
          onGenerateIdealSchedule={handleGenerateIdealSchedule}
          generatingPressNo={generatingPressNo}
        />
        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
            <div className="lg:w-1/3 flex flex-col pr-2">
              <TaskList
                tasks={filteredTasks}
                onDragStart={handleDragStart}
                onLoadTasks={handleLoadTasks}
                isLoading={isLoadingTasks}
                onScheduleClick={handleScheduleClick}
                shifts={selectedPress !== null ? shiftsByPress[selectedPress] || [] : []}
                isSchedulingDisabled={selectedPress === null}
                productionConditions={productionConditions}
                dieColors={dieColors}
                selectedPress={selectedPress}
              />
            </div>
            <div className="lg:w-2/3 flex-1 overflow-x-auto">
              {viewMode === 'grid' ? (
                <ScheduleGrid
                  shifts={selectedPress !== null ? shiftsByPress[selectedPress] || [] : []}
                  schedule={selectedPress !== null ? scheduleByPress[selectedPress] || {} : {}}
                  onDrop={handleDrop}
                  dieColors={dieColors}
                  selectedPress={selectedPress}
                  onRemoveRequest={handleRemoveRequest}
                  onEditRequest={handleEditRequest}
                />
              ) : (
                <GanttChartView
                  scheduleByPress={scheduleByPress}
                  shiftsByPress={shiftsByPress}
                  dieColors={dieColors}
                  selectedPress={selectedPress}
                />
              )}
            </div>
        </div>
      </main>
      {validationRequest && (
        <ValidationDialog
          request={validationRequest}
          productionConditions={productionConditions}
          shifts={shiftsByPress[validationRequest.pressNo] || []}
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
       <AllScheduledTasksDialog
        open={isAllTasksDialogOpen}
        onOpenChange={setIsAllTasksDialogOpen}
        scheduleByPress={scheduleByPress}
        shiftsByPress={shiftsByPress}
      />
      {taskToRemove && (
        <AlertDialog open onOpenChange={(open) => !open && setTaskToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove task "{taskToRemove.jobCardNumber}" ({taskToRemove.itemCode}) from the schedule. Its time and quantity will be returned. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelRemove}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmRemove}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {taskToEdit && (
          <EditScheduledTaskDialog
              open={!!taskToEdit}
              onOpenChange={handleCancelEdit}
              task={taskToEdit}
              shift={(shiftsByPress[taskToEdit.pressNo] || []).find(s => s.id === taskToEdit.shiftId) || null}
              mainTaskList={tasks}
              productionConditions={productionConditions}
              onUpdate={handleUpdateScheduledTask}
          />
      )}
    </div>
  );
}
