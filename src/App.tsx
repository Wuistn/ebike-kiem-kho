/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, MapPin, QrCode, ClipboardCheck, Bike, BarChart3, Settings, 
  User as UserIcon, LogOut, Search, RefreshCw, Plus, CheckCircle2, 
  AlertTriangle, Shield, Building2, ChevronRight, ArrowRight, Eye, 
  Edit3, Trash2, Camera, Download, FileText, Check, X, Info, Clock, Layers
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';

// --- TYPES ---
export type Role = 'ADMIN' | 'QUẢN LÝ' | 'NHÂN VIÊN' | 'XEM';

export interface Branch {
  id: string;
  code: string;
  name: string;
  address: string;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  branchIds: string[]; // permitted branches
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Product {
  id: string;
  code: string;
  name: string;
  barcode: string;
  category: string;
  unit: string;
  status: 'ACTIVE' | 'INACTIVE';
  image?: string;
  hasIMEI?: boolean;
}

export interface LocationLevelConfig {
  branchId: string;
  levels: string[]; // e.g. ["Khu vực", "Kệ", "Tầng", "Sọt"]
}

export interface LocationNode {
  id: string;
  branchId: string;
  parentId: string | null; // null if root
  name: string;
  levelIndex: number;
  description: string;
  qrCode: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ProductLocationMapping {
  id: string;
  branchId: string;
  productId: string;
  locationId: string;
  assignedBy: string;
  timestamp: string;
  actionType: 'NEW' | 'ADD' | 'CHANGE';
}

export interface StocktakeSession {
  id: string;
  branchId: string;
  name: string;
  createdBy: string;
  startTime: string;
  snapshotTime: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'COMPLETED';
  note: string;
}

export interface StocktakeItem {
  id: string;
  sessionId: string;
  productId: string;
  locationId: string;
  kiotvietStock: number;
  actualStock: number;
  userId: string;
  status: 'PENDING' | 'COUNTED' | 'VARIANCE' | 'VERIFIED';
  timestamp: string;
}

export interface VehicleAsset {
  id: string;
  branchId: string;
  productId: string;
  imei: string;
  chassisNumber: string; // Số khung
  engineNumber: string; // Số máy
  locationId: string;
  status: 'IN_STOCK' | 'SOLD' | 'TRANSFER';
}

export interface StocktakeAsset {
  id: string;
  sessionId: string;
  vehicleId: string;
  actualLocationId: string;
  userId: string;
  status: 'CHECKED' | 'MISSING' | 'MISPLACED';
  timestamp: string;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED';
  totalSynced: number;
  message: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  username: string;
  action: string;
  details: string;
}

// --- INITIAL SEED DATA ---
const INITIAL_BRANCHES: Branch[] = [
  { id: 'branch-1', code: 'KV-Q1', name: 'Chi nhánh Quận 1', address: '123 Nguyễn Huệ, Q.1, TP.HCM' },
  { id: 'branch-2', code: 'KV-TD', name: 'Chi nhánh Thủ Đức', address: '456 Kha Vạn Cân, Thủ Đức, TP.HCM' },
  { id: 'branch-3', code: 'KV-TB', name: 'Kho Tổng Miền Nam', address: '789 Quốc Lộ 1A, Bình Tân, TP.HCM' },
];

const INITIAL_USERS: User[] = [
  { id: 'u-1', username: 'admin', fullName: 'Quản trị viên Hệ thống', role: 'ADMIN', branchIds: ['branch-1', 'branch-2', 'branch-3'], status: 'ACTIVE' },
  { id: 'u-2', username: 'manager_q1', fullName: 'Nguyễn Văn Quản L lý (Q1)', role: 'QUẢN LÝ', branchIds: ['branch-1'], status: 'ACTIVE' },
  { id: 'u-3', username: 'staff_q1', fullName: 'Trần Văn Nhân Viên (Q1)', role: 'NHÂN VIÊN', branchIds: ['branch-1'], status: 'ACTIVE' },
  { id: 'u-4', username: 'viewer_q1', fullName: 'Lê Thị Xem (Q1)', role: 'XEM', branchIds: ['branch-1'], status: 'ACTIVE' },
];

const INITIAL_PRODUCTS: Product[] = [
  { id: 'p-1', code: 'SP001', name: 'Dầu nhớt động cơ Honda 1L', barcode: '8931234567890', category: 'Dầu nhớt', unit: 'Bình', status: 'ACTIVE', hasIMEI: false, image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&q=80&w=200' },
  { id: 'p-2', code: 'SP002', name: 'Lốp không săm Michelin 90/90-14', barcode: '8931234567891', category: 'Lốp xe', unit: 'Cái', status: 'ACTIVE', hasIMEI: false, image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&q=80&w=200' },
  { id: 'p-3', code: 'SP003', name: 'Xe máy điện VinFast Klara S', barcode: '8931234567892', category: 'Xe điện', unit: 'Xe', status: 'ACTIVE', hasIMEI: true, image: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&q=80&w=200' },
  { id: 'p-4', code: 'SP004', name: 'Xe máy điện Yadea Odora', barcode: '8931234567893', category: 'Xe điện', unit: 'Xe', status: 'ACTIVE', hasIMEI: true, image: 'https://images.unsplash.com/photo-1502745388058-009f448c5a45?auto=format&fit=crop&q=80&w=200' },
  { id: 'p-5', code: 'SP005', name: 'Má phanh trước Exciter 150', barcode: '8931234567894', category: 'Phụ tùng', unit: 'Bộ', status: 'ACTIVE', hasIMEI: false, image: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&q=80&w=200' },
];

const INITIAL_LOCATIONS: LocationNode[] = [
  // Branch 1 locations
  { id: 'loc-1', branchId: 'branch-1', parentId: null, name: 'Khu A', levelIndex: 0, description: 'Kho phụ tùng chính', qrCode: 'QR_LOC_A', status: 'ACTIVE' },
  { id: 'loc-2', branchId: 'branch-1', parentId: 'loc-1', name: 'Kệ 1', levelIndex: 1, description: 'Kệ sát tường bên trái', qrCode: 'QR_LOC_A_K1', status: 'ACTIVE' },
  { id: 'loc-3', branchId: 'branch-1', parentId: 'loc-2', name: 'Tầng 2', levelIndex: 2, description: 'Tầng thứ 2 từ dưới lên', qrCode: 'QR_LOC_A_K1_T2', status: 'ACTIVE' },
  { id: 'loc-4', branchId: 'branch-1', parentId: 'loc-3', name: 'Sọt 3', levelIndex: 3, description: 'Sọt nhựa xanh', qrCode: 'QR_LOC_A_K1_T2_S3', status: 'ACTIVE' },
  { id: 'loc-5', branchId: 'branch-1', parentId: null, name: 'Khu B', levelIndex: 0, description: 'Kho lốp & dầu nhớt', qrCode: 'QR_LOC_B', status: 'ACTIVE' },
  { id: 'loc-6', branchId: 'branch-1', parentId: 'loc-5', name: 'Kệ 2', levelIndex: 1, description: 'Kệ trung tâm', qrCode: 'QR_LOC_B_K2', status: 'ACTIVE' },
  { id: 'loc-7', branchId: 'branch-1', parentId: null, name: 'Khu C', levelIndex: 0, description: 'Khu trưng bày xe điện', qrCode: 'QR_LOC_C', status: 'ACTIVE' },
  { id: 'loc-8', branchId: 'branch-1', parentId: 'loc-7', name: 'Dãy Xe 1', levelIndex: 1, description: 'Lối đi chính', qrCode: 'QR_LOC_C_DX1', status: 'ACTIVE' },
];

const INITIAL_MAPPINGS: ProductLocationMapping[] = [
  { id: 'm-1', branchId: 'branch-1', productId: 'p-1', locationId: 'loc-4', assignedBy: 'admin', timestamp: '2026-11-01 08:30', actionType: 'NEW' },
  { id: 'm-2', branchId: 'branch-1', productId: 'p-1', locationId: 'loc-6', assignedBy: 'admin', timestamp: '2026-11-02 09:15', actionType: 'ADD' },
  { id: 'm-3', branchId: 'branch-1', productId: 'p-2', locationId: 'loc-6', assignedBy: 'admin', timestamp: '2026-11-01 10:00', actionType: 'NEW' },
  { id: 'm-4', branchId: 'branch-1', productId: 'p-3', locationId: 'loc-8', assignedBy: 'admin', timestamp: '2026-11-03 14:00', actionType: 'NEW' },
  { id: 'm-5', branchId: 'branch-1', productId: 'p-4', locationId: 'loc-8', assignedBy: 'admin', timestamp: '2026-11-03 14:05', actionType: 'NEW' },
];

const INITIAL_VEHICLES: VehicleAsset[] = [
  { id: 'v-1', branchId: 'branch-1', productId: 'p-3', imei: 'IMEI982347293', chassisNumber: 'SKVIN982347293', engineNumber: 'SMVIN823472', locationId: 'loc-8', status: 'IN_STOCK' },
  { id: 'v-2', branchId: 'branch-1', productId: 'p-3', imei: 'IMEI982347294', chassisNumber: 'SKVIN982347294', engineNumber: 'SMVIN823473', locationId: 'loc-8', status: 'IN_STOCK' },
  { id: 'v-3', branchId: 'branch-1', productId: 'p-4', imei: 'IMEIYD123456789', chassisNumber: 'SKYAD123456789', engineNumber: 'SMYAD543210', locationId: 'loc-8', status: 'IN_STOCK' },
];

const INITIAL_SESSIONS: StocktakeSession[] = [
  { id: 'ses-1', branchId: 'branch-1', name: 'Kiểm kho định kỳ tháng 11/2026', createdBy: 'admin', startTime: '2026-11-15 08:00', snapshotTime: '2026-11-15 08:00', status: 'IN_PROGRESS', note: 'Kiểm toàn bộ phụ tùng và xe điện chi nhánh Quận 1' }
];

// Helper to compute full location path name
export function getLocationPathName(locId: string, locations: LocationNode[]): string {
  const loc = locations.find(l => l.id === locId);
  if (!loc) return 'Chưa phân vị trí';
  const path: string[] = [loc.name];
  let currentParentId = loc.parentId;
  while (currentParentId) {
    const parent = locations.find(l => l.id === currentParentId);
    if (parent) {
      path.unshift(parent.name);
      currentParentId = parent.parentId;
    } else {
      break;
    }
  }
  return path.join(' - ');
}

export default function App() {
  // --- STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('kv_user');
    return saved ? JSON.parse(saved) : INITIAL_USERS[0]; // Default to admin for smooth testing
  });

  const [currentBranchId, setCurrentBranchId] = useState<string>(() => {
    const saved = localStorage.getItem('kv_branch');
    return saved || 'branch-1';
  });

  const [activeTab, setActiveTab] = useState<'home' | 'lookup' | 'locations' | 'stocktake' | 'vehicles' | 'reports' | 'settings'>('home');

  // Data states with localStorage persistence
  const [branches, setBranches] = useState<Branch[]>(() => {
    const s = localStorage.getItem('kv_branches');
    return s ? JSON.parse(s) : INITIAL_BRANCHES;
  });

  const [users, setUsers] = useState<User[]>(() => {
    const s = localStorage.getItem('kv_users');
    return s ? JSON.parse(s) : INITIAL_USERS;
  });

  const [products, setProducts] = useState<Product[]>(() => {
    const s = localStorage.getItem('kv_products');
    return s ? JSON.parse(s) : INITIAL_PRODUCTS;
  });

  const [locations, setLocations] = useState<LocationNode[]>(() => {
    const s = localStorage.getItem('kv_locations');
    return s ? JSON.parse(s) : INITIAL_LOCATIONS;
  });

  const [mappings, setMappings] = useState<ProductLocationMapping[]>(() => {
    const s = localStorage.getItem('kv_mappings');
    return s ? JSON.parse(s) : INITIAL_MAPPINGS;
  });

  const [vehicles, setVehicles] = useState<VehicleAsset[]>(() => {
    const s = localStorage.getItem('kv_vehicles');
    return s ? JSON.parse(s) : INITIAL_VEHICLES;
  });

  const [sessions, setSessions] = useState<StocktakeSession[]>(() => {
    const s = localStorage.getItem('kv_sessions');
    return s ? JSON.parse(s) : INITIAL_SESSIONS;
  });

  const [stocktakeItems, setStocktakeItems] = useState<StocktakeItem[]>(() => {
    const s = localStorage.getItem('kv_stocktake_items');
    return s ? JSON.parse(s) : [
      { id: 'si-1', sessionId: 'ses-1', productId: 'p-1', locationId: 'loc-4', kiotvietStock: 45, actualStock: 45, userId: 'u-3', status: 'COUNTED', timestamp: '2026-11-15 09:30' },
      { id: 'si-2', sessionId: 'ses-1', productId: 'p-2', locationId: 'loc-6', kiotvietStock: 18, actualStock: 17, userId: 'u-3', status: 'VARIANCE', timestamp: '2026-11-15 09:45' }
    ];
  });

  const [syncLogs, setSyncLogs] = useState<SyncLog[]>(() => {
    const s = localStorage.getItem('kv_sync_logs');
    return s ? JSON.parse(s) : [
      { id: 'sl-1', timestamp: '2026-11-15 06:30:00', status: 'SUCCESS', totalSynced: 5, message: 'Đồng bộ tự động hàng ngày thành công từ KiotViet API.' }
    ];
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const s = localStorage.getItem('kv_audit_logs');
    return s ? JSON.parse(s) : [
      { id: 'al-1', timestamp: '2026-11-15 08:00:12', username: 'admin', action: 'Tạo phiên kiểm kho', details: 'Tạo phiên: Kiểm kho định kỳ tháng 11/2026' }
    ];
  });

  // Save to localStorage on change
  useEffect(() => {
    if (currentUser) localStorage.setItem('kv_user', JSON.stringify(currentUser));
    else localStorage.removeItem('kv_user');
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('kv_branch', currentBranchId);
  }, [currentBranchId]);

  useEffect(() => {
    localStorage.setItem('kv_products', JSON.stringify(products));
    localStorage.setItem('kv_locations', JSON.stringify(locations));
    localStorage.setItem('kv_mappings', JSON.stringify(mappings));
    localStorage.setItem('kv_vehicles', JSON.stringify(vehicles));
    localStorage.setItem('kv_sessions', JSON.stringify(sessions));
    localStorage.setItem('kv_stocktake_items', JSON.stringify(stocktakeItems));
    localStorage.setItem('kv_sync_logs', JSON.stringify(syncLogs));
    localStorage.setItem('kv_audit_logs', JSON.stringify(auditLogs));
    localStorage.setItem('kv_users', JSON.stringify(users));
  }, [products, locations, mappings, vehicles, sessions, stocktakeItems, syncLogs, auditLogs, users]);

  // Helper log action
  const logAudit = (action: string, details: string) => {
    if (!currentUser) return;
    const newLog: AuditLog = {
      id: 'al-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      username: currentUser.username,
      action,
      details
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Simulated KiotViet Stock fetcher (with randomized slight variation or base value)
  const getKiotVietStock = (branchId: string, productId: string) => {
    // Deterministic mock stock based on branch and product
    const hash = (branchId + productId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hash % 40) + 5;
  };

  // Modals state
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'lookup' | 'location' | 'stocktake' | 'vehicle' | null>(null);
  const [scannerCallback, setScannerCallback] = useState<((code: string) => void) | null>(null);

  const [selectedLocationForQR, setSelectedLocationForQR] = useState<LocationNode | null>(null);
  const [showLocationQRModal, setShowLocationQRModal] = useState(false);

  const [assignModalProduct, setAssignModalProduct] = useState<Product | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // Trigger Scanner
  const openScanner = (target: 'lookup' | 'location' | 'stocktake' | 'vehicle', callback: (code: string) => void) => {
    setScannerTarget(target);
    setScannerCallback(() => callback);
    setShowScannerModal(true);
  };

  // Manual KiotViet Sync
  const handleSyncKiotViet = () => {
    const count = products.length;
    const newLog: SyncLog = {
      id: 'sl-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      status: 'SUCCESS',
      totalSynced: count,
      message: `Đồng bộ thủ công thành công ${count} sản phẩm từ KiotViet API.`
    };
    setSyncLogs(prev => [newLog, ...prev]);
    logAudit('Đồng bộ KiotViet', `Đồng bộ thủ công ${count} sản phẩm`);
    alert('Đồng bộ sản phẩm từ KiotViet thành công!');
  };

  if (!currentUser) {
    return <LoginScreen users={users} onLogin={(u) => setCurrentUser(u)} branches={branches} />;
  }

  const currentBranch = branches.find(b => b.id === currentBranchId) || branches[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 font-sans antialiased">
      {/* Top Header */}
      <header className="bg-indigo-700 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-white/10 p-2 rounded-lg">
              <Building2 className="w-5 h-5 text-indigo-100" />
            </div>
            <div>
              <div className="text-xs text-indigo-200 font-medium">Chi nhánh làm việc</div>
              <select 
                value={currentBranchId}
                onChange={(e) => setCurrentBranchId(e.target.value)}
                className="bg-indigo-800 text-white text-sm font-bold rounded px-2 py-0.5 border border-indigo-600 focus:outline-none"
              >
                {branches
                  .filter(b => currentUser.role === 'ADMIN' || currentUser.branchIds.includes(b.id))
                  .map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))
                }
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <div className="text-xs font-semibold">{currentUser.fullName}</div>
              <span className="inline-block px-1.5 py-0.2 bg-indigo-800 text-indigo-200 text-[10px] rounded uppercase font-bold">
                {currentUser.role}
              </span>
            </div>
            <button 
              onClick={() => setCurrentUser(null)} 
              className="p-1.5 bg-indigo-800 hover:bg-indigo-900 rounded-lg text-indigo-200 transition"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content View */}
      <main className="max-w-md mx-auto px-4 py-4">
        {activeTab === 'home' && (
          <HomeView 
            setActiveTab={setActiveTab} 
            currentBranch={currentBranch} 
            productsCount={products.length}
            locationsCount={locations.filter(l => l.branchId === currentBranch.id).length}
            activeSessionsCount={sessions.filter(s => s.branchId === currentBranch.id && s.status !== 'COMPLETED').length}
            vehiclesCount={vehicles.filter(v => v.branchId === currentBranch.id).length}
            onSync={handleSyncKiotViet}
            openScanner={openScanner}
          />
        )}
        {activeTab === 'lookup' && (
          <LookupView 
            products={products} 
            currentBranchId={currentBranch.id} 
            locations={locations}
            mappings={mappings}
            getKiotVietStock={getKiotVietStock}
            openScanner={openScanner}
            onOpenAssign={(prod) => {
              setAssignModalProduct(prod);
              setShowAssignModal(true);
            }}
          />
        )}
        {activeTab === 'locations' && (
          <LocationsView 
            branchId={currentBranch.id}
            locations={locations}
            setLocations={setLocations}
            products={products}
            mappings={mappings}
            onShowQR={(loc) => {
              setSelectedLocationForQR(loc);
              setShowLocationQRModal(true);
            }}
            openScanner={openScanner}
          />
        )}
        {activeTab === 'stocktake' && (
          <StocktakeView 
            branchId={currentBranch.id}
            currentUser={currentUser}
            sessions={sessions}
            setSessions={setSessions}
            products={products}
            locations={locations}
            stocktakeItems={stocktakeItems}
            setStocktakeItems={setStocktakeItems}
            getKiotVietStock={getKiotVietStock}
            logAudit={logAudit}
            openScanner={openScanner}
          />
        )}
        {activeTab === 'vehicles' && (
          <VehicleView 
            branchId={currentBranch.id}
            currentUser={currentUser}
            vehicles={vehicles}
            setVehicles={setVehicles}
            products={products}
            locations={locations}
            logAudit={logAudit}
            openScanner={openScanner}
          />
        )}
        {activeTab === 'reports' && (
          <ReportsView 
            branchId={currentBranch.id}
            syncLogs={syncLogs}
            auditLogs={auditLogs}
            sessions={sessions}
            stocktakeItems={stocktakeItems}
            products={products}
            locations={locations}
            getKiotVietStock={getKiotVietStock}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsView 
            currentUser={currentUser}
            branches={branches}
            users={users}
            setUsers={setUsers}
            locations={locations}
            setLocations={setLocations}
            currentBranchId={currentBranch.id}
            onSyncKiotViet={handleSyncKiotViet}
            syncLogs={syncLogs}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="bg-white border-t border-slate-200 fixed bottom-0 left-0 right-0 z-30 shadow-lg">
        <div className="max-w-md mx-auto flex justify-around py-2">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center flex-1 py-1 transition ${activeTab === 'home' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Building2 className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Trang chủ</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('lookup')}
            className={`flex flex-col items-center flex-1 py-1 transition ${activeTab === 'lookup' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Search className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Tra cứu</span>
          </button>

          <button 
            onClick={() => setActiveTab('locations')}
            className={`flex flex-col items-center flex-1 py-1 transition ${activeTab === 'locations' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <MapPin className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Vị trí & QR</span>
          </button>

          <button 
            onClick={() => setActiveTab('stocktake')}
            className={`flex flex-col items-center flex-1 py-1 transition ${activeTab === 'stocktake' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <ClipboardCheck className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Kiểm kho</span>
          </button>

          <button 
            onClick={() => setActiveTab('vehicles')}
            className={`flex flex-col items-center flex-1 py-1 transition ${activeTab === 'vehicles' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Bike className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Kiểm xe</span>
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center flex-1 py-1 transition ${activeTab === 'settings' || activeTab === 'reports' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'}`}
          >
            <Settings className="w-5 h-5 mb-0.5" />
            <span className="text-[10px]">Quản trị</span>
          </button>
        </div>
      </nav>

      {/* --- MODALS --- */}
      {showScannerModal && (
        <ScannerModal 
          target={scannerTarget}
          onClose={() => setShowScannerModal(false)}
          onScanSuccess={(code) => {
            setShowScannerModal(false);
            if (scannerCallback) scannerCallback(code);
          }}
          products={products}
          locations={locations}
          vehicles={vehicles}
        />
      )}

      {showLocationQRModal && selectedLocationForQR && (
        <LocationQRModal 
          location={selectedLocationForQR}
          locations={locations}
          onClose={() => {
            setShowLocationQRModal(false);
            setSelectedLocationForQR(null);
          }}
        />
      )}

      {showAssignModal && assignModalProduct && (
        <AssignLocationModal 
          product={assignModalProduct}
          branchId={currentBranch.id}
          locations={locations}
          mappings={mappings}
          setMappings={setMappings}
          currentUser={currentUser}
          onClose={() => {
            setShowAssignModal(false);
            setAssignModalProduct(null);
          }}
          logAudit={logAudit}
        />
      )}
    </div>
  );
}

// ==================== LOGIN SCREEN ====================
function LoginScreen({ users, onLogin, branches }: { users: User[], onLogin: (u: User) => void, branches: Branch[] }) {
  const [selectedUserId, setSelectedUserId] = useState(users[0]?.id || '');
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = users.find(u => u.username.toLowerCase() === usernameInput.toLowerCase());
    if (found) {
      onLogin(found);
    } else {
      setError('Tên đăng nhập không tồn tại! Vui lòng chọn tài khoản mẫu bên dưới.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 flex flex-col items-center justify-center p-4 text-white">
      <div className="max-w-sm w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 shadow-2xl">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-indigo-600 rounded-2xl shadow-lg mb-3">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold">Định vị Hàng hóa & Kiểm kho</h1>
          <p className="text-xs text-indigo-200 mt-1">KiotViet & Google Sheets Integration v1.4</p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-indigo-200 mb-1">Tài khoản đăng nhập</label>
            <input 
              type="text" 
              value={usernameInput} 
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Nhập tên đăng nhập (vd: admin, staff_q1)" 
              className="w-full bg-black/30 border border-indigo-500/40 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-indigo-200 mb-1">Mật khẩu</label>
            <input 
              type="password" 
              value={passwordInput} 
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="••••••••" 
              className="w-full bg-black/30 border border-indigo-500/40 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>

          {error && <div className="text-xs text-rose-300 bg-rose-900/40 p-2 rounded border border-rose-700">{error}</div>}

          <button 
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 font-semibold py-2.5 rounded-xl text-sm shadow-lg transition"
          >
            Đăng nhập hệ thống
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="text-xs text-indigo-200 mb-2 font-medium">Hoặc chọn nhanh tài khoản mẫu:</div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {users.map(u => (
              <button
                key={u.id}
                onClick={() => onLogin(u)}
                className="w-full text-left bg-white/5 hover:bg-white/15 p-2.5 rounded-xl border border-white/10 transition flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-white">{u.fullName}</div>
                  <div className="text-[10px] text-indigo-300">User: {u.username} • Vai trò: {u.role}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-300" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== HOME VIEW ====================
function HomeView({ 
  setActiveTab, 
  currentBranch, 
  productsCount, 
  locationsCount, 
  activeSessionsCount, 
  vehiclesCount, 
  onSync,
  openScanner
}: { 
  setActiveTab: (tab: any) => void, 
  currentBranch: Branch, 
  productsCount: number, 
  locationsCount: number, 
  activeSessionsCount: number,
  vehiclesCount: number,
  onSync: () => void,
  openScanner: (target: any, cb: (code: string) => void) => void
}) {
  return (
    <div className="space-y-4">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="text-xs font-medium text-indigo-200">Hệ thống Quản lý Vị trí & Kho</div>
          <h2 className="text-xl font-bold mt-0.5">{currentBranch.name}</h2>
          <p className="text-xs text-indigo-100 mt-1">{currentBranch.address}</p>
          
          <div className="mt-4 flex space-x-2">
            <button 
              onClick={onSync}
              className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-lg font-medium flex items-center space-x-1 transition backdrop-blur-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Đồng bộ KiotViet</span>
            </button>
          </div>
        </div>
        <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
          <Package className="w-36 h-36" />
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 grid grid-cols-2 gap-3">
        <button 
          onClick={() => setActiveTab('lookup')}
          className="bg-indigo-50 hover:bg-indigo-100 p-3.5 rounded-xl flex items-center space-x-3 transition text-left"
        >
          <div className="bg-indigo-600 text-white p-2.5 rounded-xl">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Tra cứu</div>
            <div className="text-sm font-bold text-slate-800">Sản phẩm & Tồn</div>
          </div>
        </button>

        <button 
          onClick={() => openScanner('lookup', (code) => {
            setActiveTab('lookup');
          })}
          className="bg-violet-50 hover:bg-violet-100 p-3.5 rounded-xl flex items-center space-x-3 transition text-left"
        >
          <div className="bg-violet-600 text-white p-2.5 rounded-xl">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Quét nhanh</div>
            <div className="text-sm font-bold text-slate-800">Mã vạch / QR</div>
          </div>
        </button>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div 
          onClick={() => setActiveTab('locations')}
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:border-indigo-200 transition"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Vị trí lưu trữ</span>
            <MapPin className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{locationsCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Cấu trúc linh hoạt theo cấp</div>
        </div>

        <div 
          onClick={() => setActiveTab('stocktake')}
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:border-indigo-200 transition"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Phiên kiểm kho</span>
            <ClipboardCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{activeSessionsCount}</div>
          <div className="text-[10px] text-emerald-600 font-medium mt-1">Đang hoạt động</div>
        </div>

        <div 
          onClick={() => setActiveTab('vehicles')}
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:border-indigo-200 transition"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Xe điện (IMEI)</span>
            <Bike className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{vehiclesCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Quản lý số khung/máy</div>
        </div>

        <div 
          onClick={() => setActiveTab('lookup')}
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:border-indigo-200 transition"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Danh mục SP</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">{productsCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Dùng chung toàn hệ thống</div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Chức năng nghiệp vụ</h3>
        
        <div className="space-y-2">
          <button 
            onClick={() => setActiveTab('locations')}
            className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-100 text-indigo-700 p-2 rounded-lg"><MapPin className="w-4 h-4" /></div>
              <div>
                <div className="text-xs font-bold text-slate-800">Quản lý & In QR Vị trí</div>
                <div className="text-[10px] text-slate-500">Thiết lập khu vực, kệ, tầng, sọt</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button 
            onClick={() => setActiveTab('stocktake')}
            className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-100 text-emerald-700 p-2 rounded-lg"><ClipboardCheck className="w-4 h-4" /></div>
              <div>
                <div className="text-xs font-bold text-slate-800">Kiểm kho & Đối chiếu KiotViet</div>
                <div className="text-[10px] text-slate-500">Ghi nhận thực tế, chênh lệch kho</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          <button 
            onClick={() => setActiveTab('vehicles')}
            className="w-full p-3 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-amber-100 text-amber-700 p-2 rounded-lg"><Bike className="w-4 h-4" /></div>
              <div>
                <div className="text-xs font-bold text-slate-800">Kiểm kê xe theo IMEI / Số khung</div>
                <div className="text-[10px] text-slate-500">Tách chuỗi định danh, quét mã nhanh</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== LOOKUP VIEW ====================
function LookupView({ 
  products, 
  currentBranchId, 
  locations, 
  mappings, 
  getKiotVietStock,
  openScanner,
  onOpenAssign
}: { 
  products: Product[], 
  currentBranchId: string, 
  locations: LocationNode[], 
  mappings: ProductLocationMapping[], 
  getKiotVietStock: (bId: string, pId: string) => number,
  openScanner: (target: any, cb: (code: string) => void) => void,
  onOpenAssign: (p: Product) => void
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.barcode.includes(searchTerm)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-800">Tra cứu Sản phẩm & Tồn kho</h2>
        <button 
          onClick={() => openScanner('lookup', (code) => setSearchTerm(code))}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl flex items-center space-x-1 text-xs font-medium shadow"
        >
          <Camera className="w-4 h-4" />
          <span>Quét mã</span>
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Nhập mã, tên sản phẩm hoặc mã vạch..." 
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500 shadow-sm"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {selectedProduct ? (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                {selectedProduct.code}
              </span>
              <h3 className="text-base font-bold text-slate-800 mt-1">{selectedProduct.name}</h3>
            </div>
            <button 
              onClick={() => setSelectedProduct(null)}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-medium"
            >
              ← Quay lại danh sách
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-indigo-50 p-3 rounded-xl">
              <div className="text-[10px] text-indigo-600 font-bold uppercase">Tồn kho KiotViet (Hiện tại)</div>
              <div className="text-2xl font-black text-indigo-900 mt-1">
                {getKiotVietStock(currentBranchId, selectedProduct.id)} <span className="text-xs font-normal">{selectedProduct.unit}</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">Cập nhật trực tiếp từ KiotViet API</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl">
              <div className="text-[10px] text-slate-500 font-bold uppercase">Nhóm hàng / ĐVT</div>
              <div className="text-sm font-bold text-slate-800 mt-1">{selectedProduct.category}</div>
              <div className="text-xs text-slate-500">Đơn vị: {selectedProduct.unit}</div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-600 uppercase">Vị trí lưu trữ thực tế trong kho</h4>
              <button 
                onClick={() => onOpenAssign(selectedProduct)}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-bold flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Bố trí / Thay đổi vị trí</span>
              </button>
            </div>

            {mappings.filter(m => m.branchId === currentBranchId && m.productId === selectedProduct.id).length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-center text-xs text-amber-800">
                Sản phẩm chưa được bố trí vị trí nào trong chi nhánh này.
              </div>
            ) : (
              <div className="space-y-2">
                {mappings
                  .filter(m => m.branchId === currentBranchId && m.productId === selectedProduct.id)
                  .map(m => {
                    const locName = getLocationPathName(m.locationId, locations);
                    const locObj = locations.find(l => l.id === m.locationId);
                    return (
                      <div key={m.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-start justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                            <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{locName}</span>
                          </div>
                          {locObj?.description && (
                            <div className="text-[11px] text-slate-500 mt-0.5">Mô tả: {locObj.description}</div>
                          )}
                          <div className="text-[10px] text-slate-400 mt-1">Ghi nhận lúc: {m.timestamp} bởi {m.assignedBy}</div>
                        </div>
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded">
                          {m.actionType}
                        </span>
                      </div>
                    );
                  })
                }
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-slate-500 font-medium px-1">Kết quả ({filteredProducts.length} sản phẩm)</div>
          {filteredProducts.map(p => {
            const stock = getKiotVietStock(currentBranchId, p.id);
            const prodMappings = mappings.filter(m => m.branchId === currentBranchId && m.productId === p.id);
            return (
              <div 
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{p.code}</span>
                      {p.hasIMEI && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Quản lý IMEI</span>}
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 mt-0.5">{p.name}</h4>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Vị trí: {prodMappings.length > 0 ? getLocationPathName(prodMappings[0].locationId, locations) : 'Chưa có vị trí'}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-xs text-slate-400 font-medium">Tồn KV</div>
                  <div className="text-sm font-bold text-indigo-600">{stock} {p.unit}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== LOCATIONS VIEW ====================
function LocationsView({ 
  branchId, 
  locations, 
  setLocations, 
  products, 
  mappings,
  onShowQR,
  openScanner
}: { 
  branchId: string, 
  locations: LocationNode[], 
  setLocations: React.Dispatch<React.SetStateAction<LocationNode[]>>, 
  products: Product[],
  mappings: ProductLocationMapping[],
  onShowQR: (loc: LocationNode) => void,
  openScanner: (target: any, cb: (code: string) => void) => void
}) {
  const [selectedLocId, setSelectedLocId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLocName, setNewLocName] = useState('');
  const [newLocParentId, setNewLocParentId] = useState<string | null>(null);
  const [newLocDesc, setNewLocDesc] = useState('');

  const branchLocations = locations.filter(l => l.branchId === branchId);

  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocName.trim()) return;

    const parent = branchLocations.find(l => l.id === newLocParentId);
    const levelIndex = parent ? parent.levelIndex + 1 : 0;

    const newLoc: LocationNode = {
      id: 'loc-' + Date.now(),
      branchId,
      parentId: newLocParentId,
      name: newLocName.trim(),
      levelIndex,
      description: newLocDesc.trim(),
      qrCode: 'QR_LOC_' + Date.now(),
      status: 'ACTIVE'
    };

    setLocations(prev => [...prev, newLoc]);
    setNewLocName('');
    setNewLocDesc('');
    setShowAddModal(false);
  };

  const selectedLoc = branchLocations.find(l => l.id === selectedLocId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Quản lý Vị trí Kho</h2>
          <p className="text-xs text-slate-500">Cấu trúc phân cấp động theo chi nhánh</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => openScanner('location', (code) => {
              const found = branchLocations.find(l => l.qrCode === code || l.id === code);
              if (found) setSelectedLocId(found.id);
              else alert('Không tìm thấy vị trí với mã QR này!');
            })}
            className="bg-violet-600 hover:bg-violet-700 text-white p-2 rounded-xl text-xs font-medium flex items-center space-x-1 shadow"
          >
            <Camera className="w-4 h-4" />
            <span>Quét QR</span>
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl text-xs font-medium flex items-center space-x-1 shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm cấp</span>
          </button>
        </div>
      </div>

      {selectedLoc ? (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                Đường dẫn vị trí đầy đủ
              </span>
              <h3 className="text-base font-bold text-slate-800 mt-1">{getLocationPathName(selectedLoc.id, locations)}</h3>
            </div>
            <button 
              onClick={() => setSelectedLocId(null)}
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-medium"
            >
              ← Danh sách
            </button>
          </div>

          {selectedLoc.description && (
            <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
              <strong>Mô tả chi tiết:</strong> {selectedLoc.description}
            </div>
          )}

          <div className="flex space-x-2">
            <button 
              onClick={() => onShowQR(selectedLoc)}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow"
            >
              <QrCode className="w-4 h-4" />
              <span>Xem & In Mã QR Vị trí</span>
            </button>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">Sản phẩm được bố trí tại vị trí này</h4>
            {mappings.filter(m => m.branchId === branchId && m.locationId === selectedLoc.id).length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center text-xs text-slate-500">
                Chưa có sản phẩm nào được bố trí tại vị trí này.
              </div>
            ) : (
              <div className="space-y-2">
                {mappings
                  .filter(m => m.branchId === branchId && m.locationId === selectedLoc.id)
                  .map(m => {
                    const prod = products.find(p => p.id === m.productId);
                    if (!prod) return null;
                    return (
                      <div key={m.id} className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{prod.code}</span>
                          <div className="text-xs font-bold text-slate-800 mt-0.5">{prod.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Bố trí: {m.timestamp}</div>
                        </div>
                        <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded">{m.actionType}</span>
                      </div>
                    );
                  })
                }
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-slate-500 font-medium px-1">Danh sách vị trí trong kho ({branchLocations.length})</div>
          {branchLocations.map(loc => {
            const path = getLocationPathName(loc.id, locations);
            const count = mappings.filter(m => m.branchId === branchId && m.locationId === loc.id).length;
            return (
              <div 
                key={loc.id}
                onClick={() => setSelectedLocId(loc.id)}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">{path}</h4>
                    {loc.description && <p className="text-[11px] text-slate-500 mt-0.5">{loc.description}</p>}
                    <div className="text-[10px] text-indigo-600 font-medium mt-1">{count} sản phẩm bố trí</div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onShowQR(loc);
                    }}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                    title="Xem QR"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Location Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Thêm Vị trí / Cấp kho mới</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLocation} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Vị trí cha (Tùy chọn)</label>
                <select 
                  value={newLocParentId || ''} 
                  onChange={(e) => setNewLocParentId(e.target.value ? e.target.value : null)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Là cấp gốc (Khu vực) --</option>
                  {branchLocations.map(l => (
                    <option key={l.id} value={l.id}>{getLocationPathName(l.id, locations)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tên vị trí (vd: Kệ 1, Tầng 2, Sọt 3)</label>
                <input 
                  type="text" 
                  value={newLocName}
                  onChange={(e) => setNewLocName(e.target.value)}
                  placeholder="Nhập tên hiển thị..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Mô tả chi tiết</label>
                <textarea 
                  value={newLocDesc}
                  onChange={(e) => setNewLocDesc(e.target.value)}
                  placeholder="Nhập mô tả vị trí (vd: Sát tường bên trái)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 h-20"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold shadow"
                >
                  Tạo vị trí
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== STOCKTAKE VIEW ====================
function StocktakeView({ 
  branchId, 
  currentUser, 
  sessions, 
  setSessions, 
  products, 
  locations, 
  stocktakeItems, 
  setStocktakeItems,
  getKiotVietStock,
  logAudit,
  openScanner
}: { 
  branchId: string, 
  currentUser: User, 
  sessions: StocktakeSession[], 
  setSessions: React.Dispatch<React.SetStateAction<StocktakeSession[]>>, 
  products: Product[], 
  locations: LocationNode[], 
  stocktakeItems: StocktakeItem[], 
  setStocktakeItems: React.Dispatch<React.SetStateAction<StocktakeItem[]>>,
  getKiotVietStock: (bId: string, pId: string) => number,
  logAudit: (action: string, details: string) => void,
  openScanner: (target: any, cb: (code: string) => void) => void
}) {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [sessionNote, setSessionNote] = useState('');

  // Counting form inside session
  const [scanProdCode, setScanProdCode] = useState('');
  const [selectedLocId, setSelectedLocId] = useState('');
  const [actualQtyInput, setActualQtyInput] = useState('');

  const branchSessions = sessions.filter(s => s.branchId === branchId);
  const activeSession = branchSessions.find(s => s.id === activeSessionId);

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionName.trim()) return;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newSession: StocktakeSession = {
      id: 'ses-' + Date.now(),
      branchId,
      name: sessionName.trim(),
      createdBy: currentUser.username,
      startTime: nowStr,
      snapshotTime: nowStr,
      status: 'IN_PROGRESS',
      note: sessionNote.trim()
    };

    setSessions(prev => [newSession, ...prev]);
    logAudit('Tạo phiên kiểm kho', `Phiên: ${newSession.name} (Chốt tồn KiotViet lúc ${nowStr})`);
    setSessionName('');
    setSessionNote('');
    setShowCreateModal(false);
    setActiveSessionId(newSession.id);
  };

  const handleSaveCount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    const prod = products.find(p => p.code.toLowerCase() === scanProdCode.trim().toLowerCase() || p.barcode === scanProdCode.trim());
    if (!prod) {
      alert('Không tìm thấy sản phẩm với mã hoặc barcode này!');
      return;
    }
    if (!selectedLocId) {
      alert('Vui lòng chọn vị trí kiểm!');
      return;
    }
    const qty = parseInt(actualQtyInput);
    if (isNaN(qty) || qty < 0) {
      alert('Số lượng thực tế không hợp lệ!');
      return;
    }

    const kvStock = getKiotVietStock(branchId, prod.id);
    const diff = qty - kvStock;
    const status = diff === 0 ? 'COUNTED' : 'VARIANCE';
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Check if item already recorded for this session + prod + location
    const existingIndex = stocktakeItems.findIndex(si => si.sessionId === activeSession.id && si.productId === prod.id && si.locationId === selectedLocId);

    if (existingIndex >= 0) {
      const updated = [...stocktakeItems];
      updated[existingIndex] = {
        ...updated[existingIndex],
        actualStock: qty,
        kiotvietStock: kvStock,
        status,
        timestamp: nowStr,
        userId: currentUser.username
      };
      setStocktakeItems(updated);
    } else {
      const newItem: StocktakeItem = {
        id: 'si-' + Date.now(),
        sessionId: activeSession.id,
        productId: prod.id,
        locationId: selectedLocId,
        kiotvietStock: kvStock,
        actualStock: qty,
        userId: currentUser.username,
        status,
        timestamp: nowStr
      };
      setStocktakeItems(prev => [newItem, ...prev]);
    }

    logAudit('Ghi nhận kiểm kho', `SP: ${prod.code} tại ${getLocationPathName(selectedLocId, locations)} - Thực tế: ${qty}`);
    setScanProdCode('');
    setActualQtyInput('');
    alert('Đã lưu kết quả kiểm kho thành công!');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Kiểm kho & Đối chiếu</h2>
          <p className="text-xs text-slate-500">Chốt tồn KiotViet và ghi nhận thực tế</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-xl text-xs font-medium flex items-center space-x-1 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo phiên kiểm</span>
        </button>
      </div>

      {activeSession ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                  {activeSession.status}
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-1">{activeSession.name}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Chốt tồn KiotViet: {activeSession.snapshotTime}</p>
              </div>
              <button 
                onClick={() => setActiveSessionId(null)}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-medium"
              >
                ← Danh sách phiên
              </button>
            </div>

            {/* Input Form for counting */}
            <form onSubmit={handleSaveCount} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase">Nhập số liệu kiểm thực tế</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">Mã SP hoặc Barcode</label>
                  <div className="flex space-x-1">
                    <input 
                      type="text" 
                      value={scanProdCode}
                      onChange={(e) => setScanProdCode(e.target.value)}
                      placeholder="Mã SP / Barcode"
                      required
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-indigo-500"
                    />
                    <button 
                      type="button"
                      onClick={() => openScanner('stocktake', (code) => setScanProdCode(code))}
                      className="bg-indigo-600 text-white p-2 rounded-lg"
                      title="Quét mã"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">Vị trí kiểm</label>
                  <select 
                    value={selectedLocId}
                    onChange={(e) => setSelectedLocId(e.target.value)}
                    required
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Chọn vị trí --</option>
                    {locations.filter(l => l.branchId === branchId).map(l => (
                      <option key={l.id} value={l.id}>{getLocationPathName(l.id, locations)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-500 mb-1">Số lượng thực tế kiểm đếm</label>
                <input 
                  type="number" 
                  value={actualQtyInput}
                  onChange={(e) => setActualQtyInput(e.target.value)}
                  placeholder="Nhập số lượng..."
                  min="0"
                  required
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 rounded-xl text-xs font-bold shadow"
              >
                Lưu kết quả kiểm
              </button>
            </form>
          </div>

          {/* Recorded items list */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-600 uppercase px-1">Danh sách đã kiểm trong phiên</h4>
            {stocktakeItems.filter(si => si.sessionId === activeSession.id).length === 0 ? (
              <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                Chưa có dữ liệu kiểm đếm nào được ghi nhận.
              </div>
            ) : (
              stocktakeItems
                .filter(si => si.sessionId === activeSession.id)
                .map(item => {
                  const prod = products.find(p => p.id === item.productId);
                  const locPath = getLocationPathName(item.locationId, locations);
                  const diff = item.actualStock - item.kiotvietStock;
                  return (
                    <div key={item.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{prod?.code}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${diff === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                          {diff === 0 ? 'Khớp tồn' : `Chênh lệch: ${diff > 0 ? '+' : ''}${diff}`}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-800">{prod?.name}</div>
                      <div className="text-[11px] text-slate-500">📍 {locPath}</div>
                      
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2 rounded-xl text-center text-xs">
                        <div>
                          <div className="text-[9px] text-slate-400">Tồn KiotViet</div>
                          <div className="font-bold text-slate-700">{item.kiotvietStock}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-400">Thực tế</div>
                          <div className="font-bold text-indigo-600">{item.actualStock}</div>
                        </div>
                        <div>
                          <div className="text-[9px] text-slate-400">Chênh lệch</div>
                          <div className={`font-bold ${diff === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{diff > 0 ? `+${diff}` : diff}</div>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-slate-500 font-medium px-1">Danh sách phiên kiểm kho ({branchSessions.length})</div>
          {branchSessions.map(ses => (
            <div 
              key={ses.id}
              onClick={() => setActiveSessionId(ses.id)}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-indigo-300 transition cursor-pointer flex items-center justify-between"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{ses.status}</span>
                  <span className="text-[10px] text-slate-400">{ses.snapshotTime}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800 mt-1">{ses.name}</h4>
                {ses.note && <p className="text-xs text-slate-500 mt-0.5">{ses.note}</p>}
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400" />
            </div>
          ))}
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Tạo Phiên Kiểm Kho Mới</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tên phiên kiểm kho</label>
                <input 
                  type="text" 
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="vd: Kiểm kho định kỳ tháng 11/2026..."
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ghi chú</label>
                <textarea 
                  value={sessionNote}
                  onChange={(e) => setSessionNote(e.target.value)}
                  placeholder="Nhập ghi chú cho phiên kiểm..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 h-20"
                />
              </div>

              <div className="text-[11px] text-indigo-600 bg-indigo-50 p-2.5 rounded-xl">
                ℹ️ Hệ thống sẽ tự động chụp mốc tồn kho KiotViet tại thời điểm tạo phiên làm cơ sở đối chiếu.
              </div>

              <div className="flex space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold shadow"
                >
                  Tạo & Chốt tồn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== VEHICLE VIEW ====================
function VehicleView({ 
  branchId, 
  currentUser, 
  vehicles, 
  setVehicles, 
  products, 
  locations,
  logAudit,
  openScanner
}: { 
  branchId: string, 
  currentUser: User, 
  vehicles: VehicleAsset[], 
  setVehicles: React.Dispatch<React.SetStateAction<VehicleAsset[]>>, 
  products: Product[], 
  locations: LocationNode[],
  logAudit: (action: string, details: string) => void,
  openScanner: (target: any, cb: (code: string) => void) => void
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedLocId, setSelectedLocId] = useState('');

  const branchVehicles = vehicles.filter(v => v.branchId === branchId);
  const electricProducts = products.filter(p => p.hasIMEI || p.category.toLowerCase().includes('xe'));

  const filteredVehicles = branchVehicles.filter(v => 
    v.imei.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.chassisNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.engineNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleBulkAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedLocId) {
      alert('Vui lòng chọn sản phẩm xe và vị trí lưu trữ!');
      return;
    }

    // Parse bulk input lines or comma separated
    const lines = bulkInput.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      alert('Vui lòng nhập danh sách IMEI / Số khung / Số máy!');
      return;
    }

    let addedCount = 0;
    const newVehiclesList = [...vehicles];

    lines.forEach(line => {
      // expected format: IMEI, Chassis, Engine or just IMEI
      const parts = line.split(/[,;|]/).map(p => p.trim());
      const imei = parts[0] || 'IMEI_' + Math.random().toString(36).substring(7);
      const chassis = parts[1] || 'SK_' + Math.random().toString(36).substring(7);
      const engine = parts[2] || 'SM_' + Math.random().toString(36).substring(7);

      const newV: VehicleAsset = {
        id: 'v-' + Date.now() + Math.random().toString(36).substring(4),
        branchId,
        productId: selectedProductId,
        imei,
        chassisNumber: chassis,
        engineNumber: engine,
        locationId: selectedLocId,
        status: 'IN_STOCK'
      };
      newVehiclesList.push(newV);
      addedCount++;
    });

    setVehicles(newVehiclesList);
    logAudit('Nhập kho xe điện', `Thêm mới ${addedCount} xe theo IMEI/SK/SM`);
    setBulkInput('');
    setShowAddModal(false);
    alert(`Đã nhập thành công ${addedCount} xe vào hệ thống!`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Kiểm kê Xe theo IMEI / Số Khung</h2>
          <p className="text-xs text-slate-500">Quản lý định danh tài sản đơn chiếc</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-amber-600 hover:bg-amber-700 text-white p-2 rounded-xl text-xs font-medium flex items-center space-x-1 shadow"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm xe / Nhập chuỗi</span>
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
        <input 
          type="text" 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Tìm theo một phần IMEI, số khung (SK), số máy (SM)..." 
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-amber-500 shadow-sm"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="text-xs text-slate-500 font-medium px-1">Danh sách xe trong chi nhánh ({filteredVehicles.length})</div>
        {filteredVehicles.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            Không tìm thấy xe phù hợp với từ khóa.
          </div>
        ) : (
          filteredVehicles.map(v => {
            const prod = products.find(p => p.id === v.productId);
            const locPath = getLocationPathName(v.locationId, locations);
            return (
              <div key={v.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">{prod?.name || 'Xe điện'}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{v.status}</span>
                </div>
                
                <div className="grid grid-cols-1 gap-1 text-xs">
                  <div><strong>IMEI:</strong> <span className="text-indigo-600 font-mono font-bold">{v.imei}</span></div>
                  <div><strong>Số khung (SK):</strong> <span className="font-mono">{v.chassisNumber}</span></div>
                  <div><strong>Số máy (SM):</strong> <span className="font-mono">{v.engineNumber}</span></div>
                  <div><strong>Vị trí:</strong> 📍 {locPath}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Vehicle Modal with String Parser */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800">Nhập danh sách xe & Tách chuỗi</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Chọn mẫu xe điện</label>
                <select 
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Chọn sản phẩm xe --</option>
                  {electricProducts.map(p => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Vị trí lưu trữ ban đầu</label>
                <select 
                  value={selectedLocId}
                  onChange={(e) => setSelectedLocId(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Chọn vị trí --</option>
                  {locations.filter(l => l.branchId === branchId).map(l => (
                    <option key={l.id} value={l.id}>{getLocationPathName(l.id, locations)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nhập chuỗi IMEI / Số khung / Số máy (Mỗi dòng 1 xe, cách nhau bằng dấu phẩy)</label>
                <textarea 
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder="IMEI12345, SK98765, SM12345&#10;IMEI67890, SK43210, SM67890"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-amber-500 h-32"
                />
                <p className="text-[10px] text-slate-400 mt-1">Hệ thống sẽ tự động tách chuỗi định danh thành các tài sản độc lập.</p>
              </div>

              <div className="flex space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl text-xs font-bold shadow"
                >
                  Xác nhận nhập kho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== REPORTS VIEW ====================
function ReportsView({ 
  branchId, 
  syncLogs, 
  auditLogs, 
  sessions, 
  stocktakeItems, 
  products, 
  locations,
  getKiotVietStock
}: { 
  branchId: string, 
  syncLogs: SyncLog[], 
  auditLogs: AuditLog[], 
  sessions: StocktakeSession[], 
  stocktakeItems: StocktakeItem[], 
  products: Product[], 
  locations: LocationNode[],
  getKiotVietStock: (bId: string, pId: string) => number
}) {
  const [reportTab, setReportTab] = useState<'variance' | 'audit' | 'sync'>('variance');

  const branchSessions = sessions.filter(s => s.branchId === branchId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Báo cáo & Nhật ký</h2>
        <p className="text-xs text-slate-500">Đối chiếu chênh lệch và lịch sử hệ thống</p>
      </div>

      <div className="flex bg-slate-200 p-1 rounded-xl">
        <button 
          onClick={() => setReportTab('variance')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${reportTab === 'variance' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}`}
        >
          Báo cáo chênh lệch
        </button>
        <button 
          onClick={() => setReportTab('audit')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${reportTab === 'audit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}`}
        >
          Nhật ký thao tác
        </button>
        <button 
          onClick={() => setReportTab('sync')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${reportTab === 'sync' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'}`}
        >
          Nhật ký KiotViet
        </button>
      </div>

      {reportTab === 'variance' && (
        <div className="space-y-3">
          {branchSessions.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
              Chưa có phiên kiểm kho nào trong chi nhánh này.
            </div>
          ) : (
            branchSessions.map(ses => {
              const items = stocktakeItems.filter(si => si.sessionId === ses.id);
              const variances = items.filter(i => i.actualStock !== i.kiotvietStock);
              return (
                <div key={ses.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{ses.name}</h4>
                      <p className="text-[10px] text-slate-400">Thời gian chốt: {ses.snapshotTime}</p>
                    </div>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded">
                      {variances.length} chênh lệch
                    </span>
                  </div>

                  {variances.length === 0 ? (
                    <div className="text-xs text-emerald-600 font-medium py-2 text-center bg-emerald-50 rounded-xl">
                      🎉 Không có chênh lệch so với KiotViet trong phiên này!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {variances.map(v => {
                        const prod = products.find(p => p.id === v.productId);
                        const diff = v.actualStock - v.kiotvietStock;
                        return (
                          <div key={v.id} className="bg-slate-50 p-2.5 rounded-xl flex items-center justify-between text-xs">
                            <div>
                              <div className="font-bold text-slate-800">{prod?.name}</div>
                              <div className="text-[10px] text-slate-500">📍 {getLocationPathName(v.locationId, locations)}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[10px] text-slate-400">KV: {v.kiotvietStock} | Thực tế: {v.actualStock}</div>
                              <div className={`font-bold ${diff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {diff > 0 ? `+${diff}` : diff}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {reportTab === 'audit' && (
        <div className="space-y-2">
          {auditLogs.map(log => (
            <div key={log.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-600">{log.action}</span>
                <span className="text-[10px] text-slate-400">{log.timestamp}</span>
              </div>
              <div className="text-slate-700">{log.details}</div>
              <div className="text-[10px] text-slate-400">Bởi: {log.username}</div>
            </div>
          ))}
        </div>
      )}

      {reportTab === 'sync' && (
        <div className="space-y-2">
          {syncLogs.map(log => (
            <div key={log.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">{log.status}</span>
                <span className="text-[10px] text-slate-400">{log.timestamp}</span>
              </div>
              <div className="text-slate-700">{log.message}</div>
              <div className="text-[10px] text-slate-400">Đã đồng bộ: {log.totalSynced} sản phẩm</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== SETTINGS VIEW ====================
function SettingsView({ 
  currentUser, 
  branches, 
  users, 
  setUsers, 
  locations, 
  setLocations, 
  currentBranchId, 
  onSyncKiotViet,
  syncLogs
}: { 
  currentUser: User, 
  branches: Branch[], 
  users: User[], 
  setUsers: React.Dispatch<React.SetStateAction<User[]>>, 
  locations: LocationNode[], 
  setLocations: React.Dispatch<React.SetStateAction<LocationNode[]>>, 
  currentBranchId: string, 
  onSyncKiotViet: () => void,
  syncLogs: SyncLog[]
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Quản trị Hệ thống</h2>
        <p className="text-xs text-slate-500">Phân quyền, đồng bộ và tài nguyên</p>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-600 uppercase">Đồng bộ KiotViet API</h3>
        <p className="text-xs text-slate-500">Danh mục sản phẩm dùng chung toàn hệ thống được đồng bộ tự động hằng sáng hoặc thủ công.</p>
        <button 
          onClick={onSyncKiotViet}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Thực hiện đồng bộ sản phẩm ngay</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-600 uppercase">Thông tin tài khoản hiện tại</h3>
        <div className="space-y-1 text-xs">
          <div><strong>Họ tên:</strong> {currentUser.fullName}</div>
          <div><strong>Tên đăng nhập:</strong> {currentUser.username}</div>
          <div><strong>Vai trò:</strong> <span className="text-indigo-600 font-bold">{currentUser.role}</span></div>
          <div><strong>Chi nhánh được phép:</strong> {currentUser.branchIds.join(', ')}</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-600 uppercase">Tài liệu kỹ thuật dự án (Section 15)</h3>
        <div className="grid grid-cols-2 gap-2">
          <a href="/PROJECT_SPEC.md" target="_blank" className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-indigo-600 flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>PROJECT_SPEC.md</span>
          </a>
          <a href="/DATABASE_SCHEMA.md" target="_blank" className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-indigo-600 flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>DATABASE_SCHEMA.md</span>
          </a>
          <a href="/API_DOCUMENTATION.md" target="_blank" className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-indigo-600 flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>API_DOCUMENTATION.md</span>
          </a>
          <a href="/TEST_CASES.md" target="_blank" className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-indigo-600 flex items-center space-x-2">
            <FileText className="w-4 h-4" />
            <span>TEST_CASES.md</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// ==================== MODALS ====================
function ScannerModal({ 
  target, 
  onClose, 
  onScanSuccess,
  products,
  locations,
  vehicles
}: { 
  target: any, 
  onClose: () => void, 
  onScanSuccess: (code: string) => void,
  products: Product[],
  locations: LocationNode[],
  vehicles: VehicleAsset[]
}) {
  const [manualInput, setManualInput] = useState('');
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    try {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        false
      );
      scannerRef.current = scanner;
      scanner.render(
        (decodedText) => {
          scanner.clear().catch(() => {});
          onScanSuccess(decodedText);
        },
        (error) => {
          // scanning error ignore
        }
      );
    } catch (e) {
      console.error(e);
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">Quét mã vạch / Mã QR</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div id="reader" className="w-full overflow-hidden rounded-xl bg-slate-100"></div>

        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="block text-xs font-medium text-slate-600">Hoặc chọn mã mẫu nhanh để test:</label>
          <div className="grid grid-cols-2 gap-2">
            <button 
              onClick={() => onScanSuccess('8931234567890')}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs py-2 rounded-xl font-medium"
            >
              Barcode SP001 (Dầu nhớt)
            </button>
            <button 
              onClick={() => onScanSuccess('QR_LOC_A_K1_T2_S3')}
              className="bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs py-2 rounded-xl font-medium"
            >
              QR Vị trí Sọt 3
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex space-x-2">
            <input 
              type="text" 
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Nhập mã thủ công..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
            />
            <button 
              onClick={() => {
                if (manualInput.trim()) onScanSuccess(manualInput.trim());
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LocationQRModal({ 
  location, 
  locations, 
  onClose 
}: { 
  location: LocationNode, 
  locations: LocationNode[], 
  onClose: () => void 
}) {
  const pathName = getLocationPathName(location.id, locations);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">Mã QR Vị trí Kho</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-indigo-200 inline-block shadow-inner">
          <QRCodeSVG value={location.qrCode} size={180} level="H" includeMargin={true} />
        </div>

        <div>
          <h4 className="text-base font-bold text-indigo-700">{pathName}</h4>
          {location.description && <p className="text-xs text-slate-500 mt-1">{location.description}</p>}
          <div className="text-[10px] text-slate-400 mt-2 font-mono">Mã nội bộ: {location.qrCode}</div>
        </div>

        <button 
          onClick={onClose}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold shadow"
        >
          Đóng
        </button>
      </div>
    </div>
  );
}

function AssignLocationModal({ 
  product, 
  branchId, 
  locations, 
  mappings, 
  setMappings, 
  currentUser, 
  onClose,
  logAudit
}: { 
  product: Product, 
  branchId: string, 
  locations: LocationNode[], 
  mappings: ProductLocationMapping[], 
  setMappings: React.Dispatch<React.SetStateAction<ProductLocationMapping[]>>, 
  currentUser: User, 
  onClose: () => void,
  logAudit: (action: string, details: string) => void
}) {
  const [selectedLocId, setSelectedLocId] = useState('');
  const [actionType, setActionType] = useState<'NEW' | 'ADD' | 'CHANGE'>('NEW');

  const branchLocations = locations.filter(l => l.branchId === branchId);

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLocId) {
      alert('Vui lòng chọn vị trí!');
      return;
    }

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newMapping: ProductLocationMapping = {
      id: 'm-' + Date.now(),
      branchId,
      productId: product.id,
      locationId: selectedLocId,
      assignedBy: currentUser.username,
      timestamp: nowStr,
      actionType
    };

    if (actionType === 'CHANGE') {
      // remove previous mappings for this product in branch
      const filtered = mappings.filter(m => !(m.branchId === branchId && m.productId === product.id));
      setMappings([...filtered, newMapping]);
    } else {
      setMappings(prev => [...prev, newMapping]);
    }

    logAudit('Bố trí vị trí sản phẩm', `SP: ${product.code} tại ${getLocationPathName(selectedLocId, locations)} (${actionType})`);
    alert('Đã lưu vị trí sản phẩm thành công!');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">Bố trí vị trí sản phẩm</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-slate-50 p-3 rounded-xl">
          <div className="text-[10px] font-bold text-indigo-600">{product.code}</div>
          <div className="text-xs font-bold text-slate-800">{product.name}</div>
        </div>

        <form onSubmit={handleSaveAssignment} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Loại thao tác</label>
            <select 
              value={actionType}
              onChange={(e) => setActionType(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500 font-bold"
            >
              <option value="NEW">Bố trí mới (Sản phẩm chưa có vị trí)</option>
              <option value="ADD">Bổ sung vị trí (Thêm vị trí thứ 2, 3...)</option>
              <option value="CHANGE">Thay đổi vị trí (Chuyển vị trí cũ sang mới)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Chọn vị trí kho</label>
            <select 
              value={selectedLocId}
              onChange={(e) => setSelectedLocId(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="">-- Chọn vị trí --</option>
              {branchLocations.map(l => (
                <option key={l.id} value={l.id}>{getLocationPathName(l.id, locations)}</option>
              ))}
            </select>
          </div>

          <div className="flex space-x-2 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-xl text-xs font-bold"
            >
              Hủy
            </button>
            <button 
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold shadow"
            >
              Lưu bố trí
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
