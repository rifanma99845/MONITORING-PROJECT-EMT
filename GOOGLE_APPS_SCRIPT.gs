/**
 * Google Apps Script for EMT Workflow Monitoring
 * 
 * Instructions:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Delete any existing code and paste this code.
 * 4. Save the project (e.g., "EMT Backend").
 * 5. Click "Deploy" > "New Deployment".
 * 6. Select "Web App".
 * 7. Set "Execute as" to "Me".
 * 8. Set "Who has access" to "Anyone".
 * 9. Click "Deploy" and copy the Web App URL.
 * 10. Paste the URL into the app's Settings.
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet() ? SpreadsheetApp.getActiveSpreadsheet().getId() : null;

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'init') {
    if (!SPREADSHEET_ID) {
      return ContentService.createTextOutput(JSON.stringify({ 
        status: 'error', 
        message: 'Script tidak terikat dengan Spreadsheet. Gunakan Extensions > Apps Script di dalam Google Sheet.' 
      })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify(getAppData()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  if (action === 'test') {
    return ContentService.createTextOutput(JSON.stringify({ 
      status: 'success', 
      message: 'Koneksi berhasil!', 
      spreadsheetId: SPREADSHEET_ID,
      user: Session.getActiveUser().getEmail()
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  
  let result;
  if (action === 'login') {
    result = loginUser(data.username, data.password);
  } else if (action === 'register') {
    result = registerUser(data);
  } else if (action === 'submitChecklist') {
    result = submitChecklist(data);
  } else if (action === 'saveLayout') {
    result = saveLayout(data.layout);
  } else if (action === 'updateMasterData') {
    result = saveMasterData(data.masterData);
  } else if (action === 'submitUpdateHistory') {
    result = submitUpdateHistory(data);
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function getAppData() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  let configSheet = ss.getSheetByName('config');
  if (!configSheet) {
    configSheet = ss.insertSheet('config');
    const initialData = { projects: [], teams: ["FABRIKASI", "WIRING", "BUSBAR"] };
    configSheet.getRange(1, 1).setValue(JSON.stringify(initialData));
  }
  
  let masterDataRaw = configSheet.getRange(1, 1).getValue();
  let masterData;
  try {
    masterData = JSON.parse(masterDataRaw);
  } catch (e) {
    masterData = { projects: [], teams: ["FABRIKASI", "WIRING", "BUSBAR"] };
  }
  
  const pengerjaan = getPengerjaanData(ss);
  const status = getSheetData(ss, 'status_checklist');
  const layout = getSheetData(ss, 'layout');
  
  return {
    masterData,
    pengerjaan,
    status,
    layout
  };
}

function saveMasterData(masterData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('config');
  if (!sheet) sheet = ss.insertSheet('config');
  sheet.getRange(1, 1).setValue(JSON.stringify(masterData));
  return { status: 'success' };
}

function getPengerjaanData(ss) {
  const sheet = ss.getSheetByName('pengerjaan');
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 1) return [];
  
  const headers = data[0].map(h => h.toString().trim().toUpperCase());
  const teamHeaders = headers.slice(1); // All columns after "NAMA PANEL"
  
  const rows = data.slice(1);
  const result = {};
  let currentPanel = "";
  
  rows.forEach(row => {
    const panelName = row[0] ? row[0].toString().trim().toUpperCase() : "";
    if (panelName !== "") {
      currentPanel = panelName;
    }
    
    if (currentPanel !== "") {
      if (!result[currentPanel]) {
        result[currentPanel] = {
          namapanel: currentPanel,
          teams: {}
        };
        teamHeaders.forEach(team => {
          result[currentPanel].teams[team] = [];
        });
      }
      
      teamHeaders.forEach((team, index) => {
        const val = row[index + 1];
        if (val) {
          result[currentPanel].teams[team].push(val.toString().trim().toUpperCase());
        }
      });
    }
  });
  
  return Object.values(result).map(item => {
    const output = { namapanel: item.namapanel };
    Object.keys(item.teams).forEach(team => {
      output[team.toLowerCase()] = item.teams[team].join(", ");
    });
    return output;
  });
}

function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 1) return [];
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, i) => {
      if (header) {
        obj[header.toString().toLowerCase().replace(/\s+/g, '')] = row[i];
      }
    });
    return obj;
  });
}

function loginUser(username, password) {
  // Master Account Check
  if (username === "rifanma45" && password === "maul45") {
    return { status: 'success', user: username, role: 'master' };
  }

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('users');
    if (!sheet) return { status: 'error', message: 'Sheet "users" tidak ditemukan.' };
    
    const data = sheet.getDataRange().getValues();
    // New Structure: 0: Nama Lengkap, 1: Team, 2: Username, 3: Password, 4: Akses
    for (let i = 1; i < data.length; i++) {
      if (data[i][2].toString().trim() == username.toString().trim() && 
          data[i][3].toString().trim() == password.toString().trim()) {
        return { 
          status: 'success', 
          user: username, 
          fullName: data[i][0],
          team: data[i][1],
          role: data[i][4] || 'user' 
        };
      }
    }
    return { status: 'error', message: 'Username atau password salah' };
  } catch (e) {
    return { status: 'error', message: 'Terjadi kesalahan: ' + e.toString() };
  }
}

function registerUser(payload) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName('users');
    if (!sheet) {
      sheet = ss.insertSheet('users');
      sheet.appendRow(['Nama Lengkap', 'Team', 'Username', 'Password', 'Akses']);
    }
    
    const data = sheet.getDataRange().getValues();
    // Check if username already exists (Column 2)
    for (let i = 1; i < data.length; i++) {
      if (data[i][2].toString().trim() === payload.username.toString().trim()) {
        return { status: 'error', message: 'Username sudah digunakan' };
      }
    }
    
    // Append new user with default role 'user'
    sheet.appendRow([
      payload.fullName,
      payload.team,
      payload.username,
      payload.password,
      'user'
    ]);
    
    return { status: 'success', message: 'Pendaftaran berhasil' };
  } catch (e) {
    return { status: 'error', message: 'Gagal mendaftar: ' + e.toString() };
  }
}

function submitChecklist(payload) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('status_checklist');
  if (!sheet) {
    sheet = ss.insertSheet('status_checklist');
    sheet.appendRow(['panelid', 'project', 'namapanel', 'kodepanel', 'bagian', 'itemname', 'status', 'timestamp', 'user']);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(['panelid', 'project', 'namapanel', 'kodepanel', 'bagian', 'itemname', 'status', 'timestamp', 'user']);
  }
  
  const items = Array.isArray(payload.items) ? payload.items : [payload.itemName];
  const timestamp = new Date();
  
  const rows = items.map(item => [
    payload.panelId,
    payload.project,
    payload.panelName,
    "'" + payload.panelCode.toString(), // Force text format
    payload.bagian,
    item,
    'Checked',
    timestamp,
    payload.user
  ]);
  
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
  
  return { status: 'success' };
}

function saveLayout(layout) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('layout');
  if (!sheet) {
    sheet = ss.insertSheet('layout');
  }
  sheet.clear();
  sheet.appendRow(['panelid', 'x', 'y', 'project', 'name', 'code', 'warehouse']);
  
  if (layout.length > 0) {
    const rows = layout.map(p => [
      p.id, 
      p.position.x, 
      p.position.y, 
      p.project, 
      p.name, 
      "'" + p.code.toString(), // Force text format
      p.warehouse || "Warehouse 1"
    ]);
    sheet.getRange(2, 1, rows.length, 7).setValues(rows);
  }
  
  return { status: 'success' };
}

function submitUpdateHistory(payload) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('update_history');
  if (!sheet) {
    sheet = ss.insertSheet('update_history');
    sheet.appendRow(['Id Update', 'Tanggal dan Waktu', 'Waktu Update', 'Username', 'Project', 'Nama Panel', 'Kode Panel', 'Team', 'Bagian Pengerjaan']);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Id Update', 'Tanggal dan Waktu', 'Waktu Update', 'Username', 'Project', 'Nama Panel', 'Kode Panel', 'Team', 'Bagian Pengerjaan']);
  }
  
  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");
  const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "HH:mm:ss");
  const updateId = "UPD-" + now.getTime();
  
  const rows = payload.items.map(item => [
    updateId,
    dateStr,
    timeStr,
    payload.username,
    payload.project,
    payload.panelName,
    "'" + payload.panelCode.toString(), // Force text format
    payload.team,
    item
  ]);
  
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  }
  
  return { status: 'success', updateId: updateId };
}
