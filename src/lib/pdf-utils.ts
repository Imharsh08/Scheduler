
'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import type { Schedule, Shift } from '@/types';

const getShiftInfo = (shiftId: string, pressNo: number, shiftsByPress: Record<number, Shift[]>) => {
    const shiftsForPress = shiftsByPress[pressNo] || [];
    const shift = shiftsForPress.find(s => s.id === shiftId);
    return shift ? { day: shift.day, type: shift.type } : { day: 'Unknown', type: '' };
};

export const generateSchedulePdf = (
    pressNo: 'all' | number,
    scheduleByPress: Record<number, Schedule>,
    shiftsByPress: Record<number, Shift[]>
) => {
    if (typeof window === 'undefined') return;

    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4'
    });

    const title = pressNo === 'all' ? 'Weekly Schedule - All Presses' : `Weekly Schedule - Press ${pressNo}`;
    doc.setFontSize(16);
    doc.text(title, 40, 50);

    const head = [['Press', 'Day', 'Shift', 'Start Time', 'End Time', 'Job Card #', 'Item Code', 'Die #', 'Priority', 'Quantity']];
    const body = [];

    const pressesToInclude = pressNo === 'all' ? Object.keys(scheduleByPress).map(Number) : [pressNo];

    let allTasks = [];
    for (const pNo of pressesToInclude) {
        const pressSchedule = scheduleByPress[pNo];
        if (pressSchedule) {
            allTasks.push(...Object.values(pressSchedule).flat());
        }
    }

    allTasks.sort((a, b) => {
        if (a.pressNo !== b.pressNo) return a.pressNo - b.pressNo;
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    for (const task of allTasks) {
        const { day, type } = getShiftInfo(task.shiftId, task.pressNo, shiftsByPress);
        body.push([
            task.pressNo,
            day,
            type,
            format(new Date(task.startTime), 'HH:mm'),
            format(new Date(task.endTime), 'HH:mm'),
            task.jobCardNumber,
            task.itemCode,
            task.dieNo,
            task.priority,
            task.scheduledQuantity,
        ]);
    }

    if (body.length === 0) {
        doc.setFontSize(12);
        doc.text("No tasks scheduled for the selected press(es).", 40, 70);
    } else {
        autoTable(doc, {
            head: head,
            body: body,
            startY: 60,
            headStyles: { fillColor: [22, 163, 74] },
            theme: 'grid',
            styles: { fontSize: 8 },
        });
    }

    const filename = pressNo === 'all' ? 'schedule-all-presses.pdf' : `schedule-press-${pressNo}.pdf`;
    doc.save(filename);
};
