
'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, isWithinInterval } from 'date-fns';
import type { Schedule, Shift, ScheduledTask } from '@/types';

interface PdfParams {
    pressNo: 'all' | number;
    scheduleByPress: Record<number, Schedule>;
    shiftsByPress: Record<number, Shift[]>;
    scheduleHorizon: 'weekly' | 'monthly';
    weeksInMonth: { start: Date; end: Date }[];
    currentWeek: number;
}

const getShiftInfo = (shiftId: string, pressNo: number, shiftsByPress: Record<number, Shift[]>) => {
    const shiftsForPress = shiftsByPress[pressNo] || [];
    const shift = shiftsForPress.find(s => s.id === shiftId);
    return shift ? { day: shift.day, type: shift.type } : { day: 'Unknown', type: '' };
};

export const generateSchedulePdf = ({
    pressNo,
    scheduleByPress,
    shiftsByPress,
    scheduleHorizon,
    weeksInMonth,
    currentWeek,
}: PdfParams) => {
    if (typeof window === 'undefined') return;

    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
    });
    
    let title: string;
    let filename: string;

    if (scheduleHorizon === 'monthly' && weeksInMonth.length > 0) {
        const interval = weeksInMonth[currentWeek];
        const weekStr = `Week of ${format(interval.start, 'MMM d')} - ${format(interval.end, 'MMM d')}`;
        title = `Schedule - ${weekStr} - ${pressNo === 'all' ? 'All Presses' : `Press ${pressNo}`}`;
        filename = `schedule-press-${pressNo === 'all' ? 'all' : pressNo}-week-${currentWeek + 1}.pdf`;
    } else {
        title = `Weekly Schedule - ${pressNo === 'all' ? 'All Presses' : `Press ${pressNo}`}`;
        filename = `schedule-press-${pressNo === 'all' ? 'all' : pressNo}-weekly.pdf`;
    }

    doc.setFontSize(16);
    doc.text(title, 40, 50);

    const head = [['Press', 'Date', 'Shift', 'Start', 'End', 'Job Card #', 'Item Code', 'Die #', 'Priority', 'Qty']];
    const body = [];

    const pressesToInclude = pressNo === 'all' ? Object.keys(scheduleByPress).map(Number) : [pressNo];

    let allTasks: ScheduledTask[] = [];
    for (const pNo of pressesToInclude) {
        const pressSchedule = scheduleByPress[pNo];
        if (pressSchedule) {
            allTasks.push(...Object.values(pressSchedule).flat());
        }
    }

    // Filter tasks based on horizon
    if (scheduleHorizon === 'monthly' && weeksInMonth.length > 0 && currentWeek < weeksInMonth.length) {
        const interval = weeksInMonth[currentWeek];
        allTasks = allTasks.filter(task => {
            const taskDate = new Date(task.startTime);
            return isWithinInterval(taskDate, interval);
        });
    }

    allTasks.sort((a, b) => {
        if (a.pressNo !== b.pressNo) return a.pressNo - b.pressNo;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    for (const task of allTasks) {
        const { type } = getShiftInfo(task.shiftId, task.pressNo, shiftsByPress);
        body.push([
            task.pressNo,
            format(new Date(task.startTime), 'dd MMM'),
            type,
            format(new Date(task.startTime), 'hh:mm a'),
            format(new Date(task.endTime), 'hh:mm a'),
            task.jobCardNumber,
            task.itemCode,
            task.dieNo,
            task.priority,
            task.scheduledQuantity,
        ]);
    }

    if (body.length === 0) {
        doc.setFontSize(12);
        doc.text("No tasks scheduled for the selected press(es) and period.", 40, 70);
    } else {
        autoTable(doc, {
            head: head,
            body: body,
            startY: 60,
            headStyles: { fillColor: [34, 197, 94] }, // A green color
            theme: 'grid',
            styles: { fontSize: 8 },
        });
    }
    
    doc.save(filename);
};
