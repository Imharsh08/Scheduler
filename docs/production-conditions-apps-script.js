/**
 * Google Apps Script for ProSched - Production Conditions
 *
 * This script is designed to fetch production conditions from your "Manufacturing details" sheet.
 * It maps your specific columns to the data structure needed by the ProSched app, including
 * calculating the pieces per cycle from your side operation columns.
 *
 * How to use:
 * 1. Open the Google Sheet that contains your "Manufacturing details" data.
 * 2. Go to Extensions > Apps Script.
 * 3. Create a NEW script file (e.g., from the file list on the left, click '+' and choose 'Script').
 * 4. Paste this entire script into the new file's editor, replacing any default code.
 * 5. Ensure your "Manufacturing details" sheet has its headers on the FIRST row, including:
 *    - Type_Model_MOC code
 *    - Press No
 *    - Die No
 *    - MOC
 *    - cycle time (in seconds)
 *    - cycle time 1 side operation
 *    - cycle time 2 side operation
 * 6. Click "Deploy" > "New deployment".
 * 7. For "Select type", choose "Web app".
 * 8. In "Configuration", give it a description (e.g., "ProSched Production Conditions API").
 * 9. For "Who has access", select "Anyone". **This is crucial for the app to access it.**
 * 10. Click "Deploy".
 * 11. Authorize the script when prompted.
 * 12. Copy the provided "Web app URL".
 * 13. This URL can be used in the ProSched application to load the production conditions.
 */

// --- Column Header Configuration ---
// Maps headers from your sheet to the fields the app expects.
const HEADER_MAPPING = {
  itemCode: 'Type_Model_MOC code',
  pressNo: 'Press No',
  dieNo: 'Die No',
  material: 'MOC',
  cureTime: 'cycle time', // Assumed to be in SECONDS
  piecesPerCycle1: 'cycle time 1 side operation',
  piecesPerCycle2: 'cycle time 2 side operation',
};
// --- End Configuration ---


/**
 * Handles GET requests to the web app. Fetches all production conditions from the "Manufacturing details" sheet.
 * @param {object} e The event parameter.
 * @returns {ContentService.TextOutput} The JSON response.
 */
function doGet(e) {
  var SHEET_NAME = "Manufacturing details"; 
  
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return createJsonResponse({ error: "Sheet '" + SHEET_NAME + "' not found." });
    }
    
    var allData = sheet.getDataRange().getValues();
    
    if (allData.length < 2) {
      return createJsonResponse([]); // Not enough data for headers and at least one row
    }

    // Headers are in the 1st row (index 0)
    var rawHeaders = allData[0]; 
    // Trim whitespace from headers to prevent matching issues
    var headers = rawHeaders.map(function(h) { return typeof h === 'string' ? h.trim() : h; });
    
    // Actual data starts from the 2nd row (index 1)
    var dataRows = allData.slice(1);

    if (dataRows.length === 0) {
      return createJsonResponse([]); // No data rows found
    }

    // Find the column index for each required header
    var headerIndices = {};
    for (var key in HEADER_MAPPING) {
      var headerName = HEADER_MAPPING[key];
      var index = headers.indexOf(headerName);
      if (index === -1) {
        return createJsonResponse({ error: "Required header not found in '" + SHEET_NAME + "' sheet: " + headerName });
      }
      headerIndices[key] = index;
    }
    
    var conditions = dataRows.map(function(row) {
      // Helper to safely get and parse a number from a row
      function getNumberFromRow(key) {
        var index = headerIndices[key];
        if (index !== undefined && index < row.length) {
          var value = parseFloat(row[index]);
          return isNaN(value) ? 0 : value;
        }
        return 0;
      }

      // Calculate piecesPerCycle by adding the two side operation values
      var side1 = getNumberFromRow('piecesPerCycle1');
      var side2 = getNumberFromRow('piecesPerCycle2');
      var totalPieces = side1 + side2;

      // If side operations are not specified, assume at least 1 piece per cycle.
      if (totalPieces === 0) {
        totalPieces = 1;
      }

      var cureTimeInSeconds = getNumberFromRow('cureTime');
      // Convert cure time from seconds to minutes, rounding up.
      var cureTimeInMinutes = Math.ceil(cureTimeInSeconds / 60);

      // Build the condition object
      var condition = {
        itemCode: row[headerIndices.itemCode],
        pressNo: getNumberFromRow('pressNo'),
        dieNo: getNumberFromRow('dieNo'),
        material: row[headerIndices.material],
        cureTime: cureTimeInMinutes,
        piecesPerCycle: totalPieces,
      };
      
      return condition;

    }).filter(function(condition) {
      // Ensure we only return conditions that have an item code
      return condition.itemCode && String(condition.itemCode).trim() !== '';
    });
    
    return createJsonResponse(conditions);
      
  } catch (error) {
    console.error("doGet Error: " + error.toString());
    return createJsonResponse({ error: 'An error occurred while fetching production conditions.', details: error.message });
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
