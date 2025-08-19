
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sheetUrl, tasks } = body;

    if (!sheetUrl || !tasks) {
      return NextResponse.json({ error: 'Sheet URL and tasks data are required' }, { status: 400 });
    }
    
    // The save tracking script can now handle an object or an array.
    // For consistency, we send the array of tasks directly if that's what we get.
    // If we get an object with a 'tasks' property, we send that instead.
    const payloadToSend = Array.isArray(tasks) ? tasks : tasks.tasks;

    if (!Array.isArray(payloadToSend)) {
      return NextResponse.json({ error: 'Tasks data must be an array' }, { status: 400 });
    }

    // Proxy the request to Google Apps Script
    const response = await fetch(sheetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payloadToSend), // Send the correct array
      redirect: 'follow', 
    });

    const responseText = await response.text();
    
    if (!response.ok) {
        try {
            const errorJson = JSON.parse(responseText);
            return NextResponse.json({ error: 'Failed to save tracking data to Google Sheet.', details: errorJson.error || responseText }, { status: response.status });
        } catch (e) {
            return NextResponse.json({ error: 'Failed to save tracking data to Google Sheet.', details: responseText }, { status: response.status });
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
        return NextResponse.json({ error: 'An unexpected server error occurred while saving tracking data.', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
