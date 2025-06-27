import { NextResponse, type NextRequest } from 'next/server';
import type { ScheduledTask } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sheetUrl, schedule } = body;

    if (!sheetUrl || !schedule) {
      return NextResponse.json({ error: 'Sheet URL and schedule data are required' }, { status: 400 });
    }

    const scheduledTasks: Partial<ScheduledTask>[] = Object.values(schedule as Record<string, ScheduledTask[]>).flat().map((task) => ({
      jobCardNumber: task.jobCardNumber,
      itemCode: task.itemCode,
      material: task.material,
      scheduledQuantity: task.scheduledQuantity,
      pressNo: task.pressNo,
      dieNo: task.dieNo,
      timeTaken: task.timeTaken,
      shiftId: task.shiftId,
      startTime: task.startTime,
      endTime: task.endTime,
    }));

    if(scheduledTasks.length === 0) {
        return NextResponse.json({ result: "Success", count: 0, message: "No tasks to save." });
    }

    const response = await fetch(sheetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(scheduledTasks),
      redirect: 'follow', 
    });

    const responseText = await response.text();
    
    if (!response.ok) {
        try {
            const errorJson = JSON.parse(responseText);
            return NextResponse.json({ error: 'Failed to save to Google Sheet.', details: errorJson.error || responseText }, { status: response.status });
        } catch (e) {
            return NextResponse.json({ error: 'Failed to save to Google Sheet.', details: responseText }, { status: response.status });
        }
    }
    
    try {
        const data = JSON.parse(responseText);
        return NextResponse.json(data);
    } catch(e) {
        return NextResponse.json({ result: responseText });
    }

  } catch (error) {
    console.error('Proxy save error:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'An unexpected server error occurred while saving.', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
