import React from 'react';
import { Factory, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onSave: () => void;
  isSaving: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onSave, isSaving }) => {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-primary/10">
      <div className="flex items-center gap-3">
        <Factory className="w-8 h-8 text-primary-foreground" />
        <h1 className="text-2xl font-bold text-primary-foreground font-headline">
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
      </div>
    </header>
  );
};
