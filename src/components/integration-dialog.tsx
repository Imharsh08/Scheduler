'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import type { IntegrationUrls } from '@/types';

interface IntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urls: IntegrationUrls;
  onSaveUrls: (newUrls: IntegrationUrls) => void;
}

export const IntegrationDialog: React.FC<IntegrationDialogProps> = ({ open, onOpenChange, urls, onSaveUrls }) => {
  const [localUrls, setLocalUrls] = useState<IntegrationUrls>(urls);

  useEffect(() => {
    setLocalUrls(urls);
  }, [urls]);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalUrls((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSaveUrls(localUrls);
    onOpenChange(false); // Close dialog on save
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-headline">Integrations</DialogTitle>
          <DialogDescription>
            Manage your Google Sheet links here. These are saved in your browser.
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="tasks">Unscheduled Tasks URL</Label>
            <Input
              id="tasks"
              name="tasks"
              placeholder="FMS 2 Sheet URL"
              value={localUrls.tasks}
              onChange={handleUrlChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="conditions">Production Conditions URL</Label>
            <Input
              id="conditions"
              name="conditions"
              placeholder="Manufacturing Details URL"
              value={localUrls.conditions}
              onChange={handleUrlChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="save">Save Schedule URL</Label>
            <Input
              id="save"
              name="save"
              placeholder="Molding Sheet URL"
              value={localUrls.save}
              onChange={handleUrlChange}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            Save Links
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
