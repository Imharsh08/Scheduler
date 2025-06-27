
/**
 * Google Apps Script for ProSched Application
 *
 * This script is designed to work with your "FMS 2" sheet headers.
 * It will map your columns to the data structure needed by the ProSched app,
 * including priority levels and delivery dates.
 *
 * How to use:
 * 1. Open your Google Sheet that contains the "FMS 2" data.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this entire script into the editor, replacing any default code.
 * 4. Ensure your "FMS 2" sheet has the following headers (case-sensitive):
 *    - Date
 *    - Job Card No.
 *    - Order qty
 *    - Type_Model_MOC code
 *    - MOC
 *    - Emergency PO (containing "High", "Normal", or "Low")
 *    - Rqstd Delivery date
 * 5. Create another (or ensure you have a) sheet named "Molding Sheet". It will be used for saving data later.
 * 6. Click "Deploy" > "New deployment".
 * 7. For "Select type", choose "Web app".
 * 8. In "Configuration", give it a description (e.g., "ProSched API v2").
 * 9. For "Who has access", select "Anyone". **This is crucial for the app to access it.**
 * 10. Click "Deploy".
 * 11. Authorize the script when prompted.
 * 12. Copy the provided "Web app URL".
 * 13. Paste this URL into the "Unscheduled Tasks" panel in the ProSched application and click "Load".
 */

// --- Column Header Configuration ---
// This section maps the headers from your sheet to the fields the app expects.
const HEADER_MAPPING = {
  creationDate: 'Date',
  jobCardNumber: 'Job Card No.',
  orderedQuantity: 'Order qty',
  itemCode: 'Type_Model_MOC code',
  material: 'MOC',
  priority: 'Emergency PO',
  deliveryDate: 'Rqstd Delivery date',
};
// --- End Configuration ---


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
    
    // Find the column index for each required header
    var headerIndices = {};
    for (var key in HEADER_MAPPING) {
      var headerName = HEADER_MAPPING[key];
      var index = headers.indexOf(headerName);
      if (index === -1) {
        return createJsonResponse({ error: "Required header not found in 'FMS 2' sheet: " + headerName });
      }
      headerIndices[key] = index;
    }
    
    var tasks = data.map(function(row) {
      var task = {};
      
      // Build the task object using the mapped indices
      for (var key in headerIndices) {
        var index = headerIndices[key];
        var value = row[index];
        
        if ((key === 'creationDate' || key === 'deliveryDate') && value instanceof Date) {
          // Check if date is valid before converting
          if (!isNaN(value.getTime())) {
            task[key] = value.toISOString();
          } else {
            task[key] = null;
          }
        } else if (key === 'priority') {
           var priorityValue = String(value || '').trim().toLowerCase();
           if (priorityValue === 'high') {
             task[key] = 'High';
           } else if (priorityValue === 'normal') {
             task[key] = 'Normal';
           } else if (priorityValue === 'low') {
             task[key] = 'Low';
           } else {
             task[key] = 'None';
           }
        } else {
          task[key] = value;
        }
      }
      return task;
    }).filter(function(task) {
      // Ensure we only return tasks that have a job card number
      return task.jobCardNumber && String(task.jobCardNumber).trim() !== '';
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
