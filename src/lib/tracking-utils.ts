



import type { TrackingStep, TrackingStepName, ModuleSettings, ScheduledTask } from '@/types';
import { addDays, addHours } from 'date-fns';

export const TRACKING_MODULES: TrackingStepName[] = [
    'Molding',
    'Finishing',
    'Inspection',
    'Pre-Dispatch',
    'Dispatch',
    'FG Stock',
    'Feedback'
];

export const DEFAULT_MODULE_SETTINGS: ModuleSettings = {
    Molding: { name: 'Molding', enabled: true, dependsOn: 'scheduled_end_time', tat: 8, tatUnit: 'hours' },
    Finishing: { name: 'Finishing', enabled: true, dependsOn: 'Molding', tat: 1, tatUnit: 'days' },
    Inspection: { name: 'Inspection', enabled: true, dependsOn: 'Finishing', tat: 1, tatUnit: 'days' },
    'Pre-Dispatch': { name: 'Pre-Dispatch', enabled: true, dependsOn: 'Inspection', tat: 1, tatUnit: 'hours' },
    Dispatch: { name: 'Dispatch', enabled: true, dependsOn: 'Pre-Dispatch', tat: 2, tatUnit: 'hours' },
    'FG Stock': { name: 'FG Stock', enabled: true, dependsOn: 'Dispatch', tat: 0, tatUnit: 'hours' },
    Feedback: { name: 'Feedback', enabled: false, dependsOn: 'Dispatch', tat: 7, tatUnit: 'days' },
};

export const createInitialTrackingSteps = (): TrackingStep[] => {
    return TRACKING_MODULES.map(stepName => ({
        stepName: stepName,
        status: 'Pending',
        inputQty: 0,
        outputQty: 0,
        rejectedQty: 0,
        excessQty: 0,
        notes: '',
        satisfactionRating: 0,
    }));
};

export const addTrackingStepsIfNeeded = (task: Omit<ScheduledTask, 'trackingSteps'> & { trackingSteps?: any }): ScheduledTask => {
    let trackingSteps = task.trackingSteps;

    if (!trackingSteps || !Array.isArray(trackingSteps) || trackingSteps.length === 0) {
        trackingSteps = createInitialTrackingSteps();
    }
    
    // Ensure all modules exist, adding missing ones
    TRACKING_MODULES.forEach(moduleName => {
        if (!trackingSteps.some(step => step.stepName === moduleName)) {
            trackingSteps.push({
                stepName: moduleName,
                status: 'Pending',
                inputQty: 0,
                outputQty: 0,
                rejectedQty: 0,
                excessQty: 0,
                notes: '',
                satisfactionRating: 0,
            });
        }
    });

    return { ...task, trackingSteps } as ScheduledTask;
};

export function calculatePlannedEndDates(task: ScheduledTask, settings: ModuleSettings): ScheduledTask {
    const enrichedTask = JSON.parse(JSON.stringify(task));
    const stepEndDates: Record<string, Date> = {
        'scheduled_end_time': new Date(task.endTime)
    };

    const stepMap = new Map(enrichedTask.trackingSteps.map((step: TrackingStep) => [step.stepName, step]));
    
    // Helper to find the nearest active dependency
    const resolveDependency = (stepName: TrackingStepName): TrackingStepName | 'scheduled_end_time' => {
        let currentDependency = settings[stepName].dependsOn;
        // Keep moving up the chain as long as the dependency is a module and it's disabled
        while (currentDependency !== 'scheduled_end_time' && !settings[currentDependency]?.enabled) {
            currentDependency = settings[currentDependency].dependsOn;
        }
        return currentDependency;
    };

    for (const stepName of TRACKING_MODULES) {
        const step = stepMap.get(stepName);
        const config = settings[stepName];

        if (!step || !config || !config.enabled) {
            if (step) {
                step.plannedStartDate = null;
                step.plannedEndDate = null;
            }
            continue;
        }

        // If the step has an actual end date, that's its definitive end.
        if (step.actualEndDate) {
            stepEndDates[stepName] = new Date(step.actualEndDate);
            // If it has an actual start date, use that, otherwise we can't determine it
            step.plannedStartDate = step.actualStartDate ? new Date(step.actualStartDate).toISOString() : null;
            step.plannedEndDate = new Date(step.actualEndDate).toISOString(); // Ensure planned date reflects actual
            continue;
        }

        const effectiveDependency = resolveDependency(stepName);
        const dependencyEndDate = stepEndDates[effectiveDependency];

        if (dependencyEndDate) {
            step.plannedStartDate = dependencyEndDate.toISOString();
            let plannedEndDate;
            if (config.tatUnit === 'days') {
                plannedEndDate = addDays(dependencyEndDate, config.tat);
            } else {
                plannedEndDate = addHours(dependencyEndDate, config.tat);
            }
            step.plannedEndDate = plannedEndDate.toISOString();
            stepEndDates[stepName] = plannedEndDate;
        } else {
            step.plannedStartDate = null;
            step.plannedEndDate = null;
        }
    }

    enrichedTask.trackingSteps = TRACKING_MODULES.map(name => stepMap.get(name)).filter(Boolean);
    return enrichedTask;
}
