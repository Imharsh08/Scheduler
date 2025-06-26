import React from 'react';
import type { ProductionCondition } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Settings } from 'lucide-react';

interface ProductionConditionsPanelProps {
  productionConditions: ProductionCondition[];
}

export const ProductionConditionsPanel: React.FC<ProductionConditionsPanelProps> = ({ productionConditions }) => {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div className='flex items-center gap-2'>
                <Settings className="w-6 h-6" />
                <CardTitle className="font-headline">Production Conditions</CardTitle>
            </div>
            <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Upload Sheet
            </Button>
        </div>
      </CardHeader>
      <CardContent>
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
            {productionConditions.map((pc, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{pc.itemCode}</TableCell>
                <TableCell>{pc.pressNo}</TableCell>
                <TableCell>{pc.dieNo}</TableCell>
                <TableCell>{pc.material}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
