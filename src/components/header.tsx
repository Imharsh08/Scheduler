
import React from 'react';
import { Factory, Save, Loader2, Settings, Menu, Palette, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface HeaderProps {
  onSave: () => void;
  isSaving: boolean;
  onOpenIntegrationDialog: () => void;
  onOpenColorSettingsDialog: () => void;
  onRefreshData: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSave, isSaving, onOpenIntegrationDialog, onOpenColorSettingsDialog, onRefreshData }) => {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-card shadow-sm">
      <div className="flex items-center gap-3">
        <Factory className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold text-foreground font-headline">
          ProSched
        </h1>
      </div>
      <div className="flex items-center gap-4">
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
            <DropdownMenuItem onClick={onOpenIntegrationDialog}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Integrations</span>
            </DropdownMenuItem>
             <DropdownMenuItem onClick={onRefreshData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              <span>Refresh Data</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenColorSettingsDialog}>
              <Palette className="mr-2 h-4 w-4" />
              <span>Color Settings</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
