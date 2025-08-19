

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/header';
import { TaskList } from '@/components/task-list';
import { ScheduleGrid } from '@/components/schedule-grid';
import { PressWorkloadPanel } from '@/components/press-workload-panel';
import { ValidationDialog } from '@/components/validation-dialog';
import type { Task, Shift, Schedule, ProductionCondition, ScheduledTask, ValidationRequest, IntegrationUrls, FGStockItem, AppSettings } from '@/types';
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
import { ScheduleSettingsDialog } from '@/components/schedule-settings-dialog';
import { Button } from '@/components/ui/button';
import { addTrackingStepsIfNeeded } from '@/lib/tracking-utils';
import { MaintenanceTaskDialog } from '@/components/maintenance-task-dialog';
import { getShiftStartDateTime, getShiftEndDateTime, getShiftCapacityInMinutes } from '@/lib/time-utils';
import { 
    startOfWeek, 
    endOfWeek, 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval, 
    format, 
    isSameDay, 
    getDay,
    parseISO,
    addMinutes,
    addDays,
    isWithinInterval,
    isBefore,
    startOfDay,
    isValid,
} from 'date-fns';

const DEFAULT_SETTINGS: AppSettings = {
  scheduleHorizon: 'weekly',
  holidays: [],
  includeToday: false,
  dayShiftStart: '08:00',
  dayShiftEnd: '20:00',
  nightShiftStart: '20:00',
  nightShiftEnd: '08:00', // Ends on the next day
  defaultMaintenanceDuration: 30,
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [shiftsByPress, setShiftsByPress] = useState<Record<number, Shift[]>>({});
  const [scheduleByPress, setScheduleByPress] = useState<Record<number, Schedule>>({});
  const [savedScheduleSnapshot, setSavedScheduleSnapshot] = useState<Record<number, Schedule>>({});
  const [productionConditions, setProductionConditions] = useState<ProductionCondition[]>([]);
  const [validationRequest, setValidationRequest] = useState<ValidationRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPress, setSelectedPress] = useState<number | null>(null);
  const [selectedDie, setSelectedDie] = useState<number | null>(null);
  const { toast } = useToast();

  const [urls, setUrls] = useState<IntegrationUrls>({
    config: '',
    tasks: '',
    conditions: '',
    save: '',
    scheduledTasks: '',
    tracking: '',
  });

  const [isIntegrationDialogOpen, setIsIntegrationDialogOpen] = useState(false);
  const [isColorSettingsDialogOpen, setIsColorSettingsDialogOpen] = useState(false);
  const [isProductionConditionsDialogOpen, setIsProductionConditionsDialogOpen] = useState(false);
  const [isAllTasksDialogOpen, setIsAllTasksDialogOpen] = useState(false);
  const [isScheduleSettingsDialogOpen, setIsScheduleSettingsDialogOpen] = useState(false);
  const [isMaintenanceDialogOpen, setIsMaintenanceDialogOpen] = useState(false);
  const [dieColors, setDieColors] = useState<Record<number, string>>({});
  
  const [taskToRemove, setTaskToRemove] = useState<ScheduledTask | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<ScheduledTask | null>(null);
  const [generatingPressNo, setGeneratingPressNo] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'gantt'>('grid');

  const [currentWeek, setCurrentWeek] = useState(0);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [tempSettings, setTempSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [fgStock, setFgStock] = useState<FGStockItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // This effect runs once on mount to load settings from localStorage
    const loadInitialSettings = async () => {
      setIsLoading(true);
      try {
        const savedUrls = localStorage.getItem('integrationUrls');
        if (savedUrls) {
          const parsedUrls: IntegrationUrls = JSON.parse(savedUrls);
          setUrls(parsedUrls);
          if (parsedUrls.tasks && parsedUrls.conditions && parsedUrls.scheduledTasks) {
              await handleInitialDataLoad(parsedUrls);
          } else if (parsedUrls.config) {
              await handleLoadUrlsFromSheet(parsedUrls.config, true); // silent=true
          } else {
              setIsIntegrationDialogOpen(true);
              setIsLoading(false);
          }
        } else {
          setIsIntegrationDialogOpen(true);
          setIsLoading(false);
        }

        const savedColors = localStorage.getItem('dieColors');
        if (savedColors) setDieColors(JSON.parse(savedColors));
        
        const savedViewMode = localStorage.getItem('viewMode') as 'grid' | 'gantt' | null;
        if (savedViewMode) setViewMode(savedViewMode);
      
        const savedAppSettings = localStorage.getItem('appSettings');
        if (savedAppSettings) {
            const parsedSettings: AppSettings = JSON.parse(savedAppSettings);
            parsedSettings.holidays = parsedSettings.holidays.map((d: any) => parseISO(d));
            setAppSettings(parsedSettings);
            setTempSettings(parsedSettings);
        } else {
            setTempSettings(DEFAULT_SETTINGS);
        }

      } catch (error) {
        console.error("Failed to load data from localStorage", error);
        setTimeout(() => toast({ title: "Error", description: "Failed to load initial settings.", variant: "destructive" }), 0);
        setIsLoading(false);
      }
    };

    loadInitialSettings();
  }, []); // Run only once

  useEffect(() => {
    setCurrentWeek(0);
  }, [appSettings.scheduleHorizon]);

  const generateShiftsForHorizon = (settings: AppSettings) => {
      const { scheduleHorizon, holidays, dayShiftStart, dayShiftEnd, nightShiftStart, nightShiftEnd } = settings;
      const today = new Date();
      const startOfToday = startOfDay(today);
      const interval = scheduleHorizon === 'weekly' 
          ? { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) }
          : { start: startOfMonth(today), end: endOfMonth(today) };

      let daysInInterval = eachDayOfInterval(interval);
      if (!settings.includeToday) {
        daysInInterval = daysInInterval.filter(day => !isSameDay(day, startOfToday));
      } else {
        daysInInterval = daysInInterval.filter(day => !isBefore(day, startOfToday));
      }
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const generatedShifts: Shift[] = [];

      daysInInterval.forEach(day => {
          const isHoliday = holidays.some(holiday => isSameDay(day, holiday));
          if (isHoliday) return;

          const dayName = dayNames[getDay(day)];
          const dateStr = format(day, 'yyyy-MM-dd');
          
          const dayCapacity = getShiftCapacityInMinutes(dayShiftStart, dayShiftEnd);
          generatedShifts.push({ id: `${dateStr}-day`, date: dateStr, day: dayName, type: 'Day', capacity: dayCapacity, remainingCapacity: dayCapacity, startTime: dayShiftStart, endTime: dayShiftEnd });
          
          const nightCapacity = getShiftCapacityInMinutes(nightShiftStart, nightShiftEnd);
          generatedShifts.push({ id: `${dateStr}-night`, date: dateStr, day: dayName, type: 'Night', capacity: nightCapacity, remainingCapacity: nightCapacity, startTime: nightShiftStart, endTime: nightShiftEnd });
      });
      return generatedShifts;
  };

  useEffect(() => {
      const pressNosFromConditions = productionConditions.map(pc => pc.pressNo);
      const pressNosFromSchedule = Object.keys(scheduleByPress).map(Number);
      const pressNos = [...new Set([...pressNosFromConditions, ...pressNosFromSchedule])].sort((a,b) => a - b);
      
      if (pressNos.length === 0) {
          setShiftsByPress({});
          return;
      }
      
      const baseShifts = generateShiftsForHorizon(appSettings);
      const newShiftsByPress: Record<number, Shift[]> = {};

      pressNos.forEach(pressNo => {
          const pressShifts = JSON.parse(JSON.stringify(baseShifts));
          const pressSchedule = scheduleByPress[pressNo] || {};

          Object.values(pressSchedule).flat().forEach(task => {
              const shift = pressShifts.find((s: Shift) => s.id === task.shiftId);
              if (shift) {
                  shift.remainingCapacity -= task.timeTaken;
              }
          });
          newShiftsByPress[pressNo] = pressShifts;
      });

      setShiftsByPress(newShiftsByPress);
  }, [productionConditions, appSettings, scheduleByPress]);

  const weeksInMonth = useMemo(() => {
    if (appSettings.scheduleHorizon !== 'monthly') return [];
    const today = new Date();
    const start = startOfMonth(today);
    const end = endOfMonth(today);
    
    const weeks = [];
    let weekStart = startOfWeek(start, { weekStartsOn: 1 });
    
    while (weekStart <= end) {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        weeks.push({ start: weekStart, end: weekEnd });
        weekStart = addDays(weekStart, 7);
    }
    return weeks;
  }, [appSettings.scheduleHorizon]);

  const displayedShifts = useMemo(() => {
    if (selectedPress === null) return [];
    const allShifts = shiftsByPress[selectedPress] || [];
    
    if (appSettings.scheduleHorizon === 'weekly') {
        return allShifts;
    }

    if (weeksInMonth.length > 0 && currentWeek < weeksInMonth.length) {
        const currentWeekInterval = weeksInMonth[currentWeek];
        return allShifts.filter(shift => {
            const shiftDate = new Date(shift.date + 'T12:00:00Z');
            return isWithinInterval(shiftDate, currentWeekInterval);
        });
    }

    return [];
  }, [selectedPress, shiftsByPress, appSettings.scheduleHorizon, weeksInMonth, currentWeek]);

  const processResponse = async (res: Response, name: string) => {
    const text = await res.text();
    
    if (!res.ok) {
        try {
            const errorJson = JSON.parse(text);
            const errorMessage = errorJson.error || `Failed to fetch ${name}`;
            const errorDetails = errorJson.details || `No further details provided.`;
            throw new Error(`${errorMessage} - Details: ${errorDetails}`);
        } catch (e) {
            if (text.trim().toLowerCase().startsWith('<!doctype html>')) {
                throw new Error(`Authentication Error for ${name}: Received a login page instead of data. Please ensure your Google Apps Script is deployed with "Who has access" set to "Anyone".`);
            }
            throw new Error(`Failed to fetch ${name}. Status: ${res.status}. Details: ${text.substring(0, 200)}...`);
        }
    }
    
    try {
        const data = JSON.parse(text);
        return data;
    } catch (error) {
        throw new Error(`Failed to parse the response for ${name}. The response was not valid JSON. Details: ${text.substring(0, 500)}...`);
    }
  };

  const handleInitialDataLoad = async (urlsToLoad: IntegrationUrls) => {
    setIsLoading(true);
    setTimeout(() => toast({ title: "Loading Data", description: "Fetching latest schedule..." }), 0);

    try {
        // ========= STAGE 1: Load saved schedule and render it immediately =========
        const scheduledTasksRes = await fetch(`/api/tasks?url=${encodeURIComponent(urlsToLoad.scheduledTasks)}`);
        const savedScheduleData = await processResponse(scheduledTasksRes, 'Saved Schedule');

        const newScheduleByPress: Record<number, Schedule> = {};
        const scheduledQuantities: Record<string, number> = {};
        const newFgStock: FGStockItem[] = [];

        if (Array.isArray(savedScheduleData)) {
            savedScheduleData.forEach((task: any) => {
                const enrichedTask = addTrackingStepsIfNeeded(task);
                if (!task.pressNo || !task.shiftId) return;
                if (!newScheduleByPress[task.pressNo]) newScheduleByPress[task.pressNo] = {};
                if (!newScheduleByPress[task.pressNo][task.shiftId]) newScheduleByPress[task.pressNo][task.shiftId] = [];

                const taskWithType = { ...enrichedTask, id: task.id || `${task.jobCardNumber}-${task.pressNo}-${Date.now()}-${Math.floor(Math.random() * 1000)}`, isSaved: true, type: 'production' as const, scheduledQuantity: Math.ceil(task.scheduledQuantity) };
                newScheduleByPress[task.pressNo][task.shiftId].push(taskWithType);
                
                if (task.jobCardNumber) {
                    scheduledQuantities[task.jobCardNumber] = (scheduledQuantities[task.jobCardNumber] || 0) + Math.ceil(task.scheduledQuantity);
                }

                const inspectionStep = enrichedTask.trackingSteps.find(s => s.stepName === 'Inspection');
                if (inspectionStep && inspectionStep.excessQty > 0) {
                    newFgStock.push({ itemCode: enrichedTask.itemCode, quantity: inspectionStep.excessQty, sourceJobCard: enrichedTask.jobCardNumber, creationDate: new Date().toISOString() });
                }
            });
        }
        setScheduleByPress(newScheduleByPress);
        setSavedScheduleSnapshot(JSON.parse(JSON.stringify(newScheduleByPress)));
        setFgStock(newFgStock);
        
        setTimeout(() => toast({ title: "Schedule Loaded", description: "Fetching unscheduled tasks..." }), 0);

        // ========= STAGE 2: Load conditions and unscheduled tasks in parallel =========
        const [conditionsData, tasksData] = await Promise.all([
            processResponse(await fetch(`/api/tasks?url=${encodeURIComponent(urlsToLoad.conditions)}`), 'Production Conditions'),
            processResponse(await fetch(`/api/tasks?url=${encodeURIComponent(urlsToLoad.tasks)}`), 'Unscheduled Tasks')
        ]);
        
        const fetchedConditions: ProductionCondition[] = (Array.isArray(conditionsData) ? conditionsData : []).map((item: any) => {
            const cureTimeInSeconds = Number(item.cureTime) || 0;
            const cureTimeInMinutes = cureTimeInSeconds > 0 ? Math.ceil(cureTimeInSeconds / 60) : 0;
            return {
                itemCode: item.itemCode,
                pressNo: item.pressNo,
                dieNo: item.dieNo,
                material: item.material,
                piecesPerHour1: item.piecesPerHour1 || 0,
                piecesPerHour2: item.piecesPerHour2 || 0,
                cureTime: cureTimeInMinutes,
                maintenanceAfterQty: item.maintenanceAfterQty || undefined,
            };
        });
        setProductionConditions(fetchedConditions);
        
        // ========= STAGE 3: Process unscheduled tasks and update the UI =========
        const fgStockByItemCode: Record<string, number> = newFgStock.reduce((acc, item) => {
          acc[item.itemCode] = (acc[item.itemCode] || 0) + item.quantity;
          return acc;
        }, {});

        const fetchedTasks: Task[] = (Array.isArray(tasksData) ? tasksData : []).map((item: any) => {
            const alreadyScheduled = scheduledQuantities[item.jobCardNumber] || 0;
            const availableStock = fgStockByItemCode[item.itemCode] || 0;
            const neededQty = item.orderedQuantity - alreadyScheduled;
            const stockToUse = Math.min(neededQty, availableStock);
            
            fgStockByItemCode[item.itemCode] -= stockToUse;
            
            const creationDate = new Date(item.creationDate);
            const deliveryDate = item.deliveryDate ? new Date(item.deliveryDate) : null;

            return {
              jobCardNumber: item.jobCardNumber,
              orderedQuantity: item.orderedQuantity,
              itemCode: item.itemCode,
              material: item.material,
              remainingQuantity: Math.ceil(neededQty - stockToUse),
              priority: item.priority || 'None',
              creationDate: isValid(creationDate) ? creationDate.toISOString() : new Date().toISOString(),
              deliveryDate: deliveryDate && isValid(deliveryDate) ? deliveryDate.toISOString() : null,
              taskType: 'production',
              fgStockConsumed: stockToUse,
            }
        }).filter((task: Task) => task.remainingQuantity > 0);
        setTasks(fetchedTasks);
        
        setTimeout(() => toast({ title: "Success", description: "All data loaded and synchronized." }), 0);

    } catch (error) {
        console.error("Failed to load initial data:", error);
        setTimeout(() => toast({ title: "Data Load Error", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" }), 0);
    } finally {
        setIsLoading(false);
    }
}


  const handleSetViewMode = (mode: 'grid' | 'gantt') => {
    setViewMode(mode);
    try {
        localStorage.setItem('viewMode', mode);
    } catch (error) {
        console.error("Failed to save view mode to localStorage", error);
        setTimeout(() => toast({
            title: "Could not save view setting",
            description: "Your browser may be preventing saving to local storage.",
            variant: "destructive"
        }), 0);
    }
  };
  
  const handleSaveScheduleSettings = () => {
    setAppSettings(tempSettings);
    try {
      localStorage.setItem('appSettings', JSON.stringify(tempSettings));
      setTimeout(() => toast({
        title: "Settings Saved",
        description: "Your schedule settings have been updated.",
      }), 0);
    } catch (error) {
       console.error("Failed to save schedule settings to localStorage", error);
       setTimeout(() => toast({
        title: "Error Saving Settings",
        description: "Could not save settings to your browser's local storage.",
        variant: "destructive",
      }), 0);
    }
  };

  const handleOpenScheduleSettings = () => {
    setTempSettings(appSettings);
    setIsScheduleSettingsDialogOpen(true);
  };
  
  const handleLoadUrlsFromSheet = async (configUrl: string, silent = false) => {
    if (!configUrl) {
      if (!silent) setTimeout(() => toast({ title: "URL Required", description: "Please enter the Configuration URL.", variant: "destructive" }), 0);
      return null;
    }
    try {
      const data = await processResponse(await fetch(`/api/tasks?url=${encodeURIComponent(configUrl)}`), 'Configuration Sheet');
      
      const newUrls: IntegrationUrls = {
        config: configUrl,
        tasks: data.tasks || '',
        conditions: data.conditions || '',
        save: data.save || '',
        scheduledTasks: data.scheduledTasks || data.scheduled || '', // Support both keys
        tracking: data.tracking || '',
      };

      setUrls(newUrls);
      localStorage.setItem('integrationUrls', JSON.stringify(newUrls));

      if (newUrls.tasks && newUrls.conditions && (newUrls.save || newUrls.tracking) && newUrls.scheduledTasks) {
          await handleInitialDataLoad(newUrls);
          if (!silent) setTimeout(() => toast({ title: "Configuration Loaded", description: "All data has been loaded successfully." }), 0);
          return newUrls;
      } else {
          const requiredKeys = ['tasks', 'conditions', 'scheduledTasks'];
          if (!newUrls.save && !newUrls.tracking) requiredKeys.push('save/tracking');

          const missingKeys = requiredKeys.filter(k => !newUrls[k as keyof IntegrationUrls]);
          if (!silent) setTimeout(() => toast({ title: "Configuration Incomplete", description: `Your 'Web Url' sheet is missing required keys: ${missingKeys.join(', ')}.`, variant: "destructive" }), 0);
          return null;
      }

    } catch (error) {
      console.error("Failed to load URLs from sheet:", error);
      if (!silent) setTimeout(() => toast({ title: "Error Loading Configuration", description: error instanceof Error ? error.message : "An unknown error occurred.", variant: "destructive" }), 0);
      return null;
    }
  };

  const handleSaveDieColors = (newColors: Record<number, string>) => {
    setDieColors(newColors);
    try {
      localStorage.setItem('dieColors', JSON.stringify(newColors));
      setTimeout(() => toast({
        title: "Colors Saved",
        description: "Your die color settings have been updated.",
      }), 0);
    } catch (error) {
      console.error("Failed to save colors to localStorage", error);
      setTimeout(() => toast({
        title: "Error Saving Colors",
        description: "Could not save color settings to your browser's local storage.",
        variant: "destructive",
      }), 0);
    }
  };

  const handleSaveSchedule = async () => {
    if (selectedPress === null) {
      setTimeout(() => toast({
        title: 'Select a Press',
        description: 'Please select a press to save its schedule.',
        variant: 'destructive',
      }), 0);
      return;
    }

    const currentPressSchedule = scheduleByPress[selectedPress] || {};
    const savedPressSchedule = savedScheduleSnapshot[selectedPress] || {};

    if (JSON.stringify(currentPressSchedule) === JSON.stringify(savedPressSchedule)) {
      setTimeout(() => toast({
        title: 'No Changes to Save',
        description: `The schedule for Press ${selectedPress} is already up-to-date.`,
      }), 0);
      return;
    }

    const saveUrl = urls.tracking || urls.save;
    if (!saveUrl) {
      setTimeout(() => toast({
        title: 'Save URL Not Set',
        description: 'Please provide the Save or Tracking URL in the Integration settings.',
        variant: 'destructive',
      }), 0);
      return;
    }
    
    // This now sends the full scheduled task object, including tracking steps.
    const tasksToSaveForPress = Object.values(currentPressSchedule).flat();

    setIsSaving(true);
    try {
      // The save-tracking script can now handle an object with a 'tasks' array.
      const payload = {
        sheetUrl: saveUrl,
        tasks: tasksToSaveForPress,
      };

      const response = await fetch('/api/tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || result.details || 'Failed to save schedule.');
      }

      // Update snapshot for the saved press
      setSavedScheduleSnapshot(currentSnapshot => {
        const newSnapshot = JSON.parse(JSON.stringify(currentSnapshot));
        newSnapshot[selectedPress] = JSON.parse(JSON.stringify(currentPressSchedule));
        return newSnapshot;
      });

      // Mark tasks for the saved press as 'isSaved'
      setScheduleByPress(currentSchedules => {
        const newSchedules = JSON.parse(JSON.stringify(currentSchedules));
        if (newSchedules[selectedPress]) {
            Object.keys(newSchedules[selectedPress]).forEach(shiftId => {
                newSchedules[selectedPress][shiftId] = newSchedules[selectedPress][shiftId].map((t: ScheduledTask) => ({...t, isSaved: true}));
            });
        }
        return newSchedules;
      });

      setTimeout(() => toast({
        title: `Schedule Saved for Press ${selectedPress}`,
        description: result.message || `Successfully updated schedule in your sheet.`,
      }), 0);
    } catch (error) {
      console.error("Failed to save schedule:", error);
      const description = error instanceof Error ? error.message : "An unknown error occurred.";
      setTimeout(() => toast({
        title: "Error Saving Schedule",
        description: description,
        variant: "destructive",
      }), 0);
    } finally {
      setIsSaving(false);
    }
  };


  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
  };
  
  const handleScheduledTaskDragStart = (e: React.DragEvent<HTMLDivElement>, task: ScheduledTask) => {
    const dragData = {
        type: 'move_task',
        taskJson: JSON.stringify(task),
    };
    e.dataTransfer.setData('application/json', JSON.stringify(dragData));
  };
  
  const recalculateShiftTasks = (tasks: ScheduledTask[], shift: Shift): { updatedTasks: ScheduledTask[], totalTime: number } => {
    const sortedTasks = [...tasks].sort((a, b) => {
        const aDate = parseISO(a.startTime);
        const bDate = parseISO(b.startTime);
        if (aDate.getTime() !== bDate.getTime()) {
            return aDate.getTime() - bDate.getTime();
        }
        return a.jobCardNumber.localeCompare(b.jobCardNumber);
    });
    
    let cumulativeTime = 0;
    const shiftStart = getShiftStartDateTime(shift);

    const updatedTasks = sortedTasks.map(task => {
        const newStartTime = addMinutes(shiftStart, cumulativeTime);
        const newEndTime = addMinutes(newStartTime, task.timeTaken);
        cumulativeTime += task.timeTaken;
        return {
            ...task,
            startTime: newStartTime.toISOString(),
            endTime: newEndTime.toISOString(),
            shiftId: shift.id, 
        };
    });

    return { updatedTasks, totalTime: cumulativeTime };
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetShiftId: string) => {
    e.preventDefault();
    if (selectedPress === null) {
        setTimeout(() => toast({ title: "Select a Press First", description: "Please select a press from the workload panel to schedule a task.", variant: "destructive" }), 0);
        return;
    }
  
    const json_data = e.dataTransfer.getData('application/json');
    
    if (json_data) {
        try {
            const data = JSON.parse(json_data);
            if (data.type === 'move_task') {
                const movedTask: ScheduledTask = JSON.parse(data.taskJson);
                const sourceShiftId = movedTask.shiftId;
        
                if (sourceShiftId === targetShiftId) return;
        
                const allShiftsForPress = shiftsByPress[selectedPress] || [];
                const targetShift = allShiftsForPress.find(s => s.id === targetShiftId);
                const sourceShift = allShiftsForPress.find(s => s.id === sourceShiftId);
        
                if (!targetShift || !sourceShift) {
                    setTimeout(() => toast({ title: "Error", description: "Could not find source or target shift.", variant: "destructive" }), 0);
                    return;
                }
        
                if (targetShift.remainingCapacity < movedTask.timeTaken) {
                    setTimeout(() => toast({ title: "Cannot Move Task", description: `Not enough capacity in ${targetShift.day} ${targetShift.type} shift.`, variant: "destructive" }), 0);
                    return;
                }

                setScheduleByPress(currentSchedules => {
                    const newSchedules = JSON.parse(JSON.stringify(currentSchedules));
                    const pressSchedule = newSchedules[selectedPress!] || {};
                    let sourceTasks = pressSchedule[sourceShiftId] || [];
                    let targetTasks = pressSchedule[targetShiftId] || [];
                    sourceTasks = sourceTasks.filter((t: ScheduledTask) => t.id !== movedTask.id);
                    targetTasks.push({ ...movedTask, isSaved: false });
                    const { updatedTasks: updatedSourceTasks } = recalculateShiftTasks(sourceTasks, sourceShift);
                    const { updatedTasks: updatedTargetTasks } = recalculateShiftTasks(targetTasks, targetShift);
                    pressSchedule[sourceShiftId] = updatedSourceTasks;
                    pressSchedule[targetShiftId] = updatedTargetTasks;
                    newSchedules[selectedPress!] = pressSchedule;
                    return newSchedules;
                });
                setTimeout(() => toast({ title: "Task Moved", description: `Task ${movedTask.jobCardNumber} moved successfully.` }), 0);
                return;
            }
        } catch (error) {
            console.error("Error parsing dragged data", error);
        }
    }
    
    const taskId = e.dataTransfer.getData('text/plain');
    const task = tasks.find((t) => t.jobCardNumber === taskId);
    
    const pressShifts = shiftsByPress[selectedPress] || [];
    const shift = pressShifts.find((s) => s.id === targetShiftId);

    if (task && shift) {
        if (task.taskType === 'maintenance') {
            handleScheduleMaintenanceTask(task, shift, selectedPress);
            return;
        }

        const isTaskValidForPress = productionConditions.some(
            pc => pc.itemCode === task.itemCode && pc.pressNo === selectedPress
        );

        if (!isTaskValidForPress) {
            setTimeout(() => toast({
                title: "Incompatible Task",
                description: `Task for item ${task.itemCode} cannot be run on Press ${selectedPress}.`,
                variant: "destructive"
            }), 0);
            return;
        }
        setValidationRequest({ task, shift, pressNo: selectedPress });
    }
};

const handleScheduleMaintenanceTask = (task: Task, shift: Shift, pressNo: number) => {
    if (!task.timeTaken || !task.dieNo) return;

    if (task.timeTaken > shift.remainingCapacity) {
        toast({
            title: 'Cannot Schedule Maintenance',
            description: `Not enough capacity. Requires ${task.timeTaken} min, but only ${shift.remainingCapacity} min left.`,
            variant: 'destructive',
        });
        return;
    }

    const scheduledTasksInShift = scheduleByPress[pressNo]?.[shift.id] || [];
    const isDieAlreadyInMaintenance = scheduledTasksInShift.some(
        st => st.type === 'maintenance' && st.dieNo === task.dieNo
    );

    if (isDieAlreadyInMaintenance) {
        toast({
            title: 'Duplicate Maintenance Task',
            description: `Die ${task.dieNo} already has a maintenance task in this shift.`,
            variant: 'destructive',
        });
        return;
    }

    setScheduleByPress(current => {
        const newSchedules = JSON.parse(JSON.stringify(current));
        if (!newSchedules[pressNo]) {
            newSchedules[pressNo] = {};
        }
        const pressSchedule = newSchedules[pressNo];

        const newMaintenanceTask: ScheduledTask = {
            id: `${task.jobCardNumber}-${pressNo}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            jobCardNumber: task.jobCardNumber,
            type: 'maintenance',
            itemCode: task.itemCode,
            pressNo: pressNo,
            dieNo: task.dieNo,
            scheduledQuantity: 0,
            timeTaken: task.timeTaken,
            shiftId: shift.id,
            startTime: '', // Will be calculated by recalculateShiftTasks
            endTime: '', // Will be calculated by recalculateShiftTasks
            creationDate: task.creationDate,
            isSaved: false,
            trackingSteps: addTrackingStepsIfNeeded({}).trackingSteps,
        };
        
        const { updatedTasks } = recalculateShiftTasks(
            [...(pressSchedule[shift.id] || []), newMaintenanceTask],
            shift
        );
        pressSchedule[shift.id] = updatedTasks;

        return newSchedules;
    });

    setTasks(prevTasks => prevTasks.filter(t => t.jobCardNumber !== task.jobCardNumber));
};

  const handlePressSelect = (pressNo: number | null) => {
    setSelectedPress(pressNo);
    setSelectedDie(null);
  };
  
  const handleDieSelect = (dieNo: number | null) => {
    setSelectedDie(dieNo);
  }

  const handleScheduleClick = (task: Task, shiftId: string) => {
    if (selectedPress === null) {
        setTimeout(() => toast({
            title: "Select a Press First",
            description: "Please select a press from the workload panel to schedule a task.",
            variant: "destructive"
        }), 0);
        return;
    }

    const pressShifts = shiftsByPress[selectedPress] || [];
    const shift = pressShifts.find((s) => s.id === shiftId);

    if (shift) {
         setValidationRequest({ task, shift, pressNo: selectedPress });
    } else {
         setTimeout(() => toast({
            title: "Shift Not Found",
            description: "The selected shift could not be found for the current press.",
            variant: "destructive"
        }), 0);
    }
  };

  const filteredTasks = React.useMemo(() => {
    let baseTasks = tasks;
    
    if (searchQuery) {
        const lowerCaseQuery = searchQuery.toLowerCase();
        baseTasks = baseTasks.filter(task => 
            task.jobCardNumber.toLowerCase().includes(lowerCaseQuery) ||
            task.itemCode.toLowerCase().includes(lowerCaseQuery)
        );
    }

    if (selectedPress === null) {
      return baseTasks.filter(t => t.taskType !== 'maintenance');
    }
    
    // Base filter: tasks compatible with the selected press
    const validItemCodesForPress = new Set(
        productionConditions
            .filter(pc => pc.pressNo === selectedPress)
            .map(pc => pc.itemCode)
    );

    const validDiesForPress = new Set(
        productionConditions.filter(pc => pc.pressNo === selectedPress).map(pc => pc.dieNo)
    );

    let pressFilteredTasks = baseTasks.filter(task => {
        if (task.taskType === 'maintenance') {
            return task.dieNo !== undefined && validDiesForPress.has(task.dieNo);
        }
        return validItemCodesForPress.has(task.itemCode);
    });

    // If a die is also selected, apply a second layer of filtering
    if (selectedDie !== null) {
        // Get all item codes that can be produced with the selected die on the selected press
        const validItemCodesForDie = new Set(
            productionConditions
                .filter(pc => pc.pressNo === selectedPress && pc.dieNo === selectedDie)
                .map(pc => pc.itemCode)
        );

        pressFilteredTasks = pressFilteredTasks.filter(task => {
            if (task.taskType === 'maintenance') {
                return task.dieNo === selectedDie;
            }
            return validItemCodesForDie.has(task.itemCode);
        });
    }

    return pressFilteredTasks;
  }, [tasks, selectedPress, selectedDie, productionConditions, searchQuery]);


  const handleValidationSuccess = (
    scheduledItems: Omit<ScheduledTask, 'id' | 'isSaved' | 'trackingSteps'>[],
  ) => {
    if (!validationRequest) return;
    const { task, pressNo: pressToUpdate } = validationRequest;

    let totalQuantityScheduled = 0;
    
    setScheduleByPress(current => {
      const newSchedules = JSON.parse(JSON.stringify(current));
      const pressSchedule = newSchedules[pressToUpdate] || {};
      
      const newScheduledTasksWithIds: ScheduledTask[] = [];
      scheduledItems.forEach(item => {
        if (item.type === 'production') {
            totalQuantityScheduled += item.scheduledQuantity;
        }
        const newId = `${item.jobCardNumber}-${item.pressNo}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        newScheduledTasksWithIds.push({ 
            ...item, 
            id: newId, 
            isSaved: false,
            trackingSteps: addTrackingStepsIfNeeded({}).trackingSteps,
        });
      });

      newScheduledTasksWithIds.forEach(scheduledTask => {
        const { updatedTasks } = recalculateShiftTasks(
            [...(pressSchedule[scheduledTask.shiftId] || []), scheduledTask],
            shiftsByPress[pressToUpdate].find(s => s.id === scheduledTask.shiftId)!
        );
        pressSchedule[scheduledTask.shiftId] = updatedTasks;
      });

      newSchedules[pressToUpdate] = pressSchedule;
      return newSchedules;
    });

    setTasks((prevTasks) =>
      prevTasks
        .map((t) =>
          t.jobCardNumber === task.jobCardNumber
            ? { ...t, remainingQuantity: Math.ceil(t.remainingQuantity - totalQuantityScheduled) }
            : t
        )
        .filter((t) => t.remainingQuantity > 0)
    );
    
    setValidationRequest(null);
  };

  const handleRefreshData = () => {
    if (urls.config || (urls.tasks && urls.conditions && urls.scheduledTasks)) {
        handleInitialDataLoad(urls);
    } else {
        setTimeout(() => toast({ title: "Configuration Needed", description: "Please set your integration URLs first.", variant: "destructive" }), 0);
    }
  };

  const pressNumbers = React.useMemo(() => {
    const pressNosFromConditions = productionConditions.map(pc => pc.pressNo);
    const pressNosFromSchedule = Object.keys(scheduleByPress).map(Number);
    return [...new Set([...pressNosFromConditions, ...pressNosFromSchedule])].sort((a,b) => a - b);
  }, [productionConditions, scheduleByPress]);

  const handleDownloadPdf = (pressNo: 'all' | number) => {
    generateSchedulePdf({
        pressNo, 
        scheduleByPress, 
        shiftsByPress,
        scheduleHorizon: appSettings.scheduleHorizon,
        weeksInMonth,
        currentWeek,
    });
  }

  const handleRemoveRequest = (task: ScheduledTask) => {
    setTaskToRemove(task);
  };

  const handleConfirmRemove = () => {
    if (!taskToRemove) return;

    const { pressNo, shiftId, scheduledQuantity, jobCardNumber } = taskToRemove;
    
    setScheduleByPress(currentSchedules => {
        const newSchedules = JSON.parse(JSON.stringify(currentSchedules));
        const pressSchedule = newSchedules[pressNo] || {};
        const sourceShift = pressSchedule[shiftId] || [];
        
        const remainingTasksInShift = sourceShift.filter((t: ScheduledTask) => t.id !== taskToRemove.id);
        const shiftInfo = shiftsByPress[pressNo].find(s => s.id === shiftId)!;
        
        const { updatedTasks } = recalculateShiftTasks(remainingTasksInShift, shiftInfo);
        pressSchedule[shiftId] = updatedTasks;
        
        newSchedules[pressNo] = pressSchedule;
        return newSchedules;
    });

    if (taskToRemove.type === 'production') {
        setTasks(currentTasks => {
            const existingTaskIndex = currentTasks.findIndex(t => t.jobCardNumber === jobCardNumber);
            if (existingTaskIndex > -1) {
                return currentTasks.map((task, index) => {
                    if (index === existingTaskIndex) {
                        return { ...task, remainingQuantity: Math.ceil(task.remainingQuantity + scheduledQuantity) };
                    }
                    return task;
                });
            } else {
                const { itemCode, material, priority, creationDate, deliveryDate, orderedQuantity } = taskToRemove;
                return [
                    ...currentTasks,
                    {
                        jobCardNumber,
                        itemCode: itemCode!,
                        material: material!,
                        priority: priority!,
                        orderedQuantity: orderedQuantity!,
                        remainingQuantity: Math.ceil(scheduledQuantity),
                        creationDate: creationDate!,
                        deliveryDate,
                        taskType: 'production',
                    }
                ];
            }
        });
    } else if (taskToRemove.type === 'maintenance') {
        setTasks(currentTasks => {
            const { jobCardNumber, itemCode, timeTaken, dieNo, creationDate } = taskToRemove;
            const newMaintenanceTask: Task = {
                jobCardNumber,
                itemCode: itemCode!,
                material: 'N/A',
                orderedQuantity: 0,
                remainingQuantity: 1,
                priority: 'High',
                creationDate,
                taskType: 'maintenance',
                timeTaken,
                dieNo,
            };
            return [newMaintenanceTask, ...currentTasks];
        });
    }

    setTimeout(() => toast({ title: "Task Removed", description: `Task ${jobCardNumber} has been removed from the schedule.` }), 0);
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

    const { pressNo, shiftId, scheduledQuantity: oldQty } = taskToEdit;
    const { scheduledQuantity: newQty } = updatedDetails;
    if (newQty === undefined) return;
    
    const qtyDifference = newQty - oldQty;
    const returnedQuantity = -qtyDifference; 

    setScheduleByPress(current => {
        const newSchedules = JSON.parse(JSON.stringify(current));
        const pressSchedule = newSchedules[pressNo] || {};
        const shiftTasks = (pressSchedule[shiftId] || []).map((t: ScheduledTask) =>
            t.id === taskToEdit.id ? { ...t, ...updatedDetails, isSaved: false } : t
        );
        const shiftInfo = shiftsByPress[pressNo].find(s => s.id === shiftId)!;
        const { updatedTasks } = recalculateShiftTasks(shiftTasks, shiftInfo);
        pressSchedule[shiftId] = updatedTasks;
        
        newSchedules[pressNo] = pressSchedule;
        return newSchedules;
    });

    setTasks(currentTasks => {
      const jobCardNumber = taskToEdit.jobCardNumber;
      const existingTaskIndex = currentTasks.findIndex(t => t.jobCardNumber === jobCardNumber);
      
      if (existingTaskIndex > -1) {
        const updatedTasks = currentTasks.map((task, index) => {
          if (index === existingTaskIndex) {
            return {
              ...task,
              remainingQuantity: Math.ceil(task.remainingQuantity + returnedQuantity),
            };
          }
          return task;
        });
        return updatedTasks.filter(t => t.remainingQuantity > 0);
      } else {
        if (returnedQuantity > 0) {
            const { itemCode, material, priority, creationDate, deliveryDate, orderedQuantity } = taskToEdit;
            const newTask: Task = {
                jobCardNumber,
                itemCode: itemCode!,
                material: updatedDetails.material || material!,
                priority: priority!,
                orderedQuantity: orderedQuantity!,
                remainingQuantity: Math.ceil(returnedQuantity),
                creationDate,
                deliveryDate,
                taskType: 'production',
            };
            return [...currentTasks, newTask];
        }
        return currentTasks;
      }
    });

    setTimeout(() => toast({ title: "Task Updated", description: `Task ${taskToEdit.jobCardNumber} has been adjusted.` }), 0);
    setTaskToEdit(null);
  };

  const handleGenerateIdealSchedule = async (pressNo: number) => {
    setGeneratingPressNo(pressNo);
    setTimeout(() => toast({
        title: `Generating schedule for Press ${pressNo}...`,
        description: "This may take a moment. Please wait.",
    }), 0);

    await new Promise(resolve => setTimeout(resolve, 100));

    try {
        const taskPool = new Map<string, Task>();
        tasks.forEach(task => {
            if (task.taskType === 'production') {
                taskPool.set(task.jobCardNumber, JSON.parse(JSON.stringify(task)));
            }
        });

        const scheduledTasksOnPress = scheduleByPress[pressNo] ? Object.values(scheduleByPress[pressNo]).flat() : [];
        scheduledTasksOnPress.forEach(st => {
            if (st.type === 'production') {
                if (taskPool.has(st.jobCardNumber)) {
                    taskPool.get(st.jobCardNumber)!.remainingQuantity += st.scheduledQuantity;
                } else {
                    taskPool.set(st.jobCardNumber, {
                        jobCardNumber: st.jobCardNumber,
                        orderedQuantity: st.orderedQuantity!,
                        itemCode: st.itemCode!,
                        material: st.material!,
                        remainingQuantity: st.scheduledQuantity,
                        priority: st.priority!,
                        creationDate: st.creationDate,
                        deliveryDate: st.deliveryDate,
                        taskType: 'production'
                    });
                }
            }
        });

        const tasksToSchedule = Array.from(taskPool.values());

        let freshShiftsForPress = generateShiftsForHorizon(appSettings);

        if (!appSettings.includeToday) {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            freshShiftsForPress = freshShiftsForPress.filter(s => s.date !== todayStr);
        }
        
        const { newSchedule, remainingTasks } = await generateIdealSchedule({
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
        setTasks(remainingTasks.map(t => ({...t, remainingQuantity: Math.ceil(t.remainingQuantity)})));
        
        setTimeout(() => toast({
            title: "Schedule Generated Successfully",
            description: `A new optimized schedule has been created for Press ${pressNo}.`,
        }), 0);

    } catch (error) {
        console.error("Failed to generate ideal schedule:", error);
        setTimeout(() => toast({
            title: "Error Generating Schedule",
            description: error instanceof Error ? error.message : "An unknown error occurred.",
            variant: "destructive",
        }), 0);
    } finally {
        setGeneratingPressNo(null);
    }
  };

  const handleProductionConditionUpdate = (updatedCondition: ProductionCondition) => {
    setProductionConditions(currentConditions => {
        const index = currentConditions.findIndex(c => 
            c.itemCode === updatedCondition.itemCode &&
            c.pressNo === updatedCondition.pressNo &&
            c.dieNo === updatedCondition.dieNo &&
            c.material === updatedCondition.material
        );
        if (index > -1) {
            const newConditions = [...currentConditions];
            newConditions[index] = updatedCondition;
            setTimeout(() => toast({
                title: "Production Data Updated",
                description: `In-memory data for ${updatedCondition.itemCode} has been updated for this session.`
            }), 0);
            return newConditions;
        }
        return currentConditions;
    });
  };

  const handleCreateMaintenanceTask = (pressNo: number, dieNo: number, duration: number, reason: string) => {
    const newTask: Task = {
        jobCardNumber: `MAINT-${dieNo}-${Date.now()}`,
        taskType: 'maintenance',
        itemCode: reason, // Use itemCode to store the reason
        material: 'N/A',
        orderedQuantity: 0,
        remainingQuantity: 1, // Represents one maintenance task
        priority: 'High',
        creationDate: new Date().toISOString(),
        timeTaken: duration,
        dieNo: dieNo,
    };

    setTasks(prev => [newTask, ...prev]);
    setIsMaintenanceDialogOpen(false);
  };
  
  const handleUpdateMaintenanceDuration = (duration: number) => {
    setTempSettings(prev => ({ ...prev, defaultMaintenanceDuration: duration }));
    // Note: The duration is saved along with other settings when the main "Save" button is clicked.
  }


  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      <Header
        onSave={handleSaveSchedule}
        isSaving={isSaving}
        onOpenIntegrationDialog={() => setIsIntegrationDialogOpen(true)}
        onOpenColorSettingsDialog={() => setIsColorSettingsDialogOpen(true)}
        onOpenProductionConditionsDialog={() => setIsProductionConditionsDialogOpen(true)}
        onOpenScheduleSettingsDialog={handleOpenScheduleSettings}
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
          onDieSelect={handleDieSelect}
          selectedDie={selectedDie}
        />
        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
            <div className="lg:w-1/3 flex flex-col overflow-y-auto pr-2">
              <TaskList
                tasks={filteredTasks}
                onDragStart={handleDragStart}
                isLoading={isLoading}
                onScheduleClick={handleScheduleClick}
                shifts={selectedPress !== null ? shiftsByPress[selectedPress] || [] : []}
                isSchedulingDisabled={selectedPress === null}
                productionConditions={productionConditions}
                dieColors={dieColors}
                selectedPress={selectedPress}
                onAddMaintenanceClick={() => setIsMaintenanceDialogOpen(true)}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            </div>
            <div className="lg:w-2/3 flex-1 flex flex-col gap-2 overflow-hidden">
               {viewMode === 'grid' && appSettings.scheduleHorizon === 'monthly' && weeksInMonth.length > 1 && (
                <div className="flex items-center gap-2 bg-card p-2 rounded-lg border shadow-sm flex-wrap">
                    <p className="text-sm font-medium mr-2">Week:</p>
                    {weeksInMonth.map((week, index) => (
                        <Button
                            key={index}
                            variant={currentWeek === index ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentWeek(index)}
                        >
                            {format(week.start, 'd')} - {format(week.end, 'MMM d')}
                        </Button>
                    ))}
                </div>
               )}
              <div className="flex-1 overflow-auto">
                  {viewMode === 'grid' ? (
                    <ScheduleGrid
                      shifts={displayedShifts}
                      schedule={selectedPress !== null ? scheduleByPress[selectedPress] || {} : {}}
                      onDrop={handleDrop}
                      dieColors={dieColors}
                      selectedPress={selectedPress}
                      onRemoveRequest={handleRemoveRequest}
                      onEditRequest={handleEditRequest}
      onTaskDragStart={handleScheduledTaskDragStart}
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
        </div>
      </main>
      {validationRequest && (
        <ValidationDialog
          open={!!validationRequest}
          onOpenChange={(open) => !open && setValidationRequest(null)}
          request={validationRequest}
          productionConditions={productionConditions}
          shifts={shiftsByPress[validationRequest.pressNo] || []}
          onClose={() => setValidationRequest(null)}
          onSuccess={handleValidationSuccess}
          onConditionUpdate={handleProductionConditionUpdate}
          defaultMaintenanceDuration={appSettings.defaultMaintenanceDuration}
        />
      )}
      <IntegrationDialog
        open={isIntegrationDialogOpen}
        onOpenChange={setIsIntegrationDialogOpen}
        urls={urls}
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
        isLoading={isLoading}
      />
      <ScheduleSettingsDialog
        open={isScheduleSettingsDialogOpen}
        onOpenChange={setIsScheduleSettingsDialogOpen}
        settings={tempSettings}
        onSettingsChange={setTempSettings}
        onSave={handleSaveScheduleSettings}
      />
       <AllScheduledTasksDialog
        open={isAllTasksDialogOpen}
        onOpenChange={setIsAllTasksDialogOpen}
        scheduleByPress={scheduleByPress}
        shiftsByPress={shiftsByPress}
        scheduleHorizon={appSettings.scheduleHorizon}
        weeksInMonth={weeksInMonth}
        currentWeek={currentWeek}
      />
      <MaintenanceTaskDialog
        open={isMaintenanceDialogOpen}
        onOpenChange={setIsMaintenanceDialogOpen}
        productionConditions={productionConditions}
        presses={pressNumbers}
        onCreate={handleCreateMaintenanceTask}
        selectedPress={selectedPress}
        defaultDuration={appSettings.defaultMaintenanceDuration}
        onDefaultDurationChange={handleUpdateMaintenanceDuration}
      />
      {taskToRemove && (
        <AlertDialog open onOpenChange={(open) => !open && setTaskToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove task "{taskToRemove.jobCardNumber}" from the schedule. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelRemove}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmRemove}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      {taskToEdit && taskToEdit.type === 'production' && (
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

    