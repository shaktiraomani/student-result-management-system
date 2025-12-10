// --- COPY THIS CODE INTO YOUR GOOGLE SHEETS APPS SCRIPT EDITOR (Code.gs) ---

function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Gyan Ganga Portal')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function apiHandler(data) {
  const lock = LockService.getScriptLock();
  // Wait longer for lock to ensure data consistency
  const success = lock.tryLock(45000); 
  
  if (!success) {
    return JSON.stringify({ result: 'error', error: 'Server busy, please try again.' });
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) throw new Error("Spreadsheet not found");

    const action = data.action;

    // GET DATA
    if (action === 'get_all_data') {
      if (!ss.getSheetByName('Config')) {
         return JSON.stringify({ result: 'error', error: 'Database empty' });
      }
      return JSON.stringify({
        result: 'success',
        data: {
          students: _getData(ss, 'Students'),
          teachers: _getData(ss, 'Teachers'),
          subjects: _getData(ss, 'Subjects'),
          marks: _getData(ss, 'Marks'),
          config: _getData(ss, 'Config')[0] || null
        }
      });
    }

    // SETUP DB
    if (action === 'setup_db') {
      _setupSheet(ss, 'Config', ['name', 'address', 'logoUrl', 'developerName', 'adminUsername', 'adminPassword', 'isResultsPublished', 'googleWebAppUrl', 'sessionYear', 'activeTemplate']);
      _setupSheet(ss, 'Teachers', ['id', 'name', 'password', 'assignedClasses']);
      _setupSheet(ss, 'Students', ['id', 'srNo', 'rollNo', 'name', 'fatherName', 'motherName', 'className', 'mobile', 'dob', 'gender', 'category', 'admissionDate', 'address', 'attendance', 'remarks']);
      _setupSheet(ss, 'Subjects', ['id', 'name', 'className', 'maxMarksTheory', 'maxMarksAssessment']);
      _setupSheet(ss, 'Marks', ['studentId', 'subjectId', 'examType', 'theory', 'assessment']);
      return JSON.stringify({ result: 'success' });
    }

    // UPDATE DATA
    if (action === 'update_collection') {
      _saveData(ss, data.collectionName, data.data);
      SpreadsheetApp.flush(); // FORCE SAVE IMMEDIATELY
      return JSON.stringify({ result: 'success' });
    }

    return JSON.stringify({ result: 'error', error: 'Unknown action' });

  } catch (e) {
    return JSON.stringify({ result: 'error', error: e.toString() });
  } finally {
    lock.releaseLock();
  }
}

// --- HELPERS ---

function _setupSheet(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else {
    // If sheet exists but is empty (only header or less), re-write headers to ensure they are correct
    // NOTE: Does not migrate existing data columns automatically.
    if (sheet.getLastRow() < 2) {
       sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight("bold");
    }
  }
}

function _saveData(ss, name, data) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error("Sheet " + name + " not found. Please reload.");
  
  // Clear content properly: Start row 2, col 1, all rows down, all cols across
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  
  if (!data || data.length === 0) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rows = data.map(item => {
    return headers.map(header => {
      const val = item[header];
      return (typeof val === 'object' && val !== null) ? JSON.stringify(val) : (val === undefined || val === null ? "" : val);
    });
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

function _getData(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const rawData = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  return rawData.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      let val = row[i];
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { val = JSON.parse(val); } catch(e) {}
      }
      obj[h] = val;
    });
    return obj;
  });
}