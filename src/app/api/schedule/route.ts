import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sheetUrl, tasks } = body;

    if (!sheetUrl || !tasks) {
      return NextResponse.json({ error: 'Sheet URL and tasks data are required' }, { status: 400 });
    }
    
    if (!Array.isArray(tasks)) {
      return NextResponse.json({ error: 'Tasks data must be an array' }, { status: 400 });
    }

    const scriptPayload = { tasks };

    // Proxy the request to Google Apps Script by redirecting to the tracking API route
    const trackingApiUrl = new URL('/api/tracking', request.url);
    
    const proxyResponse = await fetch(trackingApiUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sheetUrl, tasks }),
    });

    const responseData = await proxyResponse.json();
    
    if (!proxyResponse.ok) {
        return NextResponse.json(responseData, { status: proxyResponse.status });
    }
    
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Proxy save error:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'An unexpected server error occurred while saving.', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
