
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
 * 4. Ensure your "FMS 2" sheet has its headers on the 7th row, including:
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
 *
 * --- TROUBLESHOOTING ---
 * If you see an "Authentication Error" or a message about a login page, it means the script
 * is not publicly accessible. Please re-check your deployment settings:
 * - In the deployment configuration, "Execute as" should be "Me".
 * - "Who has access" MUST be set to "Anyone".
 *
 * If you change these settings, you must create a new deployment version by going to
 * "Deploy" > "Manage Deployments", editing your deployment, and selecting "New version". Then
 * click "Deploy" to apply the changes. The URL will remain the same.
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
    
    // Get all data from the sheet
    var allData = sheet.getDataRange().getValues();
    
    // Check if there are enough rows for the header
    if (allData.length < 7) {
      return createJsonResponse([]); // Not enough data for headers
    }

    // Headers are in the 7th row (index 6)
    var headers = allData[6]; 
    // Actual data starts from the 8th row (index 7)
    var dataRows = allData.slice(7);

    if (dataRows.length === 0) {
      return createJsonResponse([]); // No data rows found after the header
    }

    // Find the column index for each required header
    var headerIndices = {};
    for (var key in HEADER_MAPPING) {
      var headerName = HEADER_MAPPING[key];
      var index = headers.indexOf(headerName);
      if (index === -1) {
        return createJsonResponse({ error: "Required header not found in 'FMS 2' sheet (in row 7): " + headerName });
      }
      headerIndices[key] = index;
    }
    
    var tasks = dataRows.map(function(row) {
      var task = {};
      
      // Build the task object using the mapped indices
      for (var key in headerIndices) {
        var index = headerIndices[key];
        // Check if the row has enough columns
        if (index < row.length) {
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
        } else {
            // Handle cases where a row might be shorter than the header row
            task[key] = null;
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
 * Helper function to create a JSON response.
 * @param {object} data The data to stringify.
 * @returns {ContentService.TextOutput} The JSON response object.
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
