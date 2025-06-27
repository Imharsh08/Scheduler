
/**
 * Google Apps Script for ProSched Application
 *
 * How to use:
 * 1. Open a Google Sheet that will store your task data.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this entire script into the editor, replacing any default code.
 * 4. Create two sheets in your Google Sheet: "FMS 2" and "Molding Sheet".
 * 5. In the "FMS 2" sheet, add the following headers in the first row:
 *    jobCardNumber, orderedQuantity, itemCode, material, isPriority, creationDate
 * 6. Click "Deploy" > "New deployment".
 * 7. For "Select type", choose "Web app".
 * 8. In "Configuration", give it a description (e.g., "ProSched API").
 * 9. For "Who has access", select "Anyone". **This is crucial for the app to access it.**
 * 10. Click "Deploy".
 * 11. Authorize the script when prompted.
 * 12. Copy the provided "Web app URL".
 * 13. Paste this URL into the "Unscheduled Tasks" panel in the ProSched application and click "Load".
 */

/**
 * Handles GET requests to the web app. Fetches all tasks from the "FMS 2" sheet.
 * @param {object} e The event parameter.
 * @returns {ContentService.TextOutput} The JSON response.
 */
function doGet(e) {
  var SHEET_NAME = "FMS 2"; 
  
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return createJsonResponse({ error: "Sheet '" + SHEET_NAME + "' not found." });
    }
    
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return createJsonResponse([]); // No data besides headers
    }

    var headers = data.shift(); // Get headers and remove them from data
    
    var tasks = data.map(function(row) {
      var task = {};
      headers.forEach(function(header, i) {
        if (!header) return; // Skip empty header columns
        
        let value = row[i];
        if (header === 'creationDate' && value instanceof Date) {
          task[header] = value.toISOString();
        } else if (header === 'isPriority') {
           task[header] = (value === true || String(value).toUpperCase() === 'TRUE');
        } else {
          task[header] = value;
        }
      });
      return task;
    });
    
    return createJsonResponse(tasks);
      
  } catch (error) {
    console.error("doGet Error: " + error.toString());
    return createJsonResponse({ error: 'An error occurred while fetching tasks.', details: error.message });
  }
}

/**
 * Handles POST requests to the web app. Saves scheduled tasks to the "Molding Sheet".
 * @param {object} e The event parameter, containing postData.
 * @returns {ContentService.TextOutput} The JSON response.
 */
function doPost(e) {
  var SHEET_NAME = "Molding Sheet";
  
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME);
      // Set up headers for the new sheet
      sheet.appendRow(['jobCardNumber', 'itemCode', 'material', 'scheduledQuantity', 'pressNo', 'dieNo', 'timeTaken', 'shiftId', 'timestamp']);
    }

    // Assumes the request body is a JSON string of an array of scheduled tasks
    var scheduledTasks = JSON.parse(e.postData.contents);

    if (!Array.isArray(scheduledTasks)) {
        scheduledTasks = [scheduledTasks]; // Handle single object case
    }
    
    var timestamp = new Date();
    
    scheduledTasks.forEach(function(task) {
      sheet.appendRow([
        task.jobCardNumber || '',
        task.itemCode || '',
        task.material || '',
        task.scheduledQuantity || 0,
        task.pressNo || 0,
        task.dieNo || 0,
        task.timeTaken || 0,
        task.shiftId || '', // The front-end would need to add this to the payload
        timestamp
      ]);
    });
    
    return createJsonResponse({result: "Success", count: scheduledTasks.length});

  } catch (error) {
    console.error("doPost Error: " + error.toString());
    return createJsonResponse({result: "Error", message: error.toString(), received: e.postData.contents});
  }
}

/**
 * Helper function to create a JSON response with correct headers for CORS.
 * @param {object} data The data to stringify.
 * @returns {ContentService.TextOutput} The JSON response object.
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*') // Important for CORS
    .setHeader('X-Content-Type-Options', 'nosniff');
}
