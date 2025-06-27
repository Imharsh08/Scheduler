
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sheetUrl = searchParams.get('url');

  if (!sheetUrl) {
    return NextResponse.json({ error: 'Sheet URL is required' }, { status: 400 });
  }

  try {
    // Fetch data from the provided Google Apps Script URL
    const response = await fetch(sheetUrl, {
        headers: {
            'Accept': 'application/json',
        }
    });

    const text = await response.text();
    
    if (!response.ok) {
        console.error('Error from Google Apps Script:', text);
        // Try to parse as JSON for a structured error, otherwise return the text
        try {
            const errorJson = JSON.parse(text);
            return NextResponse.json({ error: `Failed to fetch from Google Sheet. Status: ${response.status}`, details: errorJson.error || text }, { status: response.status });
        } catch (e) {
            return NextResponse.json({ error: `Failed to fetch from Google Sheet. Status: ${response.status}`, details: text }, { status: response.status });
        }
    }

    // Attempt to parse the successful response as JSON
    try {
        const data = JSON.parse(text);
        return NextResponse.json(data);
    } catch (error) {
        console.error('JSON parsing error:', error);
        return NextResponse.json({ error: 'Failed to parse the response from Google Sheet. The response was not valid JSON.', details: text.substring(0, 500) + '...' }, { status: 500 });
    }

  } catch (error) {
    console.error('Proxy fetch error:', error);
    if (error instanceof Error) {
        return NextResponse.json({ error: 'An unexpected server error occurred.', details: error.message }, { status: 500 });
    }
    return NextResponse.json({ error: 'An unexpected server error occurred.' }, { status: 500 });
  }
}
