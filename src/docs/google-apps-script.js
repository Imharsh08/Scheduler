
/**
 * Google Apps Script for ProSched Application - UNSCHEDULED TASKS
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
 * 5. Click "Deploy" > "New deployment".
 * 6. For "Select type", choose "Web app".
 * 7. In "Configuration", give it a description (e.g., "ProSched Task Fetcher API").
 * 8. For "Who has access", select "Anyone". **This is crucial for the app to access it.**
 * 9. Click "Deploy".
 * 10. Authorize the script when prompted.
 * 11. Copy the provided "Web app URL".
 * 12. Paste this URL into your "Web Url" sheet with the key 'tasks'.
 *
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
    var headers = allData[6].map(function(h) { return String(h).trim(); });
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
        // Log the error but don't crash the script. This allows partial data to load.
        Logger.log("Header missing in 'FMS 2' sheet (row 7): '" + headerName + "'. This field will be skipped.");
      }
      headerIndices[key] = index;
    }
    
    var tasks = dataRows.map(function(row) {
      var task = {};
      
      // Build the task object using the mapped indices
      for (var key in headerIndices) {
        var index = headerIndices[key];
        // Check if the header was found (index is not -1) and if the row has enough columns
        if (index !== -1 && index < row.length) {
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
            // If header was not found or row is short, assign null
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
    Logger.log("doGet Error: " + error.toString() + "\nStack: " + error.stack);
    return createJsonResponse({ error: 'An error occurred while fetching tasks.', details: error.message });
  }
}

/**
 * [DEPRECATED] This doPost function is no longer used. 
 * All save operations are now handled by the 'save-tracking-apps-script.js'.
 * Please ensure your 'save' and 'tracking' URLs in the 'Web Url' sheet point 
 * to the deployment of that script.
 */
function doPost(e) {
  Logger.log("doPost called on deprecated script. Informing user.");
  return createJsonResponse({
    result: "Error", 
    message: "[DEPRECATED] This save function is no longer in use. Please use the URL from 'save-tracking-apps-script.js' for the 'save' key in your configuration sheet."
  });
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
