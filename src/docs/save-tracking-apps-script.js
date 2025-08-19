
/**
 * Google Apps Script for ProSched - SAVE ALL DATA (SCHEDULE & TRACKING)
 *
 * This single script handles saving all data from the ProSched application. It receives
 * schedule data or tracking updates and intelligently saves them to a "Production Tracking" sheet.
 * It uses an "upsert" logic: it updates existing rows or adds new ones based on a unique ID.
 *
 * How to use:
 * 1. Open your main ProSched Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Create a NEW script file.
 * 4. Paste this entire script into the new file's editor.
 * 5. Click "Deploy" > "New deployment".
 * 6. For "Select type", choose "Web app".
 * 7. In "Configuration", give it a description (e.g., "ProSched Save Data API").
 * 8. For "Who has access", select "Anyone". **This is crucial.**
 * 9. Click "Deploy".
 * 10. Authorize the script when prompted.
 * 11. Copy the provided "Web app URL".
 * 12. Add this URL to your "Web Url" sheet with BOTH the 'save' and 'tracking' keys.
 *     This single script handles all saving operations.
 */

var SHEET_NAME = "Production Tracking";
var UNIQUE_ID_COLUMN_NAME = 'Scheduled Task ID'; // This is the primary key for each row.

/**
 * Handles POST requests to the web app. Updates the tracking sheet.
 * @param {object} e The event parameter, containing postData.
 * @returns {ContentService.TextOutput} The JSON response.
 */
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
    }

    var tasksToSave = JSON.parse(e.postData.contents);

    // This script robustly handles both payload formats.
    // The tracking page sends a direct array, while the scheduler sends an object with a .tasks property.
    if (!Array.isArray(tasksToSave) && tasksToSave && tasksToSave.tasks && Array.isArray(tasksToSave.tasks)) {
        tasksToSave = tasksToSave.tasks;
    }
    
    if (!Array.isArray(tasksToSave)) {
      return createJsonResponse({ result: "Error", message: "Invalid payload. Expected an array of tasks." });
    }

    // Define a comprehensive header structure. This will be the single source of truth for all saved data.
    var finalHeaders = [
        'Scheduled Task ID', 'Job Card', 'Item Code', 'Material', 'Priority', 'Ordered Qty', 'Scheduled Qty', 
        'Press', 'Die', 'Time Taken', 'Shift ID', 'Scheduled Start Time', 'Scheduled End Time', 'Delivery Date',
        'Molding Status', 'Molding Actual Start', 'Molding Actual End', 'Molding Output Qty', 'Molding Notes',
        'Finishing Status', 'Finishing Actual Start', 'Finishing Actual End', 'Finishing Output Qty', 'Finishing Notes',
        'Inspection Status', 'Inspection Actual Start', 'Inspection Actual End', 'Inspection Output Qty', 'Inspection Notes', 'Inspection Rejected Qty', 'Inspection Excess Qty',
        'Pre-Dispatch Status', 'Pre-Dispatch Actual Start', 'Pre-Dispatch Actual End', 'Pre-Dispatch Output Qty', 'Pre-Dispatch Notes',
        'Dispatch Status', 'Dispatch Actual Start', 'Dispatch Actual End', 'Dispatch Output Qty', 'Dispatch Notes',
        'FG Stock Status', 'FG Stock Actual Start', 'FG Stock Actual End', 'FG Stock Output Qty', 'FG Stock Notes',
        'Feedback Status', 'Feedback Actual Start', 'Feedback Actual End', 'Feedback Output Qty', 'Feedback Notes', 'Feedback Rating'
    ];

    // Initialize headers if sheet is new or empty.
    if (sheet.getRange("A1").getValue() === "") {
      sheet.getRange(1, 1, 1, finalHeaders.length).setValues([finalHeaders]);
      SpreadsheetApp.flush();
    }
    
    var currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) { return String(h).trim(); });
    var uniqueIdColIndex = currentHeaders.indexOf(UNIQUE_ID_COLUMN_NAME);

    if (uniqueIdColIndex === -1) {
      return createJsonResponse({ result: "Error", message: "Header '" + UNIQUE_ID_COLUMN_NAME + "' not found in " + SHEET_NAME + "." });
    }
    
    var existingData = [];
    var existingIds = {};
    if (sheet.getLastRow() > 1) {
      // Get all data and map IDs to row numbers (1-based index)
      existingData = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
      existingData.forEach(function(row, index) {
        var id = row[uniqueIdColIndex];
        if (id) {
            existingIds[id] = index + 2; // +2 because data starts at row 2 and sheets are 1-indexed
        }
      });
    }

    var rowsToAppend = [];
    
    tasksToSave.forEach(function(task) {
        // Create a map of the task data for easier lookup. This handles all base properties.
        var taskDataMap = {
            'Scheduled Task ID': task.id,
            'Job Card': task.jobCardNumber,
            'Item Code': task.itemCode,
            'Material': task.material,
            'Priority': task.priority,
            'Ordered Qty': task.orderedQuantity,
            'Scheduled Qty': task.scheduledQuantity,
            'Press': task.pressNo,
            'Die': task.dieNo,
            'Time Taken': task.timeTaken,
            'Shift ID': task.shiftId,
            'Scheduled Start Time': formatDate(task.startTime),
            'Scheduled End Time': formatDate(task.endTime),
            'Delivery Date': formatDate(task.deliveryDate)
        };
        
        // Add data from nested tracking steps to the map
        if (task.trackingSteps && Array.isArray(task.trackingSteps)) {
            task.trackingSteps.forEach(function(step) {
                if (!step || !step.stepName) return; // Skip if step is invalid
                taskDataMap[step.stepName + ' Status'] = step.status;
                taskDataMap[step.stepName + ' Actual Start'] = formatDate(step.actualStartDate);
                taskDataMap[step.stepName + ' Actual End'] = formatDate(step.actualEndDate);
                taskDataMap[step.stepName + ' Output Qty'] = step.outputQty;
                taskDataMap[step.stepName + ' Notes'] = step.notes;
                
                // Special fields for Inspection and Feedback
                if (step.stepName === 'Inspection') {
                    taskDataMap['Inspection Rejected Qty'] = step.rejectedQty;
                    taskDataMap['Inspection Excess Qty'] = step.excessQty;
                }
                if (step.stepName === 'Feedback') {
                    taskDataMap['Feedback Rating'] = step.satisfactionRating;
                }
            });
        }
        
        // Build the row array in the exact order of the sheet's headers
        var rowData = currentHeaders.map(function(header) {
            return taskDataMap[header] !== undefined ? taskDataMap[header] : ''; // Return value or empty string
        });
        
        // --- Decide to Update or Append ---
        var existingRowNumber = existingIds[task.id];
        if (existingRowNumber) {
            // Update existing row
            sheet.getRange(existingRowNumber, 1, 1, currentHeaders.length).setValues([rowData]);
        } else {
            // Add to the list of new rows to append
            rowsToAppend.push(rowData);
        }
    });

    // --- Append new rows in a single operation for efficiency ---
    if (rowsToAppend.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, currentHeaders.length).setValues(rowsToAppend);
    }
    
    return createJsonResponse({ result: "Success", message: "Data saved successfully to 'Production Tracking' sheet." });

  } catch (error) {
    Logger.log("doPost Error: " + error.toString() + "\nStack: " + error.stack);
    var receivedPayload = "Could not parse payload";
    try {
      receivedPayload = e.postData.contents;
    } catch(err) { /* ignore */ }
    return createJsonResponse({ result: "Error", message: error.toString(), received: receivedPayload });
  }
}

/**
 * Helper to format date strings into IST (yyyy-MM-dd HH:mm:ss) or return an empty string.
 */
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        var date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        // "IST" timezone identifier is crucial for correct time conversion.
        return Utilities.formatDate(date, "IST", "yyyy-MM-dd HH:mm:ss");
    } catch(e) {
        return '';
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

