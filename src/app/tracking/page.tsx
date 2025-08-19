

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Factory, Settings2, Loader2, ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from "@/hooks/use-toast";
import type { ScheduledTask, IntegrationUrls, ModuleSettings } from '@/types';
import { TrackingTable } from '@/components/tracking-table';
import { ModuleSettingsDialog } from '@/components/module-settings-dialog';
import { TrackingUpdateDialog } from '@/components/tracking-update-dialog';
import { DEFAULT_MODULE_SETTINGS, addTrackingStepsIfNeeded, calculatePlannedEndDates } from '@/lib/tracking-utils';

const processResponse = async (res: Response, name: string) => {
    const text = await res.text();
    if (!res.ok) {
        try {
            const errorJson = JSON.parse(text);
            throw new Error(errorJson.error || `Failed to fetch ${name}`);
        } catch (e) {
             throw new Error(`Failed to fetch ${name}. Status: ${res.status}`);
        }
    }
    try {
        return JSON.parse(text);
    } catch (error) {
        throw new Error(`Failed to parse response for ${name}.`);
    }
};

export default function TrackingPage() {
    const [tasks, setTasks] = useState<ScheduledTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [urls, setUrls] = useState<IntegrationUrls | null>(null);
    const [settings, setSettings] = useState<ModuleSettings>(DEFAULT_MODULE_SETTINGS);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    const [selectedTask, setSelectedTask] = useState<{task: ScheduledTask, step: string} | null>(null);

    const { toast } = useToast();

    useEffect(() => {
        const savedSettings = localStorage.getItem('moduleSettings');
        if (savedSettings) {
            setSettings(JSON.parse(savedSettings));
        }

        const savedUrls = localStorage.getItem('integrationUrls');
        if (savedUrls) {
            const parsedUrls = JSON.parse(savedUrls);
            setUrls(parsedUrls);
            if (parsedUrls.scheduledTasks) {
                fetchTasks(parsedUrls.scheduledTasks, savedSettings ? JSON.parse(savedSettings) : DEFAULT_MODULE_SETTINGS);
            } else {
                setIsLoading(false);
                toast({ title: "Configuration Missing", description: "Saved schedule URL not found. Please configure it on the main page.", variant: "destructive" });
            }
        } else {
            setIsLoading(false);
            toast({ title: "Configuration Needed", description: "Please configure integration URLs on the main page first.", variant: "destructive" });
        }
    }, []);

    const fetchTasks = async (sheetUrl: string, currentSettings: ModuleSettings) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/tasks?url=${encodeURIComponent(sheetUrl)}`);
            const data = await processResponse(res, 'Saved Schedule');
            if (Array.isArray(data)) {
                const processedTasks = data
                    .map(task => addTrackingStepsIfNeeded(task))
                    .map(task => calculatePlannedEndDates(task, currentSettings))
                    .map(task => ({
                        ...task,
                        trackingSteps: task.trackingSteps.map(step => ({...step, isSaved: true}))
                    })); // Mark all initial steps as saved
                setTasks(processedTasks);
            }
        } catch (error) {
            toast({ title: "Error fetching tasks", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSaveSettings = (newSettings: ModuleSettings) => {
        setSettings(newSettings);
        localStorage.setItem('moduleSettings', JSON.stringify(newSettings));
        
        // Recalculate planned dates for all tasks with new settings
        setTasks(prevTasks => prevTasks.map(task => calculatePlannedEndDates(task, newSettings)));

        toast({ title: "Settings Saved", description: "Your tracking modules have been updated." });
        setIsSettingsOpen(false);
    };
    
    const handleSaveTrackingData = async () => {
        const saveUrl = urls?.tracking || urls?.save;
        if (!saveUrl) {
            toast({
                title: 'Save URL Not Set',
                description: 'Please provide the Save or Tracking URL in the Integration settings on the main page.',
                variant: 'destructive',
            });
            return;
        }
        
        setIsSaving(true);
        try {
            const response = await fetch('/api/tracking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  sheetUrl: saveUrl,
                  tasks: tasks,
                }),
            });
            
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || result.details || 'Failed to save tracking data.');
            }

            // Mark all steps as saved
            setTasks(currentTasks => currentTasks.map(task => ({
                ...task,
                trackingSteps: task.trackingSteps.map(step => ({ ...step, isSaved: true }))
            })));
            
            toast({
                title: "Tracking Data Saved",
                description: result.message || `Successfully updated tracking data in your sheet.`,
            });
        } catch (error) {
            console.error("Failed to save tracking data:", error);
            const description = error instanceof Error ? error.message : "An unknown error occurred.";
            toast({
                title: "Error Saving Tracking Data",
                description: description,
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateTask = (taskId: string, stepName: string, updatedStepData: any) => {
        setTasks(prevTasks =>
            prevTasks.map(task => {
                if (task.id === taskId) {
                    const newTrackingSteps = task.trackingSteps.map(step =>
                        step.stepName === stepName ? { ...step, ...updatedStepData, isSaved: false } : step
                    );
                    const updatedTask = { ...task, trackingSteps: newTrackingSteps };
                    // Recalculate dates since an actual date might have changed a dependency
                    return calculatePlannedEndDates(updatedTask, settings);
                }
                return task;
            })
        );
        toast({ title: 'Update Successful', description: `Task ${stepName} status has been updated.` });
        setSelectedTask(null);
    };

    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
             <header className="flex items-center justify-between p-4 border-b bg-card shadow-sm">
                <div className="flex items-center gap-3">
                    <Factory className="w-8 h-8 text-primary" />
                    <h1 className="text-2xl font-bold text-foreground font-headline">
                    Production Tracking
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                     <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
                        <Settings2 className="mr-2 h-4 w-4" />
                        Module Settings
                    </Button>
                    <Button onClick={handleSaveTrackingData} disabled={isSaving}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>}
                        {isSaving ? "Saving..." : "Save Tracking Data"}
                    </Button>
                    <Link href="/" passHref>
                        <Button>
                           <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Scheduler
                        </Button>
                    </Link>
                </div>
            </header>

            <main className="flex-1 flex flex-col p-4 lg:p-6 overflow-hidden">
                {isLoading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : (
                    <TrackingTable
                        tasks={tasks}
                        settings={settings}
                        onUpdateClick={(task, step) => setSelectedTask({task, step})}
                    />
                )}
            </main>
            
            <ModuleSettingsDialog
                open={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
                currentSettings={settings}
                onSave={handleSaveSettings}
            />

            {selectedTask && (
                <TrackingUpdateDialog
                    open={!!selectedTask}
                    onOpenChange={() => setSelectedTask(null)}
                    task={selectedTask.task}
                    stepName={selectedTask.step as any}
                    settings={settings}
                    onUpdate={handleUpdateTask}
                />
            )}
        </div>
    );
}
