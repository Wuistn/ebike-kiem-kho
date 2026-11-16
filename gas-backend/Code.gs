/**
 * GOOGLE APPS SCRIPT BACKEND FOR HỆ THỐNG ĐỊNH VỊ HÀNG HÓA & KIỂM KHO (v1.4)
 * Tự động khởi tạo Google Sheets và các bảng dữ liệu (Tabs) mẫu khi gọi lần đầu.
 */

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  
  if (action === 'getData' || action === 'init' || action === 'sync') {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: getAllSheetData()
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Hệ thống Định vị Hàng hóa & Kiểm kho KiotViet')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const payload = data.payload;
    
    let result = { status: 'success' };
    
    if (action === 'saveMapping') {
      appendRowToSheet('Mappings', [payload.id, payload.branchId, payload.productId, payload.locationId, payload.assignedBy, payload.timestamp, payload.actionType]);
    } else if (action === 'saveStocktakeItem') {
      upsertStocktakeItem(payload);
    } else if (action === 'addVehicle') {
      appendRowToSheet('Vehicles', [payload.id, payload.branchId, payload.productId, payload.imei, payload.chassisNumber, payload.engineNumber, payload.locationId, payload.status]);
    } else if (action === 'createSession') {
      appendRowToSheet('Sessions', [payload.id, payload.branchId, payload.name, payload.createdBy, payload.startTime, payload.snapshotTime, payload.status, payload.note]);
    } else if (action === 'logAudit') {
      appendRowToSheet('AuditLogs', [payload.id, payload.timestamp, payload.username, payload.action, payload.details]);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSpreadsheet() {
  // Nếu là Bound Script (tạo từ Google Sheet), lấy active spreadsheet.
  // Nếu là Standalone, bạn có thể thay bằng SpreadsheetApp.openById("YOUR_SHEET_ID")
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    // Fallback nếu chạy test ngoài context bound
    return null;
  }
}

function getAllSheetData() {
  const ss = getSpreadsheet();
  if (!ss) {
    return { error: "Apps Script chưa được gắn (bound) vào Google Sheet. Hãy tạo Google Sheet -> Tiện ích mở rộng -> Apps Script." };
  }
  
  // Tự động khởi tạo cấu trúc các tab nếu chưa có
  initializeDatabaseIfEmpty(ss);
  
  return {
    branches: getSheetRows(ss, 'Branches'),
    users: getSheetRows(ss, 'Users'),
    products: getSheetRows(ss, 'Products'),
    locations: getSheetRows(ss, 'Locations'),
    mappings: getSheetRows(ss, 'Mappings'),
    sessions: getSheetRows(ss, 'Sessions'),
    stocktakeItems: getSheetRows(ss, 'StocktakeItems'),
    vehicles: getSheetRows(ss, 'Vehicles'),
    auditLogs: getSheetRows(ss, 'AuditLogs')
  };
}

function initializeDatabaseIfEmpty(ss) {
  const schemas = {
    'Branches': ['id', 'code', 'name', 'address'],
    'Users': ['id', 'username', 'fullName', 'role', 'branchIds', 'status'],
    'Products': ['id', 'code', 'name', 'barcode', 'category', 'unit', 'status', 'image', 'hasIMEI'],
    'Locations': ['id', 'branchId', 'parentId', 'name', 'levelIndex', 'description', 'qrCode', 'status'],
    'Mappings': ['id', 'branchId', 'productId', 'locationId', 'assignedBy', 'timestamp', 'actionType'],
    'Sessions': ['id', 'branchId', 'name', 'createdBy', 'startTime', 'snapshotTime', 'status', 'note'],
    'StocktakeItems': ['id', 'sessionId', 'productId', 'locationId', 'kiotvietStock', 'actualStock', 'userId', 'status', 'timestamp'],
    'Vehicles': ['id', 'branchId', 'productId', 'imei', 'chassisNumber', 'engineNumber', 'locationId', 'status'],
    'AuditLogs': ['id', 'timestamp', 'username', 'action', 'details']
  };

  for (let sheetName in schemas) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(schemas[sheetName]);
      
      // Seed dữ liệu mẫu ban đầu cho Branches & Products nếu mới tạo
      if (sheetName === 'Branches') {
        sheet.appendRow(['branch-1', 'KV-Q1', 'Chi nhánh Quận 1', '123 Nguyễn Huệ, Q.1, TP.HCM']);
        sheet.appendRow(['branch-2', 'KV-TD', 'Chi nhánh Thủ Đức', '456 Kha Vạn Cân, Thủ Đức, TP.HCM']);
      } else if (sheetName === 'Products') {
        sheet.appendRow(['p-1', 'SP001', 'Dầu nhớt động cơ Honda 1L', '8931234567890', 'Dầu nhớt', 'Bình', 'ACTIVE', '', 'false']);
        sheet.appendRow(['p-2', 'SP002', 'Lốp không săm Michelin 90/90-14', '8931234567891', 'Lốp xe', 'Cái', 'ACTIVE', '', 'false']);
        sheet.appendRow(['p-3', 'SP003', 'Xe máy điện VinFast Klara S', '8931234567892', 'Xe điện', 'Xe', 'ACTIVE', '', 'true']);
      }
    }
  }
}

function getSheetRows(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0];
  return rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function appendRowToSheet(sheetName, rowData) {
  const ss = getSpreadsheet();
  if (!ss) return;
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  sheet.appendRow(rowData);
}

function upsertStocktakeItem(payload) {
  const ss = getSpreadsheet();
  if (!ss) return;
  let sheet = ss.getSheetByName('StocktakeItems');
  if (!sheet) {
    sheet = ss.insertSheet('StocktakeItems');
    sheet.appendRow(['id', 'sessionId', 'productId', 'locationId', 'kiotvietStock', 'actualStock', 'userId', 'status', 'timestamp']);
  }
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][1] === payload.sessionId && rows[i][2] === payload.productId && rows[i][3] === payload.locationId) {
      sheet.getRange(i + 1, 6).setValue(payload.actualStock);
      sheet.getRange(i + 1, 8).setValue(payload.status);
      sheet.getRange(i + 1, 9).setValue(payload.timestamp);
      return;
    }
  }
  sheet.appendRow([payload.id, payload.sessionId, payload.productId, payload.locationId, payload.kiotvietStock, payload.actualStock, payload.userId, payload.status, payload.timestamp]);
}
