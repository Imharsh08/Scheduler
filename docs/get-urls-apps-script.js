/**
 * Google Apps Script for ProSched - URL Configuration Fetcher
 *
 * This script is designed to fetch your other Apps Script web app URLs from a 
 * dedicated sheet named "Web Url". This simplifies configuration in the ProSched app,
 * as you only need to manage this one URL.
 *
 * How to use:
 * 1. Open the Google Sheet where you have your other ProSched scripts deployed.
 * 2. Create a NEW sheet and name it exactly "Web Url".
 * 3. In this "Web Url" sheet, create two columns in the first row:
 *    - Cell A1: Key
 *    - Cell B1: Value
 * 4. Add rows for each of your deployed scripts. The "Key" must be one of: 
 *    'tasks', 'conditions', or 'save'. The "Value" is the corresponding web app URL.
 *    
 *    Example:
 *    | Key        | Value                                                |
 *    |------------|------------------------------------------------------|
 *    | tasks      | https://script.google.com/macros/s/..../exec (FMS 2) |
 *    | conditions | https://script.google.com/macros/s/..../exec (Mfg)   |
 *    | save       | https://script.google.com/macros/s/..../exec (FMS 2) |
 *
 * 5. Go to Extensions > Apps Script.
 * 6. Create a NEW script file.
 * 7. Paste this entire script into the new file's editor.
 * 8. Click "Deploy" > "New deployment".
 * 9. For "Select type", choose "Web app".
 * 10. In "Configuration", give it a description (e.g., "ProSched URL Config API").
 * 11. For "Who has access", select "Anyone". **This is crucial.**
 * 12. Click "Deploy".
 * 13. Authorize the script when prompted.
 * 14. Copy the provided "Web app URL". This is your "Configuration URL".
 * 15. Paste this single URL into the "Configuration URL" field in the ProSched app's
 *     Integrations dialog and click "Load".
 */

/**
 * Handles GET requests to the web app. Fetches URLs from the "Web Url" sheet.
 * @param {object} e The event parameter.
 * @returns {ContentService.TextOutput} The JSON response containing the URLs.
 */
function doGet(e) {
  var SHEET_NAME = "Web Url";
  
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return createJsonResponse({ error: "Configuration sheet named '" + SHEET_NAME + "' not found." });
    }
    
    var data = sheet.getDataRange().getValues();
    
    if (data.length < 2) {
      return createJsonResponse({ error: "No data found in '" + SHEET_NAME + "' sheet." });
    }
    
    var headers = data.shift().map(function(h) { return h.toString().toLowerCase().trim(); });
    var keyIndex = headers.indexOf('key');
    var valueIndex = headers.indexOf('value');

    if (keyIndex === -1 || valueIndex === -1) {
      return createJsonResponse({ error: "Missing 'Key' or 'Value' headers in '" + SHEET_NAME + "' sheet." });
    }

    var urls = {};
    data.forEach(function(row) {
      var key = row[keyIndex] ? row[keyIndex].toString().trim() : '';
      var value = row[valueIndex] ? row[valueIndex].toString().trim() : '';
      if (key && value) {
        urls[key] = value;
      }
    });

    return createJsonResponse(urls);
      
  } catch (error) {
    console.error("doGet Error in URL Fetcher: " + error.toString());
    return createJsonResponse({ error: 'An error occurred while fetching the URL configuration.', details: error.message });
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
