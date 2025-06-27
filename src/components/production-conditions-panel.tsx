
import React, { useState } from 'react';
import type { ProductionCondition } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, Download, Loader2 } from 'lucide-react';

interface ProductionConditionsPanelProps {
  productionConditions: ProductionCondition[];
  onLoadConditions: (url: string) => void;
  isLoading: boolean;
}

export const ProductionConditionsPanel: React.FC<ProductionConditionsPanelProps> = ({ productionConditions, onLoadConditions, isLoading }) => {
  const [url, setUrl] = useState('');

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className='flex items-center gap-2'>
            <Settings className="w-6 h-6" />
            <CardTitle className="font-headline">Production Conditions</CardTitle>
          </div>
        </div>
        <div className="flex w-full items-center space-x-2 pt-4">
          <Input
            type="url"
            placeholder="Manufacturing Details URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
          />
          <Button onClick={() => onLoadConditions(url)} disabled={isLoading || !url}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Load
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-[200px] overflow-y-auto pr-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Press</TableHead>
                <TableHead>Die</TableHead>
                <TableHead>Material</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && productionConditions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : productionConditions.length > 0 ? (
                productionConditions.map((pc, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{pc.itemCode}</TableCell>
                    <TableCell>{pc.pressNo}</TableCell>
                    <TableCell>{pc.dieNo}</TableCell>
                    <TableCell>{pc.material}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No conditions loaded.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
