
import React from 'react';
import type { ProductionCondition } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, Loader2 } from 'lucide-react';

interface ProductionConditionsPanelProps {
  productionConditions: ProductionCondition[];
  isLoading: boolean;
}

export const ProductionConditionsPanel: React.FC<ProductionConditionsPanelProps> = ({ productionConditions, isLoading }) => {

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className='flex items-center gap-2'>
            <Settings className="w-6 h-6" />
            <CardTitle className="font-headline">Production Conditions</CardTitle>
          </div>
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
