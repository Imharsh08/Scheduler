
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
    
    // This block now handles non-ok statuses, including the 401 we will send below.
    if (!response.ok) {
        console.error('Error from Google Apps Script or Proxy:', text);
        try {
            const errorJson = JSON.parse(text);
            return NextResponse.json({ error: errorJson.error || `Failed to fetch from Google Sheet. Status: ${response.status}`, details: errorJson.details || text }, { status: response.status });
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
        
        // Check if the response looks like an HTML login page, a common issue with Apps Script permissions.
        if (text.trim().toLowerCase().startsWith('<!doctype html>')) {
             return NextResponse.json(
                { 
                    error: 'Authentication Error', 
                    details: 'Received a login page instead of data. Please ensure your Google Apps Script is deployed with "Who has access" set to "Anyone".' 
                }, 
                { status: 401 } // Use 401 Unauthorized, which will be caught by the client.
            );
        }
        
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
