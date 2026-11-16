# CẤU TRÚC DỮ LIỆU (DATABASE SCHEMA - Google Sheets Simulation)

1. **Branches**: `id`, `name`, `code`, `address`
2. **Users**: `id`, `username`, `fullName`, `role`, `status`
3. **User_Branches**: `userId`, `branchId`
4. **Products**: `id`, `code`, `name`, `barcode`, `category`, `unit`, `status`, `images`, `hasIMEI`
5. **Locations**: `id`, `branchId`, `parentId`, `name`, `level`, `pathName`, `description`, `qrCode`
6. **Product_Location_History**: `id`, `branchId`, `productId`, `locationId`, `actionType` (NEW, ADD, CHANGE), `userId`, `timestamp`
7. **Stocktake_Sessions**: `id`, `branchId`, `name`, `createdBy`, `startTime`, `status`, `snapshotTime`, `note`
8. **Stocktake_Items**: `id`, `sessionId`, `productId`, `locationId`, `kiotvietStock`, `actualStock`, `userId`, `status`, `timestamp`
9. **Vehicle_Assets**: `id`, `branchId`, `productId`, `imei`, `chassisNumber`, `engineNumber`, `locationId`, `status`
10. **Stocktake_Assets**: `id`, `sessionId`, `vehicleId`, `actualLocationId`, `userId`, `status`, `timestamp`
11. **Sync_Logs**: `id`, `timestamp`, `status`, `totalSynced`, `message`
12. **Audit_Logs**: `id`, `timestamp`, `userId`, `action`, `details`
