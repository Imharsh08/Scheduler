
'use client';

import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Schedule, ScheduledTask, Shift } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PackageSearch } from 'lucide-react';
import { getDieChartColor } from '@/lib/color-utils';
import { format, startOfWeek, nextDay, setHours, setMinutes, setSeconds, addMinutes } from 'date-fns';

// Helper to get the absolute start date and time of a shift
const dayIndexMap: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const getShiftStartDateTime = (shift: Shift): Date => {
  const now = new Date();
  const thisMonday = startOfWeek(now, { weekStartsOn: 1 });
  const targetDayIndex = dayIndexMap[shift.day];
  
  let shiftDate = nextDay(thisMonday, targetDayIndex);

  if (shiftDate < now && format(shiftDate, 'yyyy-MM-dd') !== format(now, 'yyyy-MM-dd')) {
    shiftDate = nextDay(addMinutes(thisMonday, 10080), targetDayIndex);
  }

  const hours = shift.type === 'Day' ? 8 : 20;
  return setSeconds(setMinutes(setHours(shiftDate, hours), 0), 0);
};

interface GanttChartViewProps {
  scheduleByPress: Record<number, Schedule>;
  shiftsByPress: Record<number, Shift[]>;
  dieColors: Record<number, string>;
  selectedPress: number | null;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const task = data.task as ScheduledTask;

    if (data.type === 'vacant') {
        return (
          <div className="bg-background p-2 border rounded shadow-lg text-sm">
            <p className="font-bold">{task.jobCardNumber}</p>
            <p><span className="font-medium">Shift:</span> {data.shiftLabel}</p>
            <p><span className="font-medium">Available Time:</span> {task.timeTaken} min</p>
          </div>
        );
    }

    return (
      <div className="bg-background p-2 border rounded shadow-lg text-sm">
        <p className="font-bold">{task.jobCardNumber} <span className="font-normal text-muted-foreground">({task.itemCode})</span></p>
        <p><span className="font-medium">Shift:</span> {data.shiftLabel}</p>
        <p><span className="font-medium">Qty:</span> {task.scheduledQuantity}</p>
        <p><span className="font-medium">Time:</span> {format(new Date(task.startTime), 'HH:mm')} - {format(new Date(task.endTime), 'HH:mm')} ({task.timeTaken} min)</p>
      </div>
    );
  }
  return null;
};

export const GanttChartView: React.FC<GanttChartViewProps> = ({
  scheduleByPress,
  shiftsByPress,
  dieColors,
  selectedPress,
}) => {
  const { chartData, yAxisDomain } = useMemo(() => {
    if (selectedPress === null) return { chartData: [], yAxisDomain: [] };

    const pressSchedule = scheduleByPress[selectedPress] || {};
    const pressShifts = shiftsByPress[selectedPress] || [];
    
    const shiftLabelMap = new Map<string, string>();
    pressShifts.forEach(shift => shiftLabelMap.set(shift.id, `${shift.day.substring(0,3)} ${shift.type}`));

    const allScheduledTasks = Object.values(pressSchedule).flat();
    
    let chartDataItems: any[] = [];

    // Map scheduled tasks to chart data
    const taskChartItems = allScheduledTasks.map(task => ({
        type: 'task',
        yAxisLabel: `${task.jobCardNumber} (${shiftLabelMap.get(task.shiftId)})`,
        timeRange: [new Date(task.startTime).getTime(), new Date(task.endTime).getTime()],
        fill: getDieChartColor(task.dieNo, dieColors),
        task,
        shiftLabel: shiftLabelMap.get(task.shiftId) || task.shiftId,
    }));
    chartDataItems.push(...taskChartItems);

    // Map vacant slots
    pressShifts.forEach(shift => {
        if (shift.remainingCapacity > 0) {
            const shiftTasks = allScheduledTasks.filter(t => t.shiftId === shift.id);
            
            let vacantStartTime: Date;
            if (shiftTasks.length > 0) {
                const lastTask = shiftTasks.reduce((latest, current) => 
                    new Date(current.endTime) > new Date(latest.endTime) ? current : latest
                );
                vacantStartTime = new Date(lastTask.endTime);
            } else {
                vacantStartTime = getShiftStartDateTime(shift);
            }

            const vacantEndTime = addMinutes(vacantStartTime, shift.remainingCapacity);
            
            const vacantData = {
                type: 'vacant',
                yAxisLabel: `Vacant (${shiftLabelMap.get(shift.id)})`,
                timeRange: [vacantStartTime.getTime(), vacantEndTime.getTime()],
                fill: '#16a34a', // green-600 for better visibility
                task: { // Fake task object for tooltip
                    jobCardNumber: 'Vacant Time',
                    itemCode: '',
                    scheduledQuantity: 0,
                    timeTaken: shift.remainingCapacity,
                    startTime: vacantStartTime.toISOString(),
                    endTime: vacantEndTime.toISOString(),
                    shiftId: shift.id,
                },
                shiftLabel: shiftLabelMap.get(shift.id) || shift.id,
            };
            chartDataItems.push(vacantData);
        }
    });
    
    chartDataItems.sort((a, b) => {
        if (a.timeRange[0] !== b.timeRange[0]) {
            return a.timeRange[0] - b.timeRange[0];
        }
        return new Date(a.task.endTime).getTime() - new Date(b.task.endTime).getTime();
    });
    
    const yAxisDomain = chartDataItems.map(d => d.yAxisLabel);

    return { chartData: chartDataItems, yAxisDomain };
  }, [selectedPress, scheduleByPress, shiftsByPress, dieColors]);

  const timeTickFormatter = (timestamp: number) => format(new Date(timestamp), 'dd-MMM HH:mm');

  if (selectedPress === null) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-center text-muted-foreground bg-secondary/30 rounded-lg p-8">
        <PackageSearch className="w-16 h-16 mb-4 text-gray-400" />
        <h3 className="text-xl font-semibold mb-2">No Press Selected</h3>
        <p className="max-w-md">Please select a press to view its schedule.</p>
      </div>
    );
  }

  if (chartData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full text-center text-muted-foreground bg-secondary/30 rounded-lg p-8">
            <h3 className="text-xl font-semibold mb-2">No Tasks Scheduled</h3>
            <p className="max-w-md">There are no tasks scheduled for Press {selectedPress} to display in the Gantt chart.</p>
        </div>
      );
  }
  
  return (
    <Card className="shadow-lg h-full flex flex-col">
        <CardHeader>
            <CardTitle className="font-headline">Gantt Chart - Press {selectedPress}</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={timeTickFormatter} />
                <YAxis type="category" dataKey="yAxisLabel" width={150} tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(206, 206, 206, 0.2)'}} />
                <Bar dataKey="timeRange" minPointSize={2}>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>
  );
};
