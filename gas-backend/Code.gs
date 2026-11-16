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
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (err) {
    return null;
  }
}

function getAllSheetData() {
  const ss = getSpreadsheet();
  if (!ss) {
    return { error: "Apps Script chưa được gắn (bound) vào Google Sheet. Hãy tạo Google Sheet -> Tiện ích mở rộng -> Apps Script." };
  }
  
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
      
      if (sheetName === 'Branches') {
        sheet.appendRow(['branch-1', 'KV-Q1', 'Chi nhánh Quận 1', '123 Nguyễn Huệ, Q.1, TP.HCM']);
        sheet.appendRow(['branch-2', 'KV-TD', 'Chi nhánh Thủ Đức', '456 Kha Vạn Cân, Thủ Đức, TP.HCM']);
        sheet.appendRow(['branch-3', 'KV-TB', 'Kho Tổng Miền Nam', '789 Quốc Lộ 1A, Bình Tân, TP.HCM']);
      } else if (sheetName === 'Products') {
        const sampleProducts = [
          ['p-1', 'SP001', 'Dầu nhớt động cơ Honda 1L', '8931234567890', 'Dầu nhớt', 'Bình', 'ACTIVE', '', 'false'],
          ['p-2', 'SP002', 'Lốp không săm Michelin 90/90-14', '8931234567891', 'Lốp xe', 'Cái', 'ACTIVE', '', 'false'],
          ['p-3', 'SP003', 'Xe máy điện VinFast Klara S', '8931234567892', 'Xe điện', 'Xe', 'ACTIVE', '', 'true'],
          ['p-4', 'SP004', 'Xe máy điện Yadea Odora', '8931234567893', 'Xe điện', 'Xe', 'ACTIVE', '', 'true'],
          ['p-5', 'SP005', 'Má phanh trước Exciter 150', '8931234567894', 'Phụ tùng', 'Bộ', 'ACTIVE', '', 'false'],
          ['p-6', 'SP006', 'Ắc quy xe điện Chilwee 12V-20Ah', '8931234567895', 'Ắc quy', 'Bình', 'ACTIVE', '', 'true'],
          ['p-7', 'SP007', 'Sạc pin xe điện 48V-20A', '8931234567896', 'Linh kiện', 'Cái', 'ACTIVE', '', 'false'],
          ['p-8', 'SP008', 'Tay ga xe máy điện', '8931234567897', 'Phụ tùng', 'Cái', 'ACTIVE', '', 'false'],
          ['p-9', 'SP009', 'Đèn pha LED xe điện', '8931234567898', 'Phụ tùng', 'Cái', 'ACTIVE', '', 'false'],
          ['p-10', 'SP010', 'Gương chiếu hậu thời trang', '8931234567899', 'Phụ kiện', 'Cặp', 'ACTIVE', '', 'false']
        ];
        sheet.getRange(2, 1, sampleProducts.length, sampleProducts[0].length).setValues(sampleProducts);
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
