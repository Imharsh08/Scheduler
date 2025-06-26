import React from 'react';
import { Factory } from 'lucide-react';

export const Header = () => {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-primary/10">
      <div className="flex items-center gap-3">
        <Factory className="w-8 h-8 text-primary-foreground" />
        <h1 className="text-2xl font-bold text-primary-foreground font-headline">
          ProSched
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {/* Placeholder for future actions like Save or User Profile */}
      </div>
    </header>
  );
};
