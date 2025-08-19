
'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import type { ProductionCondition } from '@/types';

interface ProductionConditionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productionConditions: ProductionCondition[];
  isLoading: boolean;
}

export const ProductionConditionsDialog: React.FC<ProductionConditionsDialogProps> = ({
  open,
  onOpenChange,
  productionConditions,
  isLoading,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="font-headline">Production Conditions</DialogTitle>
          <DialogDescription>
            A complete list of all loaded production conditions for scheduling.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[60vh] pr-6">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Item Code</TableHead>
                <TableHead>Material</TableHead>
                <TableHead className="text-center">Press</TableHead>
                <TableHead className="text-center">Die</TableHead>
                <TableHead className="text-center">Cure Time (min)</TableHead>
                <TableHead className="text-center">Pcs/Hour (1 Side)</TableHead>
                <TableHead className="text-center">Pcs/Hour (2 Side)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && productionConditions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : productionConditions.length > 0 ? (
                productionConditions.map((pc, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{pc.itemCode}</TableCell>
                    <TableCell>{pc.material}</TableCell>
                    <TableCell className="text-center">{pc.pressNo}</TableCell>
                    <TableCell className="text-center">{pc.dieNo}</TableCell>
                    <TableCell className="text-center">{pc.cureTime}</TableCell>
                    <TableCell className="text-center">{pc.piecesPerHour1}</TableCell>
                    <TableCell className="text-center">{pc.piecesPerHour2}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No conditions loaded. Use the Refresh Data option in the menu.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
