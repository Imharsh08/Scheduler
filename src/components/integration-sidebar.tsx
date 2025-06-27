
'use client';

import React, { useState, useEffect } from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import type { IntegrationUrls } from '@/types';

interface IntegrationSidebarProps {
  urls: IntegrationUrls;
  onSaveUrls: (newUrls: IntegrationUrls) => void;
}

export const IntegrationSidebar: React.FC<IntegrationSidebarProps> = ({ urls, onSaveUrls }) => {
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
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <h2 className="text-lg font-semibold font-headline">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Manage your Google Sheet links here.
        </p>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarGroup>
          <div className="space-y-4 p-2">
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
        </SidebarGroup>
      </SidebarContent>
      <Separator />
      <div className="p-4">
        <Button onClick={handleSave} className="w-full">
          <Save className="mr-2 h-4 w-4" />
          Save All Links
        </Button>
      </div>
    </Sidebar>
  );
};
