
/**
 * Google Apps Script for ProSched - GET SAVED DATA (SCHEDULE & TRACKING)
 *
 * This script is designed to fetch previously saved schedule and tracking data from your "Production Tracking" sheet.
 * This allows both the ProSched scheduler and the tracking page to reload their state from a single, reliable source.
 *
 * How to use:
 * 1. Open the Google Sheet where you have your "Production Tracking" sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Create a NEW script file.
 * 4. Paste this entire script into the new file's editor.
 * 5. Click "Deploy" > "New deployment".
 * 6. For "Select type", choose "Web app".
 * 7. In "Configuration", give it a description (e.g., "ProSched Get Scheduled/Tracking Data API").
 * 8. For "Who has access", select "Anyone". **This is crucial.**
 * 9. Click "Deploy".
 * 10. Authorize the script when prompted.
 * 11. Copy the provided "Web app URL".
 * 12. Add this URL to your "Web Url" sheet with the key 'scheduledTasks'.
 */

function doGet(e) {
  var SHEET_NAME = "Production Tracking";
  
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      // If sheet doesn't exist, it means nothing has been saved yet. Return an empty array.
      return createJsonResponse([]);
    }
    
    var data = sheet.getDataRange().getValues();
    
    if (data.length < 2) {
      // Sheet exists but is empty or only has headers.
      return createJsonResponse([]);
    }
    
    var headers = data.shift().map(function(h) { return String(h).trim(); });
    
    // Create a map from the header name to its column index
    var headerIndexMap = {};
    headers.forEach(function(header, index) {
        headerIndexMap[header] = index;
    });

    var tasks = data.map(function(row) {
      var task = {};
      
      // Explicitly map each required field from the row using the header index map.
      // This is more robust than trying to convert header names to JSON keys.
      task.id = row[headerIndexMap['Scheduled Task ID']];
      task.jobCardNumber = row[headerIndexMap['Job Card']];
      task.itemCode = row[headerIndexMap['Item Code']];
      task.material = row[headerIndexMap['Material']];
      task.priority = row[headerIndexMap['Priority']];
      task.orderedQuantity = Number(row[headerIndexMap['Ordered Qty']]) || 0;
      task.scheduledQuantity = Number(row[headerIndexMap['Scheduled Qty']]) || 0;
      task.pressNo = Number(row[headerIndexMap['Press']]) || 0;
      task.dieNo = Number(row[headerIndexMap['Die']]) || 0;
      task.timeTaken = Number(row[headerIndexMap['Time Taken']]) || 0;
      task.shiftId = row[headerIndexMap['Shift ID']];
      task.startTime = row[headerIndexMap['Scheduled Start Time']] ? new Date(row[headerIndexMap['Scheduled Start Time']]).toISOString() : null;
      task.endTime = row[headerIndexMap['Scheduled End Time']] ? new Date(row[headerIndexMap['Scheduled End Time']]).toISOString() : null;
      task.deliveryDate = row[headerIndexMap['Delivery Date']] ? new Date(row[headerIndexMap['Delivery Date']]).toISOString() : null;
      task.creationDate = new Date().toISOString(); // Placeholder, as creationDate isn't saved in the sheet

      // Reconstruct the trackingSteps object
      task.trackingSteps = [];
      var trackingModules = ['Molding', 'Finishing', 'Inspection', 'Pre-Dispatch', 'Dispatch', 'FG Stock', 'Feedback'];
      trackingModules.forEach(function(moduleName) {
          var step = { stepName: moduleName };
          var statusHeader = moduleName + ' Status';
          var startHeader = moduleName + ' Actual Start';
          var endHeader = moduleName + ' Actual End';
          var outputHeader = moduleName + ' Output Qty';
          var notesHeader = moduleName + ' Notes';

          step.status = headerIndexMap[statusHeader] !== undefined ? row[headerIndexMap[statusHeader]] || 'Pending' : 'Pending';
          step.actualStartDate = headerIndexMap[startHeader] !== undefined ? row[headerIndexMap[startHeader]] : null;
          step.actualEndDate = headerIndexMap[endHeader] !== undefined ? row[headerIndexMap[endHeader]] : null;
          step.outputQty = headerIndexMap[outputHeader] !== undefined ? Number(row[headerIndexMap[outputHeader]]) || 0 : 0;
          step.notes = headerIndexMap[notesHeader] !== undefined ? row[headerIndexMap[notesHeader]] || '' : '';

          if (moduleName === 'Inspection') {
            var rejectedHeader = 'Inspection Rejected Qty';
            var excessHeader = 'Inspection Excess Qty';
            step.rejectedQty = headerIndexMap[rejectedHeader] !== undefined ? Number(row[headerIndexMap[rejectedHeader]]) || 0 : 0;
            step.excessQty = headerIndexMap[excessHeader] !== undefined ? Number(row[headerIndexMap[excessHeader]]) || 0 : 0;
          }
          if (moduleName === 'Feedback') {
            var ratingHeader = 'Feedback Rating';
            step.satisfactionRating = headerIndexMap[ratingHeader] !== undefined ? Number(row[headerIndexMap[ratingHeader]]) || 0 : 0;
          }
          task.trackingSteps.push(step);
      });

      return task;

    }).filter(function(task) {
      // Ensure we only return tasks that have a unique ID and a shift ID.
      return task.id && String(task.id).trim() !== '' && task.shiftId && String(task.shiftId).trim() !== '';
    });
    
    return createJsonResponse(tasks);
      
  } catch (error) {
    Logger.log("doGet Error in Scheduled Task Fetcher: " + error.toString() + " Stack: " + error.stack);
    return createJsonResponse({ error: 'An error occurred while fetching the saved schedule.', details: error.message });
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
