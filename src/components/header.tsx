
import React from 'react';
import { Factory, Save, Loader2, Settings, Menu, Palette, RefreshCw, Settings2, GanttChartSquare, Download, LayoutGrid, BarChart2, Check, Eye, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu"

interface HeaderProps {
  onSave: () => void;
  isSaving: boolean;
  onOpenIntegrationDialog: () => void;
  onOpenColorSettingsDialog: () => void;
  onOpenProductionConditionsDialog: () => void;
  onOpenScheduleSettingsDialog: () => void;
  onRefreshData: () => void;
  onViewAllTasksClick: () => void;
  onDownloadPdfClick: (pressNo: 'all' | number) => void;
  pressNumbers: number[];
  viewMode: 'grid' | 'gantt';
  onSetViewMode: (mode: 'grid' | 'gantt') => void;
}

export const Header: React.FC<HeaderProps> = ({ 
    onSave, 
    isSaving, 
    onOpenIntegrationDialog, 
    onOpenColorSettingsDialog, 
    onOpenProductionConditionsDialog,
    onOpenScheduleSettingsDialog,
    onRefreshData,
    onViewAllTasksClick,
    onDownloadPdfClick,
    pressNumbers,
    viewMode,
    onSetViewMode
}) => {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-card shadow-sm">
      <div className="flex items-center gap-3">
        <Factory className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground font-headline">
          ProSched
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onViewAllTasksClick}>
            <GanttChartSquare className="mr-2 h-4 w-4" />
            View All
        </Button>
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onDownloadPdfClick('all')}>
                    All Presses
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {pressNumbers.map(pressNo => (
                    <DropdownMenuItem key={pressNo} onClick={() => onDownloadPdfClick(pressNo)}>
                        Press {pressNo}
                    </DropdownMenuItem>
                ))}
                {pressNumbers.length === 0 && <DropdownMenuItem disabled>No presses available</DropdownMenuItem>}
            </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Save className="mr-2 h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Schedule'}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRefreshData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              <span>Refresh Data</span>
            </DropdownMenuItem>
             <DropdownMenuItem onClick={onOpenProductionConditionsDialog}>
              <Settings2 className="mr-2 h-4 w-4" />
              <span>Production Conditions</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    <Eye className="mr-2 h-4 w-4" />
                    <span>View Mode</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => onSetViewMode('grid')}>
                            <LayoutGrid className="mr-2 h-4 w-4" />
                            Grid View
                            {viewMode === 'grid' && <Check className="ml-auto h-4 w-4" />}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onSetViewMode('gantt')}>
                            <BarChart2 className="mr-2 h-4 w-4" />
                            Gantt Chart
                            {viewMode === 'gantt' && <Check className="ml-auto h-4 w-4" />}
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenScheduleSettingsDialog}>
              <CalendarDays className="mr-2 h-4 w-4" />
              <span>Schedule Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenColorSettingsDialog}>
              <Palette className="mr-2 h-4 w-4" />
              <span>Die Color Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenIntegrationDialog}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Integrations</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
