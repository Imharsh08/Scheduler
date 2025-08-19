
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
import { Download, Loader2 } from 'lucide-react';
import type { IntegrationUrls } from '@/types';

interface IntegrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  urls: IntegrationUrls;
  onLoadFromSheet: (configUrl: string) => Promise<IntegrationUrls | null>;
}

export const IntegrationDialog: React.FC<IntegrationDialogProps> = ({
  open,
  onOpenChange,
  urls,
  onLoadFromSheet,
}) => {
  const [configUrl, setConfigUrl] = useState(urls.config);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setConfigUrl(urls.config);
  }, [urls, open]);

  const handleLoad = async () => {
    setIsLoading(true);
    const result = await onLoadFromSheet(configUrl);
    if (result) {
      onOpenChange(false);
    }
    setIsLoading(false);
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-headline">Integrations</DialogTitle>
          <DialogDescription>
            Load your integration links from a central Google Sheet. This is saved in your browser.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="config">Configuration URL</Label>
            <div className="flex gap-2">
              <Input
                id="config"
                name="config"
                placeholder="Google Apps Script URL for 'Web Url' sheet"
                value={configUrl}
                onChange={(e) => setConfigUrl(e.target.value)}
              />
              <Button onClick={handleLoad} disabled={isLoading || !configUrl}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Load & Fetch
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4 pt-4">
            <h4 className="text-sm font-medium text-muted-foreground">Loaded Links</h4>
             <div className="space-y-2">
                <Label htmlFor="tasks">Unscheduled Tasks URL</Label>
                <Input id="tasks" value={urls.tasks} readOnly placeholder="Load from config..."/>
             </div>
             <div className="space-y-2">
                <Label htmlFor="scheduledTasks">Saved Schedule URL</Label>
                <Input id="scheduledTasks" value={urls.scheduledTasks} readOnly placeholder="Load from config..."/>
             </div>
             <div className="space-y-2">
                <Label htmlFor="conditions">Production Conditions URL</Label>
                <Input id="conditions" value={urls.conditions} readOnly placeholder="Load from config..."/>
             </div>
             <div className="space-y-2">
                <Label htmlFor="save">Save Schedule URL</Label>
                <Input id="save" value={urls.save} readOnly placeholder="Load from config..."/>
             </div>
             <div className="space-y-2">
                <Label htmlFor="tracking">Save Tracking URL</Label>
                <Input id="tracking" value={urls.tracking || ''} readOnly placeholder="Load from config..."/>
             </div>
        </div>
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
