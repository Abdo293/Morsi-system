import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { toCanvas } from "html-to-image";
import {
  printReceiptHtml,
  printReportHtml,
  printBarcodeStickersHtml,
} from "./utils/printHelper";
import {
  LuLayoutDashboard,
  LuShoppingCart,
  LuReceipt,
  LuUsers,
  LuPackage,
  LuTags,
  LuWarehouse,
  LuTruck,
  LuUserCheck,
  LuLogOut,
  LuRefreshCw,
  LuArrowLeft,
  LuPrinter,
  LuTrendingUp,
  LuRotateCcw,
  LuBarcode,
  LuPackageSearch,
  LuClock,
  LuClipboardCheck,
  LuTrash2,
  LuSearch,
  LuGlobe,
  LuCheck,
  LuEye,
  LuEyeOff,
  LuX,
  LuDatabaseBackup,
  LuShieldCheck,
  LuHardDrive,
  LuDownload,
  LuUpload,
  LuFolderOpen,
  LuTriangleAlert,
} from "react-icons/lu";
import { BrandSelect, type SelectOption } from "./components/BrandSelect";
import { BrandCreatableSelect } from "./components/BrandCreatableSelect";
import { FaFacebook, FaTiktok } from "react-icons/fa";
import { createPortal } from "react-dom";
import "./App.css";

type Session = { token: string; userId?: number; full_name: string; role: "ADMIN" | "SELLER"; permissions?: string[] };
type Named = { id: number; name: string };
type Product = { productId: number; variantId: number | null; warehouseId: number; supplierId?: number | null; supplier?: string | null; name: string; category: string; warehouse: string; color: string | null; size: string | null; barcode: string; quantity: number; buyPricePiasters: number; sellPricePiasters: number; lowStockThreshold: number; location?: string | null; };
type CustomerChoice = { id: number; name: string; phone: string };
type Customer = { id: number; name: string; phone: string | null; createdAt: string; invoiceCount: number; totalPiasters: number; outstandingPiasters: number; lastInvoiceAt: string | null };
type CustomerInvoice = { invoiceNumber: number; createdAt: string; sellerName: string; totalPiasters: number; paidPiasters: number; remainingPiasters: number };
type CustomerProduct = { productId: number; name: string; quantity: number; totalPiasters: number };
type CustomerPayment = { invoiceNumber: number; amountPiasters: number; method: string; createdAt: string; employeeName: string };
type CustomerDetail = { customer: Customer; invoices: CustomerInvoice[]; favoriteProducts: CustomerProduct[]; payments: CustomerPayment[] };
type Invoice = { invoiceNumber: number; customerName: string | null; sellerName: string; subtotalPiasters?: number; discountPiasters?: number; extraDiscountPiasters?: number; totalPiasters: number; paidCashPiasters?: number; paidInstapayPiasters?: number; paidWalletPiasters?: number; remainingPiasters: number; createdAt: string; status: string; onlineOrderNumber?: number | null; shippingFeePiasters?: number; depositPiasters?: number };
type InvoiceItemDetail = { id: number; productId: number; variantId: number | null; warehouseId: number; nameSnapshot: string; color: string | null; size: string | null; warehouseName: string; buyPricePiasters: number; sellPricePiasters: number; discountEachPiasters: number; quantity: number; lineTotalPiasters: number };
type InvoiceDetailView = { id: number; invoiceNumber: number; createdAt: string; status: string; customerName: string | null; customerPhone: string | null; sellerName: string; subtotalPiasters: number; discountPiasters: number; extraDiscountPiasters?: number; totalPiasters: number; paidCashPiasters: number; paidInstapayPiasters: number; paidWalletPiasters: number; remainingPiasters: number; notes: string | null; items: InvoiceItemDetail[]; onlineOrderNumber?: number | null; shippingFeePiasters?: number; depositPiasters?: number };
type RefundView = { id: number; refundNumber: number; invoiceId: number; invoiceNumber: number; customerId: number | null; customerName: string | null; sellerId: number; sellerName: string; performedByName: string; totalRefundPiasters: number; refundMethod: string; notes: string | null; createdAt: string };
type RefundItemView = { id: number; productId: number; variantId: number | null; warehouseId: number; nameSnapshot: string; color: string | null; size: string | null; unitPricePiasters: number; quantity: number; lineTotalPiasters: number };
type RefundDetailView = { refund: RefundView; items: RefundItemView[] };
type ReturnedItemQty = { invoiceItemId: number; returnedQuantity: number };
type DaySalesSummary = {
  date: string;
  dayName: string;
  grossSalesPiasters: number;
  refundsPiasters: number;
  netSalesPiasters: number;
  invoiceCount: number;
};

type PeriodSummary = {
  grossSalesPiasters: number;
  refundsPiasters: number;
  refundsCount: number;
  netSalesPiasters: number;
  profitPiasters: number;
  collectedPiasters: number;
  creditSalesPiasters: number;
  debtCollectedPiasters: number;
  invoicesCount: number;
};

type Dashboard = {
  productCount: number;
  totalInvoicesCount: number;
  todayInvoicesCount: number;
  todayGrossSalesPiasters: number;
  todayRefundsPiasters: number;
  todayRefundsCount: number;
  todayNetSalesPiasters: number;
  todayCollectedPiasters: number;
  todayCreditSalesPiasters: number;
  todayDebtCollectedPiasters: number;
  outOfStockCount: number;
  lowStockCount: number;
  totalCustomerDebtPiasters: number;
  customersWithDebtCount: number;
  yesterdayNetSalesPiasters: number;
  last7Days: DaySalesSummary[];
  recentRefunds: RefundView[];
  today?: PeriodSummary;
  week?: PeriodSummary;
  month?: PeriodSummary;
  allTime?: PeriodSummary;
  invoiceCount?: number;
  salesTodayPiasters?: number;
  product_count?: number;
  invoice_count?: number;
  sales_today_piasters?: number;
  low_stock_count?: number;
};
type Employee = { id: number; userId?: number | null; name: string; username?: string | null; permissions?: string[]; phone: string | null; jobTitle: string; address: string | null; workHours: number; hireDate: string; baseSalaryPiasters: number; shiftStart: string; shiftEnd: string };
type Attendance = {
  shiftDate: string;
  shiftStart: string;
  shiftEnd: string;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  lateMinutes: number;
  overtimeMinutes?: number;
  overtimePaid?: boolean;
  telegramStatus: string | null;
};
type DailyEmployeeAttendance = {
  employeeId: number;
  userId?: number | null;
  name: string;
  jobTitle: string;
  phone?: string | null;
  shiftStart: string;
  shiftEnd: string;
  workHours: number;
  shiftDate: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  lateMinutes: number;
  overtimeMinutes?: number;
  overtimePaid?: boolean;
  status: "NOT_ATTENDED" | "PRESENT" | "COMPLETED";
};
type EmployeeLoan = { id: number; amountPiasters: number; repaidPiasters: number; remainingPiasters: number; reason: string | null; createdAt: string };
type EmployeeReward = { id: number; amountPiasters: number; reason: string; periodMonth: string; createdAt: string };
type EmployeeDeduction = { id: number; amountPiasters: number; reason: string; periodMonth: string; createdAt: string };
type EmployeeLoanRepayment = { id: number; loanId: number; amountPiasters: number; periodMonth: string; createdAt: string };
type EmployeeAccount = {
  employeeId: number;
  employeeName: string;
  periodMonth: string;
  baseSalaryPiasters: number;
  rewardsPiasters: number;
  deductionsPiasters: number;
  loanRepaymentsPiasters: number;
  netSalaryPiasters: number;
  totalLoanBalancePiasters: number;
  totalOvertimeMinutes?: number;
  paidOvertimeMinutes?: number;
  unpaidOvertimeMinutes?: number;
  attendance: Attendance[];
  loans: EmployeeLoan[];
  rewards: EmployeeReward[];
  deductions: EmployeeDeduction[];
  loanRepayments: EmployeeLoanRepayment[];
};

function formatOvertimeDuration(minutes?: number): string {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h} س و ${m} د`;
  if (h > 0) return `${h} ساعة`;
  return `${m} دقيقة`;
}
type TelegramSettings = {
  configured: boolean;
  chatId: string;
  graceMinutes: number;
  pendingAlerts: number;
  autoReportEnabled: boolean;
  autoReportTime: string;
  autoReportLastSentDate: string | null;
};
type EmployeeProductStat = { name: string; color: string | null; size: string | null; quantity: number; totalPiasters: number };
type EmployeeDiscountDetail = { invoiceNumber: number; customerName: string | null; discountPiasters: number; totalPiasters: number; createdAt: string };
type EmployeeRefundDetail = { refundNumber: number; invoiceNumber: number; customerName: string | null; totalRefundPiasters: number; refundMethod: string; notes: string | null; createdAt: string };
type EmployeeStatsView = { completedInvoicesCount: number; cancelledInvoicesCount: number; subtotalSalesPiasters: number; discountSalesPiasters: number; totalSalesPiasters: number; grossSalesPiasters: number; refundSalesPiasters: number; refundCount: number; paidCashPiasters: number; paidInstapayPiasters: number; paidWalletPiasters: number; remainingPiasters: number; topProducts: EmployeeProductStat[]; discountsGiven: EmployeeDiscountDetail[]; refundsList: EmployeeRefundDetail[] };
type CartLine = { product: Product; quantity: number; price: number; discount: number; name: string };
type ProductSaleRecord = { invoiceId: number; invoiceNumber: number; createdAt: string; customerId: number; customerName: string; sellerId: number; sellerName: string; productName: string; color: string | null; size: string | null; warehouseName: string; quantity: number; unitPricePiasters: number; discountPiasters: number; lineTotalPiasters: number };
type ProductReturnRecord = { refundId: number; refundNumber: number; invoiceId: number; invoiceNumber: number; createdAt: string; customerId: number; customerName: string; sellerId: number; sellerName: string; performedByName: string; color: string | null; size: string | null; warehouseName: string; quantity: number; unitPricePiasters: number; lineTotalPiasters: number; refundMethod: string; notes: string | null };
type ProductStockMovementRecord = { id: number; createdAt: string; movementType: string; color: string | null; size: string | null; warehouseName: string; changeQuantity: number; quantityBefore: number; quantityAfter: number; referenceId: number | null; performedByName: string };
type ProductMovementSummary = { productId: number; productName: string; barcode: string; categoryName: string; totalSoldQuantity: number; grossSalesPiasters: number; netSalesPiasters: number; totalRefundedQuantity: number; totalRefundedPiasters: number; currentStock: number; totalInvoicesCount: number; distinctCustomersCount: number; distinctSellersCount: number };
type ProductMovementReportView = { summary: ProductMovementSummary; sales: ProductSaleRecord[]; returns: ProductReturnRecord[]; stockMovements: ProductStockMovementRecord[] };
type Page = "home" | "pos" | "online_orders" | "invoices" | "sales_report" | "returns" | "sales_returns_report" | "inventory_audit" | "product_movement_report" | "barcode_print" | "products" | "categories" | "warehouses" | "suppliers" | "employees" | "customers" | "attendance" | "main_cashier" | "backup";

type OnlineOrderView = {
  id: number;
  orderNumber: number;
  customerName: string;
  customerPhone: string;
  customerAddress?: string | null;
  shippingFeePiasters: number;
  depositPiasters: number;
  subtotalPiasters: number;
  discountPiasters: number;
  totalPiasters: number;
  paymentMethod: string;
  notes?: string | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  invoiceId?: number | null;
  invoiceNumber?: number | null;
  createdByName: string;
  sellerName: string;
  confirmedByName?: string | null;
  confirmedAt?: string | null;
  createdAt: string;
  itemsCount: number;
};

type OnlineOrderItemView = {
  id: number;
  productId: number;
  variantId?: number | null;
  warehouseId: number;
  warehouseName: string;
  nameSnapshot: string;
  color?: string | null;
  size?: string | null;
  sellPricePiasters: number;
  discountEachPiasters: number;
  quantity: number;
  lineTotalPiasters: number;
};

type OnlineOrderDetail = {
  order: OnlineOrderView;
  items: OnlineOrderItemView[];
};
type LoginUserChoice = {
  username: string;
  displayName: string;
  role: string;
  jobTitle: string | null;
  isMainSeller: boolean;
};
type SupplierAccount = { id: number; name: string; totalGoodsPiasters: number; totalPaidPiasters: number; outstandingPiasters: number; lastTransactionAt: string | null };
type SupplierTransaction = { id: number; supplierId: number; employeeName: string; transactionType: "RECEIPT" | "PAYMENT"; goodsAmountPiasters: number; paidAmountPiasters: number; paymentMethod: string; previousBalancePiasters: number; newBalancePiasters: number; notes: string | null; createdAt: string };
type SupplierStatement = { supplier: SupplierAccount; transactions: SupplierTransaction[] };
type ProductGroup = {
  productId: number;
  name: string;
  category: string;
  supplierId: number | null;
  supplierName: string | null;
  barcode: string;
  sellPricePiasters: number;
  lowStockThreshold: number;
  totalQuantity: number;
  colors: string[];
  sizes: string[];
  warehouses: string[];
  locations: string[];
  rows: Product[];
};

function groupProductRows(rows: Product[]): ProductGroup[] {
  const map = new Map<number, ProductGroup>();
  for (const row of rows) {
    let group = map.get(row.productId);
    if (!group) {
      group = {
        productId: row.productId,
        name: row.name,
        category: row.category,
        supplierId: row.supplierId ?? null,
        supplierName: row.supplier ?? null,
        barcode: row.barcode,
        sellPricePiasters: row.sellPricePiasters,
        lowStockThreshold: row.lowStockThreshold,
        totalQuantity: 0,
        colors: [],
        sizes: [],
        warehouses: [],
        locations: [],
        rows: [],
      };
      map.set(row.productId, group);
    }
    group.totalQuantity += row.quantity;
    if (row.color && !group.colors.includes(row.color)) group.colors.push(row.color);
    if (row.size && !group.sizes.includes(row.size)) group.sizes.push(row.size);
    if (row.warehouse && !group.warehouses.includes(row.warehouse)) group.warehouses.push(row.warehouse);
    if (row.location && !group.locations.includes(row.location)) group.locations.push(row.location);
    group.rows.push(row);
  }
  return Array.from(map.values()).sort((first, second) => first.name.localeCompare(second.name, "ar"));
}

type ProductPayload = {
  name: string;
  categoryId: number;
  warehouseId: number;
  supplierId: number | null;
  barcode: string | null;
  buyPricePiasters: number;
  sellPricePiasters: number;
  lowStockThreshold: number;
  openingQuantity: number;
  location?: string | null;
  variants: { color: string; size: string; openingQuantity: number; location?: string | null }[];
};

const money = (value: number) => `${(value / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
const moneyNoUnit = (value: number) => (value / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const piastres = (value: string) => Math.round(Number(value || 0) * 100);

function formatTime12(timeOrDateStr: string | null | undefined): string {
  if (!timeOrDateStr) return "—";
  const trimmed = timeOrDateStr.trim();
  let h: number;
  let m: string;

  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const parts = trimmed.split(":");
    h = parseInt(parts[0], 10);
    m = parts[1];
  } else {
    let s = trimmed.replace(" ", "T");
    if (!s.includes("Z") && !s.includes("+") && !/T\d{2}:\d{2}:\d{2}-/.test(s)) {
      s += "Z";
    }
    const date = new Date(s);
    if (isNaN(date.getTime())) return timeOrDateStr;
    h = date.getHours();
    m = String(date.getMinutes()).padStart(2, "0");
  }

  const period = h >= 12 ? "م" : "ص";
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
}

function formatShiftRange(start: string, end: string): string {
  if (!start || !end) return "—";
  return `من ${formatTime12(start)} إلى ${formatTime12(end)}`;
}

function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  let s = dateStr.trim().replace(" ", "T");
  if (!s.includes("Z") && !s.includes("+") && !/T\d{2}:\d{2}:\d{2}-/.test(s)) {
    s += "Z";
  }
  const date = new Date(s);
  if (isNaN(date.getTime())) return dateStr;
  const d = date.toLocaleDateString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" });
  const t = formatTime12(s);
  return `${d} ${t}`;
}

function formatDateOnly(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  let s = dateStr.trim().replace(" ", "T");
  if (!s.includes("Z") && !s.includes("+") && !/T\d{2}:\d{2}:\d{2}-/.test(s)) {
    s += "Z";
  }
  const date = new Date(s);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatTimeOnly(dateStr: string | null | undefined): string {
  return formatTime12(dateStr);
}

function getLocalDateString(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  let s = dateStr.trim().replace(" ", "T");
  if (!s.includes("Z") && !s.includes("+") && !/T\d{2}:\d{2}:\d{2}-/.test(s)) {
    s += "Z";
  }
  const d = new Date(s);
  if (isNaN(d.getTime())) return dateStr.slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayCairoDate(): string {
  const d = new Date();
  const year = d.toLocaleDateString("en-CA", { timeZone: "Africa/Cairo", year: "numeric" });
  const month = d.toLocaleDateString("en-CA", { timeZone: "Africa/Cairo", month: "2-digit" });
  const day = d.toLocaleDateString("en-CA", { timeZone: "Africa/Cairo", day: "2-digit" });
  return `${year}-${month}-${day}`;
}

function getMethodBadge(method: string) {
  switch (method) {
    case "CASH":
      return <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "12px", background: "#e8f5e9", color: "#2e7d32", fontWeight: 700 }}>💵 نقداً</span>;
    case "INSTAPAY":
      return <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "12px", background: "#f3e5f5", color: "#7b1fa2", fontWeight: 700 }}>📲 إنستاباي</span>;
    case "WALLET":
      return <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "12px", background: "#e1f5fe", color: "#0288d1", fontWeight: 700 }}>💳 محفظة</span>;
    case "DEBT_DEDUCTION":
      return <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "12px", background: "#fff3e0", color: "#e65100", fontWeight: 700 }}>⏳ خصم من الآجل</span>;
    default:
      return <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "12px", background: "#f5f5f5", color: "#616161" }}>{method || "—"}</span>;
  }
}

function getMovementTypeBadge(type: string) {
  switch (type) {
    case "SALE":
      return <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "12px", background: "#ffebee", color: "#c62828", fontWeight: 700 }}>مبيعات</span>;
    case "REFUND":
      return <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "12px", background: "#e8f5e9", color: "#2e7d32", fontWeight: 700 }}>مرتجع</span>;
    case "OPENING_BALANCE":
      return <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "12px", background: "#e3f2fd", color: "#1565c0", fontWeight: 700 }}>رصيد افتتاحي</span>;
    case "PURCHASE":
      return <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "12px", background: "#e0f2f1", color: "#00695c", fontWeight: 700 }}>توريد مشتريات</span>;
    case "ADJUSTMENT":
      return <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "12px", background: "#fff8e1", color: "#f57f17", fontWeight: 700 }}>تسوية جردية</span>;
    case "TRANSFER":
      return <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "12px", background: "#f3e5f5", color: "#6a1b9a", fontWeight: 700 }}>تحويل مخزني</span>;
    default:
      return <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "12px", background: "#f5f5f5", color: "#616161" }}>{type || "—"}</span>;
  }
}

const SESSION_KEY = "morsi-cashier-session";
function normalizeArabic(text: string): string {
  return text.replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").toLowerCase();
}
type MenuItem = { id: Page; label: string; icon: ReactNode; admin?: boolean };
type MenuGroup = { categoryLabel: string; items: MenuItem[] };

const menuGroups: MenuGroup[] = [
  {
    categoryLabel: "",
    items: [
      { id: "home", label: "الرئيسية", icon: <LuLayoutDashboard />, admin: true },
    ],
  },
  {
    categoryLabel: "حركة البيع اليومية",
    items: [
      { id: "pos", label: "نقطة البيع", icon: <LuShoppingCart /> },
      { id: "invoices", label: "سجل الفواتير", icon: <LuReceipt /> },
      { id: "online_orders", label: "طلبات الأونلاين", icon: <LuGlobe /> },
      { id: "returns", label: "المرتجعات", icon: <LuRotateCcw />, admin: true },
    ],
  },
  {
    categoryLabel: "المخزون والمنتجات",
    items: [
      { id: "products", label: "المنتجات", icon: <LuPackage />, admin: true },
      { id: "barcode_print", label: "طباعة الباركود", icon: <LuBarcode />, admin: true },
      { id: "inventory_audit", label: "جرد المخزون", icon: <LuClipboardCheck />, admin: true },
      { id: "categories", label: "التصنيفات", icon: <LuTags />, admin: true },
      { id: "warehouses", label: "المخازن", icon: <LuWarehouse />, admin: true },
      { id: "suppliers", label: "الموردون", icon: <LuTruck />, admin: true },
    ],
  },
  {
    categoryLabel: "فريق العمل والعملاء",
    items: [
      { id: "customers", label: "العملاء", icon: <LuUsers />, admin: true },
      { id: "attendance", label: "سجل الحضور والانصراف", icon: <LuClock /> },
      { id: "employees", label: "الموظفون والرواتب", icon: <LuUserCheck />, admin: true },
    ],
  },
  {
    categoryLabel: "التقارير والإحصائيات",
    items: [
      { id: "sales_report", label: "تقرير المبيعات الشامل", icon: <LuTrendingUp />, admin: true },
      { id: "sales_returns_report", label: "تقرير المرتجعات", icon: <LuRotateCcw />, admin: true },
      { id: "product_movement_report", label: "تقرير حركة المنتجات", icon: <LuPackageSearch />, admin: true },
    ],
  },
  {
    categoryLabel: "النظام والبيانات",
    items: [
      { id: "backup", label: "النسخ الاحتياطي والأمان", icon: <LuDatabaseBackup />, admin: true },
    ],
  },
];

const allMenuItems = menuGroups.flatMap((group) => group.items);

function isPageAllowed(session: Session, pageId: Page): boolean {
  if (session.role === "ADMIN") return true;
  if (!session.permissions || session.permissions.length === 0) {
    return pageId === "pos" || pageId === "invoices" || pageId === "online_orders";
  }
  if (pageId === "attendance" && (session.permissions.includes("attendance") || session.permissions.includes("main_cashier" as Page) || session.permissions.includes("employees"))) {
    return true;
  }
  return session.permissions.includes(pageId);
}

function getInitialPage(session: Session): Page {
  if (isPageAllowed(session, "home")) return "home";
  if (isPageAllowed(session, "pos")) return "pos";
  if (isPageAllowed(session, "invoices")) return "invoices";
  const first = allMenuItems.find((item) => isPageAllowed(session, item.id));
  return first ? first.id : "pos";
}

function App() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [page, setPage] = useState<Page>("home");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [categories, setCategories] = useState<Named[]>([]);
  const [warehouses, setWarehouses] = useState<Named[]>([]);
  const [suppliers, setSuppliers] = useState<Named[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerChoices, setCustomerChoices] = useState<CustomerChoice[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [targetInvoiceNumber, setTargetInvoiceNumber] = useState<number | null>(null);
  const [targetProductSearch, setTargetProductSearch] = useState<string | null>(null);
  const [targetCustomerId, setTargetCustomerId] = useState<number | null>(null);
  const [targetEmployeeId, setTargetEmployeeId] = useState<number | null>(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const globalSearchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const [initialProductStockFilter, setInitialProductStockFilter] = useState<"all" | "out" | "low">("all");
  const [productViewMode, setProductViewMode] = useState<"list" | "add">("list");
  const [addProductTrigger, setAddProductTrigger] = useState(0);
  const [posDraftCount, setPosDraftCount] = useState<number>(() => {
    try {
      const raw = localStorage.getItem("morsi_pos_draft_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.cart)) {
          return parsed.cart.reduce((sum: number, line: { quantity?: number }) => sum + (line.quantity || 1), 0);
        }
      }
    } catch {}
    return 0;
  });

  useEffect(() => {
    function handleDraftUpdate() {
      try {
        const raw = localStorage.getItem("morsi_pos_draft_v1");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.cart)) {
            setPosDraftCount(parsed.cart.reduce((sum: number, line: { quantity?: number }) => sum + (line.quantity || 1), 0));
            return;
          }
        }
      } catch {}
      setPosDraftCount(0);
    }
    window.addEventListener("morsi_pos_cart_updated", handleDraftUpdate);
    return () => window.removeEventListener("morsi_pos_cart_updated", handleDraftUpdate);
  }, []);

  const [visitedPages, setVisitedPages] = useState<Set<Page>>(() => new Set<Page>(["home", "pos"]));

  useEffect(() => {
    setVisitedPages((prev) => {
      if (prev.has(page)) return prev;
      const next = new Set(prev);
      next.add(page);
      return next;
    });
  }, [page]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target as Node)) {
        setSearchDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    const q = normalizeArabic(globalSearch.trim());
    if (!q || !session) {
      return { invoices: [], products: [], customers: [], employees: [], total: 0 };
    }

    const matchedInvoices = isPageAllowed(session, "invoices")
      ? invoices.filter((inv) =>
          String(inv.invoiceNumber).includes(q) ||
          (inv.customerName && normalizeArabic(inv.customerName).includes(q)) ||
          (inv.sellerName && normalizeArabic(inv.sellerName).includes(q))
        ).slice(0, 5)
      : [];

    const seenProductNames = new Set<string>();
    const matchedProducts = isPageAllowed(session, "products")
      ? products.filter((p) => {
          const nameNorm = normalizeArabic(p.name);
          const catNorm = p.category ? normalizeArabic(p.category) : "";
          const colorNorm = p.color ? normalizeArabic(p.color) : "";
          const match =
            nameNorm.includes(q) ||
            catNorm.includes(q) ||
            colorNorm.includes(q) ||
            (p.size && p.size.includes(q)) ||
            (p.barcode && p.barcode.includes(q));

          if (!match) return false;
          if (seenProductNames.has(nameNorm)) return false;
          seenProductNames.add(nameNorm);
          return true;
        }).slice(0, 5)
      : [];

    const matchedCustomers = isPageAllowed(session, "customers")
      ? customers.filter((c) =>
          normalizeArabic(c.name).includes(q) ||
          (c.phone && c.phone.includes(q))
        ).slice(0, 5)
      : [];

    const matchedEmployees = isPageAllowed(session, "employees")
      ? employees.filter((emp) =>
          normalizeArabic(emp.name).includes(q) ||
          normalizeArabic(emp.jobTitle).includes(q) ||
          (emp.phone && emp.phone.includes(q)) ||
          (emp.username && emp.username.toLowerCase().includes(q))
        ).slice(0, 5)
      : [];

    const total = matchedInvoices.length + matchedProducts.length + matchedCustomers.length + matchedEmployees.length;

    return {
      invoices: matchedInvoices,
      products: matchedProducts,
      customers: matchedCustomers,
      employees: matchedEmployees,
      total,
    };
  }, [globalSearch, session, invoices, products, customers, employees]);

  useEffect(() => {
    function handleGlobalKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.code === "KeyK" || e.key.toLowerCase() === "k" || e.key === "ن")) {
        e.preventDefault();
        globalSearchInputRef.current?.focus();
        globalSearchInputRef.current?.select();
        setSearchDropdownOpen(true);
        return;
      }

      if (e.key === "Escape" && searchDropdownOpen) {
        e.preventDefault();
        setSearchDropdownOpen(false);
        return;
      }

      // Don't intercept when modifier keys like Ctrl, Alt, or Meta are pressed
      // (This preserves OS/Browser functions like Alt+F4 to exit)
      if (e.altKey || e.ctrlKey || e.metaKey) return;

      if (e.key === "F1") {
        e.preventDefault();
        if (!session) return;
        if (isPageAllowed(session, "products")) {
          setPage("products");
          setProductViewMode("add");
          setAddProductTrigger((t) => t + 1);
          setError("");
          setNotice("");
        } else {
          setNotice("ليس لديك صلاحية لإضافة المنتجات");
        }
      } else if (e.key === "F2") {
        if (page !== "pos") {
          e.preventDefault();
          if (!session) return;
          if (isPageAllowed(session, "invoices")) {
            setPage("invoices");
            setError("");
            setNotice("");
          } else {
            setNotice("ليس لديك صلاحية لدخول سجل الفواتير");
          }
        }
      } else if (e.key === "F3") {
        e.preventDefault();
        if (!session) return;
        if (isPageAllowed(session, "pos")) {
          setPage("pos");
          setError("");
          setNotice("");
        } else {
          setNotice("ليس لديك صلاحية لدخول نقطة البيع");
        }
      } else if (e.key === "F4") {
        e.preventDefault();
        if (!session) return;
        if (isPageAllowed(session, "returns")) {
          setPage("returns");
          setError("");
          setNotice("");
        } else {
          setNotice("ليس لديك صلاحية لدخول صفحة المرتجعات");
        }
      } else if (e.key === "F5") {
        e.preventDefault();
        if (!session) return;
        void execute(async () => {
          await refresh(session);
          setNotice("تم تحديث البيانات بنجاح");
        });
      } else if (e.key === "F6") {
        e.preventDefault();
        if (!session) return;
        if (isPageAllowed(session, "sales_report")) {
          setPage("sales_report");
          setError("");
          setNotice("");
        } else {
          setNotice("ليس لديك صلاحية لدخول تقرير المبيعات");
        }
      } else if (e.key === "F7") {
        e.preventDefault();
        if (!session) return;
        if (isPageAllowed(session, "inventory_audit")) {
          setPage("inventory_audit");
          setError("");
          setNotice("");
        } else {
          setNotice("ليس لديك صلاحية لدخول شاشة الجرد");
        }
      } else if (e.key === "F9") {
        e.preventDefault();
        if (!session) return;
        if (isPageAllowed(session, "attendance")) {
          setPage("attendance");
          setError("");
          setNotice("");
        } else {
          setNotice("ليس لديك صلاحية لدخول سجل الحضور والانصراف");
        }
      } else if (e.key === "F10") {
        e.preventDefault();
        if (!session) return;
        if (isPageAllowed(session, "barcode_print")) {
          setPage("barcode_print");
          setError("");
          setNotice("");
        } else {
          setNotice("ليس لديك صلاحية لدخول صفحة طباعة الباركود");
        }
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown, true);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown, true);
  }, [session, page, searchDropdownOpen]);

  useEffect(() => {
    let active = true;
    async function restoreSession() {
      try {
        const required = await invoke<boolean>("setup_required");
        if (required) {
          sessionStorage.removeItem(SESSION_KEY);
        } else {
          const token = sessionStorage.getItem(SESSION_KEY);
          if (token) {
            try {
              const restored = await invoke<Session>("current_session", { token });
              if (active) {
                const initial = getInitialPage(restored);
                setSession(restored);
                setPage(initial);
                setVisitedPages(new Set<Page>([initial]));
                await refresh(restored).catch((cause) => { if (active) setError(String(cause)); });
              }
            } catch {
              sessionStorage.removeItem(SESSION_KEY);
            }
          }
        }
        if (active) setNeedsSetup(required);
      } catch (cause) {
        if (active) setError(String(cause));
      }
    }
    void restoreSession();
    return () => { active = false; };
  }, []);
  async function refresh(user: Session) {
    const token = user.token;
    const [cats, stores, items, bills, staff, choices] = await Promise.all([
      invoke<Named[]>("list_categories", { token }), invoke<Named[]>("list_warehouses", { token }),
      invoke<Product[]>("list_products", { token }), invoke<Invoice[]>("list_invoices", { token }),
      invoke<Employee[]>("list_employees", { token }), invoke<CustomerChoice[]>("list_customer_choices", { token }),
    ]);
    setCategories(cats); setWarehouses(stores); setProducts(items); setInvoices(bills); setEmployees(staff); setCustomerChoices(choices);
    if (isPageAllowed(user, "suppliers") || isPageAllowed(user, "home") || isPageAllowed(user, "customers")) {
      const p: Promise<unknown>[] = [];
      if (isPageAllowed(user, "suppliers")) p.push(invoke<Named[]>("list_suppliers", { token }).then(setSuppliers).catch(() => undefined));
      if (isPageAllowed(user, "home")) p.push(invoke<Dashboard>("dashboard", { token }).then(setDashboard).catch(() => undefined));
      if (isPageAllowed(user, "customers")) p.push(invoke<Customer[]>("list_customers", { token }).then(setCustomers).catch(() => undefined));
      await Promise.all(p);
    }
  }
  async function execute(action: () => Promise<void>) {
    setBusy(true); setError(""); setNotice("");
    try { await action(); } catch (cause) { setError(String(cause)); } finally { setBusy(false); }
  }
  async function authenticate(username: string, fullName: string, password: string) {
    await execute(async () => {
      if (needsSetup) {
        await invoke("bootstrap_admin", { username, fullName, password });
        setNeedsSetup(false);
      }
      const user = await invoke<Session>("login", { username, password });
      sessionStorage.setItem(SESSION_KEY, user.token);
      const initial = getInitialPage(user);
      setSession(user);
      setPage(initial);
      setVisitedPages(new Set<Page>([initial]));
      await refresh(user);
    });
  }
  if (needsSetup === null) return <div className="splash" dir="rtl">جارٍ تجهيز النظام… {error}</div>;
  if (!session) return <Auth setup={needsSetup} busy={busy} error={error} onSubmit={authenticate} />;

  return (
    <div className="shell" dir="rtl">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo-container">
            <img src="/logo.png" alt="morsi for belt" className="brand-logo" />
          </div>
        </div>
        <div className="sidebar-nav-container">
          {menuGroups.map((group) => {
            const visibleItems = group.items.filter((item) => isPageAllowed(session, item.id));
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.categoryLabel || "top"} className="nav-group">
                {group.categoryLabel ? <span className="side-title">{group.categoryLabel}</span> : null}
                <nav>
                  {visibleItems.map((item) => (
                    <button
                      className={page === item.id ? "nav active" : "nav"}
                      key={item.id}
                      onClick={() => {
                        setPage(item.id);
                        setError("");
                        setNotice("");
                      }}
                    >
                      <span>{item.icon}</span>
                      {item.label}
                      {item.id === "products" && <kbd className="shortcut-hint" title="المنتجات: F1">F1</kbd>}
                      {item.id === "invoices" && <kbd className="shortcut-hint" title="سجل الفواتير: F2">F2</kbd>}
                      {item.id === "pos" && (
                        <>
                          {posDraftCount > 0 && (
                            <span className="sidebar-cart-badge" title={`${posDraftCount} قطعة في الفاتورة الحالية`}>
                              {posDraftCount}
                            </span>
                          )}
                          <kbd className="shortcut-hint" title="نقطة البيع: F3">F3</kbd>
                        </>
                      )}
                      {item.id === "returns" && <kbd className="shortcut-hint" title="المرتجعات: F4">F4</kbd>}
                      {item.id === "sales_report" && <kbd className="shortcut-hint" title="تقرير المبيعات: F6">F6</kbd>}
                      {item.id === "inventory_audit" && <kbd className="shortcut-hint" title="جرد المخزون: F7">F7</kbd>}
                      {item.id === "attendance" && <kbd className="shortcut-hint" title="سجل الحضور والانصراف: F9">F9</kbd>}
                      {item.id === "barcode_print" && <kbd className="shortcut-hint" title="طباعة الباركود: F10">F10</kbd>}
                    </button>
                  ))}
                </nav>
              </div>
            );
          })}
        </div>
        <div className="user-box">
          <span className="user-icon">{(session?.full_name || "م").slice(0, 1)}</span>
          <div>
            <strong>{session?.full_name || ""}</strong>
            <small>{session.role === "ADMIN" ? "مدير" : "بائع"}</small>
          </div>
          <button
            title="تسجيل الخروج"
            onClick={() => {
              sessionStorage.removeItem(SESSION_KEY);
              invoke("logout", { token: session.token }).catch(() => undefined);
              setSession(null);
            }}
          >
            <LuLogOut />
          </button>
        </div>
      </aside>
      <main className="content">
        <header className="topbar">
          <div className="topbar-title-block">
            <span className="eyebrow">MORSI FOR BELT</span>
            <h1>{allMenuItems.find((item) => item.id === page)?.label}</h1>
          </div>

          <div className="topbar-search-wrapper" ref={searchWrapperRef}>
            <div className="topbar-search-box">
              <LuSearch className="topbar-search-icon" />
              <input
                ref={globalSearchInputRef}
                type="text"
                className="topbar-search-input"
                value={globalSearch}
                onChange={(e) => {
                  setGlobalSearch(e.target.value);
                  setSearchDropdownOpen(true);
                }}
                onFocus={() => {
                  if (globalSearch.trim().length > 0) {
                    setSearchDropdownOpen(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setSearchDropdownOpen(false);
                  }
                }}
                placeholder="بحث عن فاتورة، منتج، عميل، أو موظف..."
                aria-label="البحث الشامل"
              />
              {globalSearch ? (
                <button
                  type="button"
                  className="topbar-search-clear"
                  onClick={() => {
                    setGlobalSearch("");
                    setSearchDropdownOpen(false);
                    globalSearchInputRef.current?.focus();
                  }}
                  title="مسح البحث"
                >
                  ×
                </button>
              ) : (
                <kbd className="topbar-search-kbd">Ctrl K</kbd>
              )}
            </div>

            {searchDropdownOpen && globalSearch.trim().length > 0 && (
              <div className="search-dropdown-menu">
                {searchResults.total === 0 ? (
                  <div className="search-dropdown-empty">
                    <p>لا توجد نتائج مطابقة لـ "{globalSearch}"</p>
                    <small>تأكد من كتابة رقم الفاتورة أو اسم المنتج/العميل/الموظف بدقة</small>
                  </div>
                ) : (
                  <>
                    {searchResults.invoices.length > 0 && (
                      <div className="search-dropdown-group">
                        <div className="search-group-title">
                          <LuReceipt />
                          <span>الفواتير</span>
                          <span className="search-group-count">{searchResults.invoices.length}</span>
                        </div>
                        {searchResults.invoices.map((inv) => (
                          <div
                            key={inv.invoiceNumber}
                            className="search-result-item"
                            onClick={() => {
                              setTargetInvoiceNumber(inv.invoiceNumber);
                              setPage("invoices");
                              setGlobalSearch("");
                              setSearchDropdownOpen(false);
                            }}
                          >
                            <div className="search-result-main">
                              <strong>فاتورة #{inv.invoiceNumber}</strong>
                              <small>{inv.customerName ? `العميل: ${inv.customerName}` : "عميل نقدي"} · {inv.createdAt.slice(0, 10)}</small>
                            </div>
                            <div className="search-result-meta">
                              <b>{money(inv.totalPiasters)}</b>
                              {inv.remainingPiasters > 0 && (
                                <span className="search-badge danger">متبقي: {money(inv.remainingPiasters)}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.products.length > 0 && (
                      <div className="search-dropdown-group">
                        <div className="search-group-title">
                          <LuPackage />
                          <span>المنتجات</span>
                          <span className="search-group-count">{searchResults.products.length}</span>
                        </div>
                        {searchResults.products.map((p) => (
                          <div
                            key={p.productId}
                            className="search-result-item"
                            onClick={() => {
                              setTargetProductSearch(p.name);
                              setPage("products");
                              setGlobalSearch("");
                              setSearchDropdownOpen(false);
                            }}
                          >
                            <div className="search-result-main">
                              <strong>{p.name}</strong>
                              <small>{p.category || "عام"} {p.barcode ? `· باركود: ${p.barcode}` : ""}</small>
                            </div>
                            <div className="search-result-meta">
                              <b>{money(p.sellPricePiasters)}</b>
                              <span className={`search-badge ${p.quantity <= p.lowStockThreshold ? "warning" : "success"}`}>
                                المخزون: {p.quantity}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.customers.length > 0 && (
                      <div className="search-dropdown-group">
                        <div className="search-group-title">
                          <LuUsers />
                          <span>العملاء</span>
                          <span className="search-group-count">{searchResults.customers.length}</span>
                        </div>
                        {searchResults.customers.map((c) => (
                          <div
                            key={c.id}
                            className="search-result-item"
                            onClick={() => {
                              setTargetCustomerId(c.id);
                              setPage("customers");
                              setGlobalSearch("");
                              setSearchDropdownOpen(false);
                            }}
                          >
                            <div className="search-result-main">
                              <strong>{c.name}</strong>
                              <small>{c.phone || "بدون رقم هاتف"}</small>
                            </div>
                            <div className="search-result-meta">
                              <span className="search-badge info">{c.invoiceCount} فواتير</span>
                              {c.outstandingPiasters > 0 && (
                                <span className="search-badge danger">آجل: {money(c.outstandingPiasters)}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {searchResults.employees.length > 0 && (
                      <div className="search-dropdown-group">
                        <div className="search-group-title">
                          <LuUserCheck />
                          <span>الموظفون</span>
                          <span className="search-group-count">{searchResults.employees.length}</span>
                        </div>
                        {searchResults.employees.map((emp) => (
                          <div
                            key={emp.id}
                            className="search-result-item"
                            onClick={() => {
                              setTargetEmployeeId(emp.id);
                              setPage("employees");
                              setGlobalSearch("");
                              setSearchDropdownOpen(false);
                            }}
                          >
                            <div className="search-result-main">
                              <strong>{emp.name}</strong>
                              <small>{emp.jobTitle} {emp.phone ? `· ${emp.phone}` : ""}</small>
                            </div>
                            <div className="search-result-meta">
                              <span className="search-badge neutral">{emp.jobTitle}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="topbar-actions">
            <button className="secondary" title="اختصار: F5" onClick={() => execute(async () => { await refresh(session); setNotice("تم تحديث البيانات"); })}>
              تحديث البيانات <kbd className="btn-kbd" style={{ background: "#f0e5da", color: "#6a4530", border: "1px solid #dfcfc0" }}>F5</kbd> <LuRefreshCw style={{ marginRight: "6px", verticalAlign: "middle" }} />
            </button>
          </div>
        </header>
        {error && <div className="message error" role="alert">{error}<button onClick={() => setError("")}>×</button></div>}
        {notice && <div className="message success" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    {session.role === "SELLER" && page === "home" && (
      (session.permissions?.includes("main_cashier" as Page) || session.permissions?.includes("attendance")) ? (
        <section className="panel attendance-widget" style={{ background: "#fffbeb", borderColor: "#fde68a", padding: "12px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>⭐</span>
            <div>
              <strong style={{ color: "#92400e" }}>حساب البائع الرئيسي المشترك (الكاشير العام)</strong>
              <p style={{ margin: "2px 0", fontSize: "12px", color: "#78350f" }}>
                متاح إثبات حضور وانصراف جميع موظفي المحل في وردية اليوم من صفحة سجل الحضور.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="primary"
            style={{ fontWeight: 700 }}
            onClick={() => setPage("attendance")}
          >
            📋 فتح سجل إثبات الحضور والانصراف (F9)
          </button>
        </section>
      ) : (
        <AttendanceWidget session={session} />
      )
    )}
    {visitedPages.has("home") && isPageAllowed(session, "home") && (
      <div style={{ display: page === "home" ? "block" : "none" }}>
        <Home
          dashboard={dashboard}
          invoices={invoices}
          products={products}
          session={session}
          go={setPage}
          onFilterStock={(filter) => {
            setInitialProductStockFilter(filter);
            setPage("products");
          }}
          onGoToInvoice={(num) => {
            setTargetInvoiceNumber(num);
            setPage("invoices");
          }}
        />
      </div>
    )}
    {visitedPages.has("categories") && isPageAllowed(session, "categories") && (
      <div style={{ display: page === "categories" ? "block" : "none" }}>
        <SimpleList title="التصنيفات" items={categories} busy={busy} add={(name) => execute(async () => { await invoke("create_category", { token: session.token, name }); await refresh(session); setNotice("تمت الإضافة"); })} />
      </div>
    )}
    {visitedPages.has("warehouses") && isPageAllowed(session, "warehouses") && (
      <div style={{ display: page === "warehouses" ? "block" : "none" }}>
        <SimpleList title="المخازن" items={warehouses} busy={busy} add={(name) => execute(async () => { await invoke("create_warehouse", { token: session.token, name }); await refresh(session); setNotice("تمت الإضافة"); })} />
      </div>
    )}
    {visitedPages.has("suppliers") && isPageAllowed(session, "suppliers") && (
      <div style={{ display: page === "suppliers" ? "block" : "none" }}>
        <Suppliers session={session} refresh={() => refresh(session)} setNotice={setNotice} setError={setError} />
      </div>
    )}
    {visitedPages.has("products") && isPageAllowed(session, "products") && (
      <div style={{ display: page === "products" ? "block" : "none" }}>
        <Products
          active={page === "products"}
          categories={categories}
          warehouses={warehouses}
          suppliers={suppliers}
          products={products}
          busy={busy}
          session={session}
          refresh={async () => refresh(session)}
          save={(input) => execute(async () => { await invoke("create_product", { token: session.token, input }); await refresh(session); setNotice("تم حفظ المنتج"); })}
          setNotice={setNotice}
          setError={setError}
          initialStockFilter={initialProductStockFilter}
          onResetStockFilter={() => setInitialProductStockFilter("all")}
          initialViewMode={productViewMode}
          addProductTrigger={addProductTrigger}
          onViewModeChange={setProductViewMode}
          targetProductSearch={targetProductSearch}
          onClearTargetProductSearch={() => setTargetProductSearch(null)}
        />
      </div>
    )}
    {visitedPages.has("customers") && isPageAllowed(session, "customers") && (
      <div style={{ display: page === "customers" ? "block" : "none" }}>
        <Customers customers={customers} session={session} refresh={() => refresh(session)} setNotice={setNotice} setError={setError} onGoToInvoice={(num) => { setTargetInvoiceNumber(num); setPage("invoices"); }} targetCustomerId={targetCustomerId} onClearTargetCustomerId={() => setTargetCustomerId(null)} />
      </div>
    )}
    {visitedPages.has("employees") && isPageAllowed(session, "employees") && (
      <div style={{ display: page === "employees" ? "block" : "none" }}>
        <Employees employees={employees} session={session} busy={busy} reload={async () => refresh(session)} save={(input) => execute(async () => { await invoke("create_employee", { token: session.token, input }); await refresh(session); setNotice("تم حفظ الموظف بنجاح"); })} targetEmployeeId={targetEmployeeId} onClearTargetEmployeeId={() => setTargetEmployeeId(null)} />
      </div>
    )}
    {visitedPages.has("attendance") && isPageAllowed(session, "attendance") && (
      <div style={{ display: page === "attendance" ? "block" : "none" }}>
        <DailyAttendance session={session} onGoToPos={() => setPage("pos")} />
      </div>
    )}
    {visitedPages.has("pos") && isPageAllowed(session, "pos") && (
      <div style={{ display: page === "pos" ? "block" : "none" }}>
        <Pos active={page === "pos"} products={products} employees={employees} customerChoices={customerChoices} session={session} busy={busy} save={(input, done) => execute(async () => { const result = await invoke<{ invoiceNumber: number }>("create_sale", { token: session.token, input }); await refresh(session); done(result.invoiceNumber); setNotice(`تم حفظ الفاتورة رقم ${result.invoiceNumber}`); })} />
      </div>
    )}
    {visitedPages.has("online_orders") && isPageAllowed(session, "online_orders") && (
      <div style={{ display: page === "online_orders" ? "block" : "none" }}>
        <OnlineOrders
          active={page === "online_orders"}
          products={products}
          customerChoices={customerChoices}
          session={session}
          onGoToInvoice={(num) => {
            setTargetInvoiceNumber(num);
            setPage("invoices");
          }}
          setNotice={setNotice}
          setError={setError}
          refresh={async () => refresh(session)}
        />
      </div>
    )}
    {visitedPages.has("invoices") && isPageAllowed(session, "invoices") && (
      <div style={{ display: page === "invoices" ? "block" : "none" }}>
        <Invoices active={page === "invoices"} invoices={invoices} session={session} targetInvoiceNumber={targetInvoiceNumber} onClearTargetInvoice={() => setTargetInvoiceNumber(null)} onRefreshData={() => void refresh(session)} />
      </div>
    )}
    {visitedPages.has("returns") && isPageAllowed(session, "returns") && (
      <div style={{ display: page === "returns" ? "block" : "none" }}>
        <ReturnsPage invoices={invoices} session={session} onRefreshData={() => refresh(session)} onGoToReport={() => setPage("sales_returns_report")} />
      </div>
    )}
    {visitedPages.has("sales_report") && isPageAllowed(session, "sales_report") && (
      <div style={{ display: page === "sales_report" ? "block" : "none" }}>
        <SalesReport active={page === "sales_report"} invoices={invoices} session={session} />
      </div>
    )}
    {visitedPages.has("sales_returns_report") && isPageAllowed(session, "sales_returns_report") && (
      <div style={{ display: page === "sales_returns_report" ? "block" : "none" }}>
        <SalesReturnsReport session={session} onRefreshData={() => refresh(session)} />
      </div>
    )}
    {visitedPages.has("product_movement_report") && isPageAllowed(session, "product_movement_report") && (
      <div style={{ display: page === "product_movement_report" ? "block" : "none" }}>
        <ProductMovementReport products={products} session={session} />
      </div>
    )}
    {visitedPages.has("barcode_print") && isPageAllowed(session, "barcode_print") && (
      <div style={{ display: page === "barcode_print" ? "block" : "none" }}>
        <BarcodePrintPage products={products} categories={categories} warehouses={warehouses} />
      </div>
    )}
    {visitedPages.has("inventory_audit") && isPageAllowed(session, "inventory_audit") && (
      <div style={{ display: page === "inventory_audit" ? "block" : "none" }}>
        <InventoryAudit
          products={products}
          categories={categories}
          warehouses={warehouses}
          session={session}
          refresh={async () => refresh(session)}
          setNotice={setNotice}
          setError={setError}
        />
      </div>
    )}
    {visitedPages.has("backup") && isPageAllowed(session, "backup") && (
      <div style={{ display: page === "backup" ? "block" : "none" }}>
        <BackupManagement
          session={session}
          setNotice={setNotice}
          setError={setError}
        />
      </div>
    )}
      </main>
    </div>
  );
}

function Auth({ setup, busy, error, onSubmit }: { setup: boolean; busy: boolean; error: string; onSubmit: (username: string, name: string, password: string) => void }) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loginUsers, setLoginUsers] = useState<LoginUserChoice[]>([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!setup) {
      invoke<LoginUserChoice[]>("list_login_users")
        .then((users) => {
          setLoginUsers(users);
        })
        .catch(() => undefined);
    }
  }, [setup]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredUsers = useMemo(() => {
    const q = username.trim().toLowerCase();
    if (!q) return loginUsers;
    return loginUsers.filter((u) =>
      u.username.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      (u.jobTitle && u.jobTitle.toLowerCase().includes(q))
    );
  }, [loginUsers, username]);

  function selectUser(user: LoginUserChoice) {
    setUsername(user.username);
    setDropdownOpen(false);
    setHighlightedIndex(-1);
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!dropdownOpen && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setDropdownOpen(true);
      return;
    }
    if (dropdownOpen && filteredUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filteredUsers.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev <= 0 ? filteredUsers.length - 1 : prev - 1));
      } else if (e.key === "Enter" && highlightedIndex >= 0 && highlightedIndex < filteredUsers.length) {
        e.preventDefault();
        selectUser(filteredUsers[highlightedIndex]);
      } else if (e.key === "Escape") {
        setDropdownOpen(false);
      }
    }
  }

  return (
    <div className="auth" dir="rtl">
      <div className="auth-form">
        <img
          src="/logo.png"
          alt="morsi for belt"
          style={{ maxWidth: "220px", height: "auto", marginBottom: "16px", background: "transparent" }}
        />
        <h1>{setup ? "إعداد المدير لأول مرة" : "أهلًا بعودتك"}</h1>
        <p>{setup ? "أنشئ حساب المدير لبدء استخدام النظام." : "سجّل الدخول للمتابعة إلى نظام الكاشير."}</p>
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(username, name, password); }}>
          {setup && <label>الاسم الكامل<input value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></label>}

          <label style={{ position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span>اسم المستخدم / حساب الموظف</span>
              {loginUsers.length > 0 && !setup && (
                <span style={{ fontSize: "11px", color: "#8c6b54", fontWeight: 600 }}>
                  ({loginUsers.length} حساب متاح)
                </span>
              )}
            </div>

            <div ref={containerRef} style={{ position: "relative" }}>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setDropdownOpen(true);
                  setHighlightedIndex(0);
                }}
                onFocus={() => {
                  if (loginUsers.length > 0 && !setup) setDropdownOpen(true);
                }}
                onKeyDown={handleKeyDown}
                placeholder={setup ? "اسم المستخدم للمدير" : (loginUsers.length > 0 ? "اختر موظفاً أو اكتب اسم المستخدم يدويًا…" : "اسم المستخدم")}
                required
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                style={{
                  paddingLeft: loginUsers.length > 0 && !setup ? "38px" : "12px",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />

              {!setup && loginUsers.length > 0 && (
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setDropdownOpen((prev) => !prev)}
                  title="عرض قائمة الموظفين المصرح لهم بتسجيل الدخول"
                  style={{
                    position: "absolute",
                    left: "6px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 8px",
                    fontSize: "13px",
                    color: "#8c6b54",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "6px",
                  }}
                >
                  <span style={{ transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
                    ▼
                  </span>
                </button>
              )}

              {/* Custom rich dropdown */}
              {!setup && dropdownOpen && filteredUsers.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    background: "#ffffff",
                    border: "1px solid #ebd8c8",
                    borderRadius: "10px",
                    boxShadow: "0 10px 25px -5px rgba(69, 26, 3, 0.15), 0 8px 10px -6px rgba(69, 26, 3, 0.1)",
                    maxHeight: "230px",
                    overflowY: "auto",
                    zIndex: 100,
                    padding: "6px",
                  }}
                >
                  <div style={{ padding: "4px 8px 6px", fontSize: "11px", color: "#8c6b54", borderBottom: "1px solid #f3ece4", marginBottom: "4px", display: "flex", justifyContent: "space-between" }}>
                    <span>الموظفون المصرح لهم بالدخول</span>
                    <span style={{ color: "#a67c55" }}>اضغط للاختيار السريع</span>
                  </div>

                  {filteredUsers.map((user, idx) => {
                    const isHighlighted = idx === highlightedIndex;
                    const isCurrentSelected = username.trim().toLowerCase() === user.username.toLowerCase();
                    const isAdm = user.role === "ADMIN";

                    return (
                      <div
                        key={user.username}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectUser(user);
                        }}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          cursor: "pointer",
                          background: isHighlighted || isCurrentSelected ? "#fcf6f0" : "transparent",
                          border: isCurrentSelected ? "1px solid #e0c8b6" : "1px solid transparent",
                          marginBottom: "2px",
                          transition: "background 0.1s ease",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "16px" }}>
                            {isAdm ? "👑" : (user.isMainSeller ? "⭐" : "👤")}
                          </span>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontWeight: 700, fontSize: "13px", color: "#34231c" }}>
                                {user.displayName}
                              </span>
                              <code style={{ fontSize: "11px", color: "#8c6b54", background: "#f5eee7", padding: "1px 5px", borderRadius: "4px" }}>
                                @{user.username}
                              </code>
                            </div>
                            {user.jobTitle && (
                              <span style={{ fontSize: "11px", color: isAdm ? "#b45309" : "#64748b" }}>
                                {user.jobTitle}
                              </span>
                            )}
                          </div>
                        </div>

                        {isAdm ? (
                          <span style={{ fontSize: "10px", background: "#fef3c7", color: "#92400e", border: "1px solid #fde68a", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                            مدير
                          </span>
                        ) : user.isMainSeller ? (
                          <span style={{ fontSize: "10px", background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                            كاشير عام
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </label>

          <label>
            كلمة المرور
            <input
              ref={passwordInputRef}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={setup ? 10 : undefined}
            />
          </label>
          {error && <div className="message error">{error}</div>}
          <button className="primary full" disabled={busy}>{busy ? "جارٍ التنفيذ…" : setup ? "إنشاء حساب المدير" : "تسجيل الدخول"}</button>
        </form>
      </div>
      <div className="auth-art">
        <div className="art-circle">
          <img
            src="/logo-m-gold.png"
            alt="M"
            style={{
              width: "125px",
              height: "auto",
              objectFit: "contain",
              filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.3))",
            }}
          />
        </div>
        <h2>إدارة أسهل.<br />بيع أسرع.</h2>
        <p>كل تفاصيل المحل في مكان واحد</p>
      </div>
    </div>
  );
}

function Home({
  dashboard,
  invoices,
  products,
  session,
  go,
  onFilterStock,
  onGoToInvoice,
}: {
  dashboard: Dashboard | null;
  invoices: Invoice[];
  products: Product[];
  session: Session;
  go: (page: Page) => void;
  onFilterStock?: (filter: "out" | "low") => void;
  onGoToInvoice?: (num: number) => void;
}) {
  const [activityTab, setActivityTab] = useState<"invoices" | "refunds">("invoices");
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [telegramNotice, setTelegramNotice] = useState("");
  const [telegramError, setTelegramError] = useState("");

  async function handleSendTodayReportTelegram() {
    setSendingTelegram(true);
    setTelegramNotice("");
    setTelegramError("");
    try {
      const res = await invoke<string>("send_daily_report_to_telegram", {
        token: session.token,
        date: null,
      });
      setTelegramNotice(res);
    } catch (err: unknown) {
      setTelegramError(String(err));
    } finally {
      setSendingTelegram(false);
    }
  }

  const [periodTab, setPeriodTab] = useState<"today" | "week" | "month" | "all">("today");

  const currentSummary: PeriodSummary = useMemo(() => {
    if (periodTab === "week" && dashboard?.week) return dashboard.week;
    if (periodTab === "month" && dashboard?.month) return dashboard.month;
    if (periodTab === "all" && dashboard?.allTime) return dashboard.allTime;
    if (dashboard?.today) return dashboard.today;
    return {
      grossSalesPiasters: dashboard?.todayGrossSalesPiasters ?? 0,
      refundsPiasters: dashboard?.todayRefundsPiasters ?? 0,
      refundsCount: dashboard?.todayRefundsCount ?? 0,
      netSalesPiasters: dashboard?.todayNetSalesPiasters ?? 0,
      profitPiasters: 0,
      collectedPiasters: dashboard?.todayCollectedPiasters ?? 0,
      creditSalesPiasters: dashboard?.todayCreditSalesPiasters ?? 0,
      debtCollectedPiasters: dashboard?.todayDebtCollectedPiasters ?? 0,
      invoicesCount: dashboard?.todayInvoicesCount ?? 0,
    };
  }, [periodTab, dashboard]);

  const activeGross = currentSummary.grossSalesPiasters;
  const activeRefunds = currentSummary.refundsPiasters;
  const activeRefundsCount = currentSummary.refundsCount;
  const activeNet = currentSummary.netSalesPiasters;
  const activeCollected = currentSummary.collectedPiasters;
  const activeProfit = currentSummary.profitPiasters;
  const activeCredit = currentSummary.creditSalesPiasters;
  const activeInvoicesCount = currentSummary.invoicesCount;

  const periodMeta = useMemo(() => {
    switch (periodTab) {
      case "week":
        return {
          title: "ملخص حركة الأسبوع",
          subtitle: "«آخر ٧ أيام»",
          badge: "آخر ٧ أيام",
          netSalesLabel: "صافي مبيعات الأسبوع",
          profitLabel: "ربح الأسبوع",
          invoicesLabel: "فواتير الأسبوع",
          creditLabel: "آجل الأسبوع والمرتجعات",
          creditSubLabel: "مبيعات آجلة للأسبوع:",
        };
      case "month":
        return {
          title: "ملخص حركة الشهر",
          subtitle: "«الشهر الحالي»",
          badge: "الشهر الحالي",
          netSalesLabel: "صافي مبيعات الشهر",
          profitLabel: "ربح الشهر",
          invoicesLabel: "فواتير الشهر",
          creditLabel: "آجل الشهر والمرتجعات",
          creditSubLabel: "مبيعات آجلة للشهر:",
        };
      case "all":
        return {
          title: "ملخص الحركة التراكمية",
          subtitle: "«طول الوقت»",
          badge: "طول الوقت",
          netSalesLabel: "إجمالي صافي المبيعات",
          profitLabel: "إجمالي الربح",
          invoicesLabel: "إجمالي عدد الفواتير",
          creditLabel: "إجمالي الآجل والمرتجعات",
          creditSubLabel: "إجمالي مبيعات آجلة:",
        };
      case "today":
      default:
        return {
          title: "ملخص حركة اليوم",
          subtitle: "«اليوم ماشي إزاي؟»",
          badge: "اليوم",
          netSalesLabel: "صافي مبيعات اليوم",
          profitLabel: "ربح اليوم",
          invoicesLabel: "فواتير اليوم",
          creditLabel: "آجل اليوم والمرتجعات",
          creditSubLabel: "مبيعات آجلة لليوم:",
        };
    }
  }, [periodTab]);

  const todayNet = dashboard?.todayNetSalesPiasters ?? 0;
  const yesterdayNet = dashboard?.yesterdayNetSalesPiasters ?? 0;

  // Compare Today vs Yesterday
  const diffPiasters = todayNet - yesterdayNet;
  const diffPercent = yesterdayNet > 0 ? Math.round(((todayNet - yesterdayNet) / yesterdayNet) * 100) : null;

  // Last 7 days trend
  const last7Days = dashboard?.last7Days ?? [];
  const maxSalesIn7Days = useMemo(() => {
    if (last7Days.length === 0) return 1;
    return Math.max(...last7Days.map((d) => Math.max(0, d.netSalesPiasters)), 1);
  }, [last7Days]);

  // Formatted Arabic date
  const arabicDateStr = useMemo(() => {
    try {
      const now = new Date();
      const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
      const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
      return `${days[now.getDay()]}، ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    } catch {
      return "";
    }
  }, []);

  // Granular variant-level alerts computation
  const variantStockMap = useMemo(() => {
    const map = new Map<string, {
      productId: number;
      variantId: number | null;
      productName: string;
      color: string | null;
      size: string | null;
      variantLabel: string;
      quantity: number;
      lowStockThreshold: number;
      warehouse: string;
      location: string | null;
    }>();

    for (const p of products) {
      const key = `${p.productId}-${p.variantId ?? "base"}`;
      const existing = map.get(key);
      const labelParts = [p.color, p.size ? `مقاس ${p.size}` : ""].filter(Boolean);
      const variantLabel = labelParts.length > 0 ? labelParts.join(" · ") : "المنتج الأساسي";

      if (!existing) {
        map.set(key, {
          productId: p.productId,
          variantId: p.variantId,
          productName: p.name,
          color: p.color,
          size: p.size,
          variantLabel,
          quantity: p.quantity,
          lowStockThreshold: p.lowStockThreshold,
          warehouse: p.warehouse,
          location: p.location ?? null,
        });
      } else {
        existing.quantity += p.quantity;
        if (p.location && !existing.location) existing.location = p.location;
        if (!existing.warehouse.includes(p.warehouse)) {
          existing.warehouse += `، ${p.warehouse}`;
        }
      }
    }
    return Array.from(map.values());
  }, [products]);

  const outOfStockVariants = useMemo(() => {
    return variantStockMap.filter((v) => v.quantity <= 0);
  }, [variantStockMap]);

  const lowStockVariants = useMemo(() => {
    return variantStockMap.filter((v) => v.quantity > 0 && v.quantity <= v.lowStockThreshold);
  }, [variantStockMap]);

  return (
    <div className="stack" style={{ gap: "24px" }}>
      {/* 1. WELCOME & QUICK ACTIONS BAR */}
      <div style={{
        background: "linear-gradient(135deg, #faf6f0 0%, #f4ede4 100%)",
        border: "1px solid #ebd8c8",
        borderRadius: "16px",
        padding: "20px 24px",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "16px",
        boxShadow: "0 4px 12px rgba(120, 80, 56, 0.05)",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ background: "#ebd8c8", color: "#543729", fontSize: "11px", fontWeight: 800, padding: "2px 8px", borderRadius: "6px" }}>
              لوحة التحكم والإدارة
            </span>
            <span style={{ fontSize: "12px", color: "#8b7b70" }}>📅 {arabicDateStr}</span>
          </div>
          <h2 style={{ margin: "4px 0", fontSize: "22px", color: "#2c1c14" }}>
            أهلاً بك، {session.full_name || "المدير"} 👋
          </h2>
          <p style={{ margin: 0, fontSize: "13px", color: "#785038" }}>
            نظرة شاملة ومباشرة على أداء المحل المالي وحركة المخزون لحظة بلحظة.
          </p>
        </div>

        {/* Quick action buttons */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          <button
            type="button"
            className="primary"
            onClick={() => go("pos")}
            style={{
              padding: "10px 18px",
              fontSize: "14px",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 4px 10px rgba(120, 80, 56, 0.25)",
            }}
          >
            <LuShoppingCart /> فاتورة جديدة (نقطة البيع)
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => go("products")}
            style={{ padding: "10px 14px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", background: "#fff" }}
          >
            <LuPackage /> المنتجات والمخزون
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => go("sales_report")}
            style={{ padding: "10px 14px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", background: "#fff" }}
          >
            <LuTrendingUp /> تقرير المبيعات
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => go("returns")}
            style={{ padding: "10px 14px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", background: "#fff" }}
          >
            <LuRotateCcw /> المرتجعات
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => go("inventory_audit")}
            style={{ padding: "10px 14px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", background: "#fff" }}
          >
            <LuClipboardCheck /> جرد المخزون
          </button>
        </div>
      </div>

      {/* 2. SUMMARY WITH PERIOD TABS: اليوم - الاسبوع - الشهر - طول الوقت */}
      <div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <h3 style={{ margin: 0, fontSize: "17px", color: "#34231c", display: "flex", alignItems: "center", gap: "8px" }}>
              💼 {periodMeta.title} <span style={{ fontSize: "12px", color: "#8b7b70", fontWeight: 400 }}>{periodMeta.subtitle}</span>
            </h3>

            {/* Period Tabs */}
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "#f4ede4",
              padding: "4px",
              borderRadius: "10px",
              border: "1px solid #e0d0c0",
            }}>
              {[
                { id: "today", label: "اليوم", icon: "📅" },
                { id: "week", label: "الأسبوع", icon: "🗓️" },
                { id: "month", label: "الشهر", icon: "📆" },
                { id: "all", label: "طول الوقت", icon: "⏳" },
              ].map((tab) => {
                const active = periodTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPeriodTab(tab.id as any)}
                    style={{
                      border: "none",
                      background: active ? "#785038" : "transparent",
                      color: active ? "#fff" : "#5d3a28",
                      padding: "6px 14px",
                      borderRadius: "7px",
                      fontWeight: active ? 800 : 600,
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      transition: "all 0.15s ease",
                      boxShadow: active ? "0 2px 6px rgba(120, 80, 56, 0.2)" : "none",
                    }}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              className="secondary"
              disabled={sendingTelegram}
              onClick={() => void handleSendTodayReportTelegram()}
              style={{
                padding: "6px 14px",
                fontSize: "13px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#f0fdf4",
                color: "#166534",
                borderColor: "#86efac",
                fontWeight: 700
              }}
              title="إرسال تقرير اليوم الشامل إلى تليجرام المدير"
            >
              <span>📲</span> {sendingTelegram ? "جارٍ الإرسال..." : "إرسال تقرير اليوم لتليجرام"}
            </button>
            <span style={{ fontSize: "12px", color: "#785038" }}>
              تحديث لحظي لحركة البيع والتحصيل
            </span>
          </div>
        </div>

        {telegramNotice && (
          <div className="message success" style={{ marginBottom: "12px" }} role="status">
            {telegramNotice}
            <button type="button" onClick={() => setTelegramNotice("")}>×</button>
          </div>
        )}
        {telegramError && (
          <div className="message error" style={{ marginBottom: "12px" }} role="alert">
            {telegramError}
            <button type="button" onClick={() => setTelegramError("")}>×</button>
          </div>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "14px"
        }}>
          {/* Card 1: Net Sales */}
          <div style={{
            background: "#fff",
            border: "1px solid #bbf7d0",
            borderRadius: "14px",
            padding: "16px 18px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#166534" }}>{periodMeta.netSalesLabel}</span>
              <span style={{ background: "#dcfce7", color: "#15803d", fontSize: "10px", fontWeight: 800, padding: "2px 6px", borderRadius: "6px" }}>
                بعد المرتجعات ({periodMeta.badge})
              </span>
            </div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "#14532d" }}>
              {money(activeNet)}
            </div>
            <div style={{ fontSize: "11px", color: "#4b5563", borderTop: "1px solid #f3f4f6", paddingTop: "6px", display: "flex", justifyContent: "space-between" }}>
              <span>إجمالي البيع: <strong>{money(activeGross)}</strong></span>
              <span style={{ color: activeRefunds > 0 ? "#dc2626" : undefined }}>المرتجع: <strong>-{money(activeRefunds)}</strong></span>
            </div>
          </div>

          {/* Card 2: Profit after discounts, returns and cost of goods */}
          <div style={{
            background: "#fff",
            border: "1px solid #bfdbfe",
            borderRadius: "14px",
            padding: "16px 18px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#1e40af" }}>{periodMeta.profitLabel}</span>
              <span style={{ background: "#dbeafe", color: "#1d4ed8", fontSize: "10px", fontWeight: 800, padding: "2px 6px", borderRadius: "6px" }}>
                بعد تكلفة البضاعة ({periodMeta.badge})
              </span>
            </div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: activeProfit < 0 ? "#b91c1c" : "#1e3a8a" }}>
              {money(activeProfit)}
            </div>
            <div style={{ fontSize: "11px", color: "#4b5563", borderTop: "1px solid #f3f4f6", paddingTop: "6px", display: "flex", justifyContent: "space-between" }}>
              <span>بعد الخصومات والمرتجعات وتكلفة القطع، وقبل مصاريف المحل</span>
            </div>
          </div>

          {/* Card 3: Invoices */}
          <div style={{
            background: "#fff",
            border: "1px solid #ebd8c8",
            borderRadius: "14px",
            padding: "16px 18px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#785038" }}>{periodMeta.invoicesLabel}</span>
              <button
                type="button"
                className="link-button"
                onClick={() => go("invoices")}
                style={{ fontSize: "11px", padding: 0 }}
              >
                فتح السجل ←
              </button>
            </div>
            <div style={{ fontSize: "24px", fontWeight: 900, color: "#543729" }}>
              {activeInvoicesCount} <span style={{ fontSize: "14px", fontWeight: 600 }}>فاتورة</span>
            </div>
            <div style={{ fontSize: "11px", color: "#8b7b70", borderTop: "1px solid #f9f5f0", paddingTop: "6px" }}>
              إجمالي كل الفواتير بالنظام: <strong>{dashboard?.totalInvoicesCount ?? (dashboard?.invoice_count ?? 0)}</strong>
            </div>
          </div>

          {/* Card 4: Credit Sales & Refunds */}
          <div style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "14px",
            padding: "16px 18px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#4b5563" }}>{periodMeta.creditLabel}</span>
              <span style={{ background: "#f3f4f6", color: "#4b5563", fontSize: "10px", fontWeight: 800, padding: "2px 6px", borderRadius: "6px" }}>
                مستحقات وتعديلات ({periodMeta.badge})
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "11px", color: "#6b7280", display: "block" }}>{periodMeta.creditSubLabel}</span>
                <strong style={{ fontSize: "16px", color: activeCredit > 0 ? "#b45309" : "#374151" }}>{money(activeCredit)}</strong>
              </div>
              <div style={{ textAlign: "left" }}>
                <span style={{ fontSize: "11px", color: "#6b7280", display: "block" }}>قيمة المرتجعات ({activeRefundsCount}):</span>
                <strong style={{ fontSize: "16px", color: activeRefunds > 0 ? "#dc2626" : "#374151" }}>{money(activeRefunds)}</strong>
              </div>
            </div>
            <div style={{ fontSize: "11px", color: "#8b7b70", borderTop: "1px solid #f3f4f6", paddingTop: "6px" }}>
              الفرق بين البيع والتحصيل: <strong>{money(activeNet - activeCollected)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. CLICKABLE ALERTS: إيه اللي محتاج تدخل؟ */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ margin: 0, fontSize: "17px", color: "#34231c", display: "flex", alignItems: "center", gap: "8px" }}>
            ⚡ تنبيهات تحتاج تدخّلك <span style={{ fontSize: "12px", color: "#8b7b70", fontWeight: 400 }}>«إيه اللي محتاج تدخل؟»</span>
          </h3>
          <span style={{ fontSize: "12px", color: "#8b7b70" }}>
            اضغط على أي تنبيه لاتخاذ إجراء مباشر
          </span>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "14px"
        }}>
          {/* Alert 1: Out of stock (Variant Aware) */}
          <div
            onClick={() => onFilterStock?.("out")}
            style={{
              background: outOfStockVariants.length > 0 ? "#fff5f5" : "#fafafa",
              border: `1.5px solid ${outOfStockVariants.length > 0 ? "#fca5a5" : "#e5e7eb"}`,
              borderRadius: "14px",
              padding: "16px 18px",
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(220, 38, 38, 0.12)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.03)"; }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 800, fontSize: "13px", color: "#991b1b", display: "flex", alignItems: "center", gap: "6px" }}>
                🚨 متغيرات ومقاسات نفدت بالكامل
              </span>
              <span style={{ color: "#dc2626", fontSize: "12px", fontWeight: 700 }}>
                عرض في المنتجات ←
              </span>
            </div>
            <div>
              <div style={{ fontSize: "26px", fontWeight: 900, color: outOfStockVariants.length > 0 ? "#dc2626" : "#4b5563" }}>
                {outOfStockVariants.length} <span style={{ fontSize: "14px", fontWeight: 700 }}>مقاس/متغير رصيده 0</span>
              </div>
              <small style={{ color: "#8b7b70", fontSize: "11px" }}>
                تتوزع على {new Set(outOfStockVariants.map((v) => v.productId)).size} منتج مختلف
              </small>
            </div>

            {/* PREVIEW LIST OF OUT-OF-STOCK VARIANTS */}
            {outOfStockVariants.length > 0 ? (
              <div style={{
                background: "#fff",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                padding: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                maxHeight: "140px",
                overflowY: "auto",
              }}>
                {outOfStockVariants.slice(0, 5).map((v) => (
                  <div
                    key={`${v.productId}-${v.variantId}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "12px",
                      padding: "4px 8px",
                      background: "#fef2f2",
                      borderRadius: "6px",
                      color: "#991b1b",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <strong>{v.productName}</strong>
                      <span style={{ color: "#b91c1c", fontWeight: 800 }}>· {v.variantLabel}</span>
                      {v.location && <span style={{ color: "#1d4ed8", fontSize: "11px", fontWeight: 700 }}>📍 {v.location}</span>}
                    </div>
                    <span style={{ fontWeight: 800, color: "#dc2626", whiteSpace: "nowrap" }}>
                      0 قطعة
                    </span>
                  </div>
                ))}
                {outOfStockVariants.length > 5 && (
                  <small style={{ textAlign: "center", color: "#b91c1c", fontWeight: 700, paddingTop: "2px" }}>
                    + {outOfStockVariants.length - 5} مقاسات/متغيرات أخرى... اضغط للاطلاع
                  </small>
                )}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "12px", color: "#15803d" }}>
                ✅ ممتاز! لا توجد حالياً أي متغيرات منتهية تماماً.
              </p>
            )}
          </div>

          {/* Alert 2: Low stock (Variant Aware) */}
          <div
            onClick={() => onFilterStock?.("low")}
            style={{
              background: lowStockVariants.length > 0 ? "#fffbeb" : "#fafafa",
              border: `1.5px solid ${lowStockVariants.length > 0 ? "#fcd34d" : "#e5e7eb"}`,
              borderRadius: "14px",
              padding: "16px 18px",
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(217, 119, 6, 0.12)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.03)"; }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 800, fontSize: "13px", color: "#92400e", display: "flex", alignItems: "center", gap: "6px" }}>
                ⚠️ متغيرات ومقاسات قاربت على النفاد
              </span>
              <span style={{ color: "#d97706", fontSize: "12px", fontWeight: 700 }}>
                عرض في المنتجات ←
              </span>
            </div>
            <div>
              <div style={{ fontSize: "26px", fontWeight: 900, color: lowStockVariants.length > 0 ? "#d97706" : "#4b5563" }}>
                {lowStockVariants.length} <span style={{ fontSize: "14px", fontWeight: 700 }}>مقاس/متغير حرج</span>
              </div>
              <small style={{ color: "#8b7b70", fontSize: "11px" }}>
                تتوزع على {new Set(lowStockVariants.map((v) => v.productId)).size} منتج مختلف
              </small>
            </div>

            {/* PREVIEW LIST OF LOW-STOCK VARIANTS */}
            {lowStockVariants.length > 0 ? (
              <div style={{
                background: "#fff",
                border: "1px solid #fde68a",
                borderRadius: "8px",
                padding: "8px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
                maxHeight: "140px",
                overflowY: "auto",
              }}>
                {lowStockVariants.slice(0, 5).map((v) => (
                  <div
                    key={`${v.productId}-${v.variantId}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "12px",
                      padding: "4px 8px",
                      background: "#fffbeb",
                      borderRadius: "6px",
                      color: "#92400e",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                      <strong>{v.productName}</strong>
                      <span style={{ color: "#b45309", fontWeight: 800 }}>· {v.variantLabel}</span>
                      {v.location && <span style={{ color: "#1d4ed8", fontSize: "11px", fontWeight: 700 }}>📍 {v.location}</span>}
                    </div>
                    <span style={{ fontWeight: 800, color: "#d97706", whiteSpace: "nowrap" }}>
                      متبقي {v.quantity} ق (الحد: {v.lowStockThreshold})
                    </span>
                  </div>
                ))}
                {lowStockVariants.length > 5 && (
                  <small style={{ textAlign: "center", color: "#b45309", fontWeight: 700, paddingTop: "2px" }}>
                    + {lowStockVariants.length - 5} مقاسات/متغيرات أخرى... اضغط للاطلاع
                  </small>
                )}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "12px", color: "#15803d" }}>
                ✅ ممتاز! كل المقاسات والألوان تتجاوز حد الأمان المطلوب.
              </p>
            )}
          </div>

          {/* Alert 3: Customer Debt */}
          <div
            onClick={() => go("customers")}
            style={{
              background: (dashboard?.totalCustomerDebtPiasters ?? 0) > 0 ? "#eff6ff" : "#fafafa",
              border: `1.5px solid ${(dashboard?.totalCustomerDebtPiasters ?? 0) > 0 ? "#bfdbfe" : "#e5e7eb"}`,
              borderRadius: "14px",
              padding: "16px 18px",
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(37, 99, 235, 0.12)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.03)"; }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 800, fontSize: "13px", color: "#1e40af", display: "flex", alignItems: "center", gap: "6px" }}>
                💰 إجمالي مديونيات العملاء
              </span>
              <span style={{ color: "#2563eb", fontSize: "12px", fontWeight: 700 }}>
                متابعة التحصيل ←
              </span>
            </div>
            <div style={{ fontSize: "26px", fontWeight: 900, color: (dashboard?.totalCustomerDebtPiasters ?? 0) > 0 ? "#1d4ed8" : "#4b5563" }}>
              {money(dashboard?.totalCustomerDebtPiasters ?? 0)}
            </div>
            <p style={{ margin: 0, fontSize: "12px", color: "#1e3a8a", opacity: 0.9 }}>
              {(dashboard?.totalCustomerDebtPiasters ?? 0) > 0
                ? `مستحقة لدى ${dashboard?.customersWithDebtCount ?? 0} عميل آجل. اضغط لتسجيل دفعات أو مراجعة كشوفات الحساب.`
                : "لا توجد أي مديونيات متأخرة على العملاء حالياً."}
            </p>
          </div>
        </div>
      </div>

      {/* 4. SALES TREND (LAST 7 DAYS & YESTERDAY COMPARISON) */}
      <section className="panel" style={{ padding: "20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: "18px", color: "#2c1c14", display: "flex", alignItems: "center", gap: "8px" }}>
              <LuTrendingUp style={{ color: "#c99a59" }} /> اتجاه المبيعات (آخر ٧ أيام)
            </h3>
            <p style={{ margin: 0, fontSize: "13px", color: "#8b7b70" }}>
              يوضح سرعة وحركة البيع اليومية مقارنة بالأيام السابقة.
            </p>
          </div>

          {/* Yesterday Comparison Badge */}
          <div style={{
            background: diffPiasters > 0 ? "#f0fdf4" : diffPiasters < 0 ? "#fef2f2" : "#f3f4f6",
            border: `1px solid ${diffPiasters > 0 ? "#bbf7d0" : diffPiasters < 0 ? "#fecaca" : "#e5e7eb"}`,
            borderRadius: "10px",
            padding: "8px 14px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "13px"
          }}>
            <span style={{ fontWeight: 700, color: "#374151" }}>مقارنة اليوم بأمس:</span>
            {diffPiasters > 0 ? (
              <strong style={{ color: "#15803d" }}>
                🟢 أعلى من أمس بـ +{money(diffPiasters)} {diffPercent !== null ? `(+${diffPercent}%)` : ""}
              </strong>
            ) : diffPiasters < 0 ? (
              <strong style={{ color: "#dc2626" }}>
                🔴 أقل من أمس بـ -{money(Math.abs(diffPiasters))} {diffPercent !== null ? `(${diffPercent}%)` : ""}
              </strong>
            ) : (
              <strong style={{ color: "#4b5563" }}>
                ⚪ مبيعات اليوم مساوية لمبيعات أمس ({money(todayNet)})
              </strong>
            )}
            <small style={{ color: "#6b7280" }}>| مبيعات أمس: {money(yesterdayNet)}</small>
          </div>
        </div>

        {/* 7-DAY BAR CHART */}
        <div style={{
          background: "#faf8f5",
          border: "1px solid #ebd8c8",
          borderRadius: "12px",
          padding: "20px 16px 12px",
          marginTop: "10px"
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${Math.max(last7Days.length, 1)}, 1fr)`,
            gap: "10px",
            alignItems: "flex-end",
            height: "190px",
            paddingBottom: "8px",
            borderBottom: "2px solid #e2d5c5"
          }}>
            {last7Days.map((day, idx) => {
              const isToday = idx === last7Days.length - 1;
              const isYesterday = idx === last7Days.length - 2;
              const val = Math.max(0, day.netSalesPiasters);
              const heightPercent = Math.max(10, Math.round((val / maxSalesIn7Days) * 100));

              return (
                <div
                  key={day.date}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    height: "100%",
                    justifyContent: "flex-end",
                    gap: "6px",
                    position: "relative"
                  }}
                  title={`${day.dayName} (${day.date})\nصافي المبيعات: ${money(day.netSalesPiasters)}\nإجمالي البيع: ${money(day.grossSalesPiasters)}\nالمرتجعات: ${money(day.refundsPiasters)}\nعدد الفواتير: ${day.invoiceCount}`}
                >
                  <span style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    color: isToday ? "#785038" : "#543729",
                    whiteSpace: "nowrap"
                  }}>
                    {money(val)}
                  </span>
                  <div
                    style={{
                      width: "100%",
                      maxWidth: "48px",
                      height: `${heightPercent}%`,
                      background: isToday
                        ? "linear-gradient(180deg, #785038 0%, #543729 100%)"
                        : "linear-gradient(180deg, #d8b278 0%, #b88640 100%)",
                      borderRadius: "6px 6px 2px 2px",
                      boxShadow: isToday ? "0 4px 10px rgba(120, 80, 56, 0.3)" : undefined,
                      transition: "height 0.3s ease",
                      position: "relative"
                    }}
                  />
                  <div style={{ textAlign: "center", marginTop: "4px" }}>
                    <strong style={{
                      display: "block",
                      fontSize: "12px",
                      color: isToday ? "#785038" : "#2c1c14",
                      fontWeight: isToday ? 900 : 700
                    }}>
                      {isToday ? "اليوم" : isYesterday ? "أمس" : day.dayName}
                    </strong>
                    <span style={{ fontSize: "10px", color: "#8b7b70" }}>
                      {day.date.slice(5).replace("-", "/")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", fontSize: "11px", color: "#8b7b70" }}>
            <span>💡 الأعمدة تعبّر عن صافي المبيعات اليومية بعد خصم المرتجعات.</span>
            <span>عمود باللون الداكن: <strong>اليوم</strong></span>
          </div>
        </div>
      </section>

      {/* 5. QUICK ACTIVITY: RECENT INVOICES & REFUNDS */}
      <section className="panel" style={{ padding: "20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          {/* TABS */}
          <div style={{ display: "flex", gap: "8px", background: "#f3ede5", padding: "4px", borderRadius: "10px" }}>
            <button
              type="button"
              onClick={() => setActivityTab("invoices")}
              style={{
                background: activityTab === "invoices" ? "#fff" : "transparent",
                color: activityTab === "invoices" ? "#543729" : "#8b7b70",
                fontWeight: 800,
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                cursor: "pointer",
                boxShadow: activityTab === "invoices" ? "0 2px 5px rgba(0,0,0,0.08)" : "none",
                fontSize: "13px"
              }}
            >
              🧾 آخر الفواتير ({invoices.slice(0, 6).length})
            </button>
            <button
              type="button"
              onClick={() => setActivityTab("refunds")}
              style={{
                background: activityTab === "refunds" ? "#fff" : "transparent",
                color: activityTab === "refunds" ? "#543729" : "#8b7b70",
                fontWeight: 800,
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                cursor: "pointer",
                boxShadow: activityTab === "refunds" ? "0 2px 5px rgba(0,0,0,0.08)" : "none",
                fontSize: "13px"
              }}
            >
              🔄 آخر المرتجعات ({dashboard?.recentRefunds?.length ?? 0})
            </button>
          </div>

          <div>
            {activityTab === "invoices" ? (
              <button className="link-button" onClick={() => go("invoices")}>
                عرض كل الفواتير ({invoices.length}) ←
              </button>
            ) : (
              <button className="link-button" onClick={() => go("returns")}>
                عرض كل المرتجعات والتقارير ←
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: INVOICES */}
        {activityTab === "invoices" && (
          <div>
            {invoices.length === 0 ? (
              <Empty text="لا توجد فواتير مسجلة حتى الآن." />
            ) : (
              <InvoiceTable
                invoices={invoices.slice(0, 6)}
                onViewDetails={onGoToInvoice}
              />
            )}
          </div>
        )}

        {/* TAB 2: REFUNDS */}
        {activityTab === "refunds" && (
          <div className="table-wrap">
            {(!dashboard?.recentRefunds || dashboard.recentRefunds.length === 0) ? (
              <Empty text="لا توجد عمليات إرجاع مسجلة مؤخراً." />
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>رقم المرتجع</th>
                    <th>رقم الفاتورة الأصلية</th>
                    <th>العميل</th>
                    <th>المبلغ المسترد</th>
                    <th>طريقة الإرجاع</th>
                    <th>المسؤول</th>
                    <th>التاريخ والوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentRefunds.map((rf) => (
                    <tr key={rf.id}>
                      <td><strong>#{rf.refundNumber}</strong></td>
                      <td>
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => onGoToInvoice ? onGoToInvoice(rf.invoiceNumber) : go("invoices")}
                        >
                          #{rf.invoiceNumber} 🔍
                        </button>
                      </td>
                      <td>{rf.customerName || "عميل نقدي"}</td>
                      <td><strong style={{ color: "#dc2626" }}>-{money(rf.totalRefundPiasters)}</strong></td>
                      <td>
                        <span className="pill">
                          {rf.refundMethod === "CASH" ? "نقدي" : rf.refundMethod === "INSTAPAY" ? "إنستاباي" : rf.refundMethod === "WALLET" ? "محفظة" : "خصم من الدين"}
                        </span>
                      </td>
                      <td><small>{rf.performedByName || rf.sellerName}</small></td>
                      <td><small>{rf.createdAt}</small></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function SimpleList({ title, items, busy, add }: { title: string; items: Named[]; busy: boolean; add: (name: string) => void }) { const [name, setName] = useState(""); return <section className="panel"><div className="section-head"><div><h2>{title}</h2><p>أضف عنصرًا جديدًا بالاسم</p></div><span className="pill">{items.length} عنصر</span></div><form className="inline" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { add(name); setName(""); } }}><input value={name} onChange={(e) => setName(e.target.value)} placeholder="الاسم" required /><button className="primary" disabled={busy}>+ إضافة</button></form><div className="tiles">{items.map((item) => <div key={item.id} className="tile"><span>◆</span><strong>{item.name}</strong><small>#{item.id}</small></div>)}</div>{!items.length && <Empty text="لا توجد عناصر بعد." />}</section>; }

function Products({ active = true, categories, warehouses, suppliers, products, busy, session, refresh, save, setNotice, setError, initialStockFilter, onResetStockFilter, initialViewMode = "list", addProductTrigger = 0, onViewModeChange, targetProductSearch, onClearTargetProductSearch }: { active?: boolean; categories: Named[]; warehouses: Named[]; suppliers: Named[]; products: Product[]; busy: boolean; session: Session; refresh: () => Promise<void>; save: (value: ProductPayload) => void; setNotice: (msg: string) => void; setError: (msg: string) => void; initialStockFilter?: "all" | "out" | "low"; onResetStockFilter?: () => void; initialViewMode?: "list" | "add"; addProductTrigger?: number; onViewModeChange?: (mode: "list" | "add") => void; targetProductSearch?: string | null; onClearTargetProductSearch?: () => void }) {
  const isAdmin = session.role === "ADMIN";
  const [viewMode, setViewMode] = useState<"list" | "add" | "edit">(initialViewMode);
  const [editingGroup, setEditingGroup] = useState<ProductGroup | null>(null);
  const productNameInputRef = useRef<HTMLInputElement>(null);
  const isFirstMount = useRef(true);

  // Focus input on initial mount if opened in add mode (from F1 on another page)
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (initialViewMode === "add") {
        setTimeout(() => {
          productNameInputRef.current?.focus();
          productNameInputRef.current?.select();
        }, 50);
      }
    }
  }, [initialViewMode]);

  // When F1 is pressed while already on the products page
  useEffect(() => {
    if (addProductTrigger > 0) {
      setViewMode("add");
      onViewModeChange?.("add");
      setTimeout(() => {
        productNameInputRef.current?.focus();
        productNameInputRef.current?.select();
      }, 50);
    }
  }, [addProductTrigger]);

  // When user clicks "المنتجات" in sidebar, switch back to list mode
  useEffect(() => {
    if (initialViewMode === "list" && !isFirstMount.current) {
      setViewMode("list");
      setEditingGroup(null);
    }
  }, [initialViewMode]);

  useEffect(() => {
    if (!active) return;
    function handleProductKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (viewMode !== "list") {
          e.preventDefault();
          setViewMode("list");
          onViewModeChange?.("list");
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.code === "KeyS" || e.key.toLowerCase() === "s" || e.key === "س")) {
        if (viewMode === "add" || viewMode === "edit") {
          e.preventDefault();
          const form = document.querySelector(".stack form") as HTMLFormElement | null;
          form?.requestSubmit();
        }
      }
    }
    window.addEventListener("keydown", handleProductKeyDown);
    return () => window.removeEventListener("keydown", handleProductKeyDown);
  }, [active, viewMode, onViewModeChange]);

  // Add Form State
  const [name, setName] = useState(""); const [categoryId, setCategoryId] = useState(""); const [warehouseId, setWarehouseId] = useState(""); const [supplierId, setSupplierId] = useState(""); const [buy, setBuy] = useState(""); const [sell, setSell] = useState(""); const [markup, setMarkup] = useState(""); const [barcode, setBarcode] = useState(""); const [threshold, setThreshold] = useState("0"); const [quantity, setQuantity] = useState("0");
  const [location, setLocation] = useState("");
  
  // Interactive Variants State
  const [colorsList, setColorsList] = useState<string[]>(["أسود", "بني", "هافان"]);
  const [sizesList, setSizesList] = useState<string[]>([]);
  const [customColorInput, setCustomColorInput] = useState("");
  const [customSizeInput, setCustomSizeInput] = useState("");
  const [variants, setVariants] = useState<{ color: string; size: string; quantity: string; location: string }[]>([]);

  // Edit Form State
  const [editName, setEditName] = useState(""); const [editBuy, setEditBuy] = useState(""); const [editSell, setEditSell] = useState(""); const [editThreshold, setEditThreshold] = useState("0"); const [editBarcode, setEditBarcode] = useState(""); const [editWarehouseId, setEditWarehouseId] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editQuantity, setEditQuantity] = useState("0");
  const [editVariants, setEditVariants] = useState<{ variantId: number | null; color: string; size: string; quantity: string; location: string }[]>([]);
  const totalEditVariantQty = editVariants.reduce((sum, v) => sum + (parseInt(v.quantity, 10) || 0), 0);

  // Search, Filters & Pagination State
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "out" | "low">(initialStockFilter ?? "all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const pageSize = 10;

  useEffect(() => {
    if (initialStockFilter) {
      setStockFilter(initialStockFilter);
      setCurrentPage(1);
    }
  }, [initialStockFilter]);

  useEffect(() => {
    if (targetProductSearch) {
      setSearch(targetProductSearch);
      setViewMode("list");
      setStockFilter("all");
      setCategoryFilter("");
      setSupplierFilter("");
      setWarehouseFilter("");
      setCurrentPage(1);
      onClearTargetProductSearch?.();
    }
  }, [targetProductSearch, onClearTargetProductSearch]);

  const selectedCategoryName = categories.find((item) => item.id === Number(categoryId))?.name ?? "";
  const isShoeCategory = /احذيه|حذاء|شوز|جزمه|كوتشي/i.test(normalizeArabic(selectedCategoryName));

  function rebuildVariants(nextColors: string[], nextSizes: string[]) {
    const updated: { color: string; size: string; quantity: string; location: string }[] = [];
    if (nextSizes.length === 0 && nextColors.length > 0) {
      for (const color of nextColors) {
        const existing = variants.find((v) => v.color === color && v.size === "");
        updated.push({ color, size: "", quantity: existing?.quantity ?? "0", location: existing?.location ?? "" });
      }
    } else if (nextColors.length > 0 && nextSizes.length > 0) {
      for (const color of nextColors) {
        for (const size of nextSizes) {
          const existing = variants.find((v) => v.color === color && v.size === size);
          const colorDefaultLocation = variants.find((v) => v.color === color && v.location)?.location ?? "";
          updated.push({ color, size, quantity: existing?.quantity ?? "0", location: existing?.location ?? colorDefaultLocation });
        }
      }
    } else if (nextColors.length === 0 && nextSizes.length > 0) {
      for (const size of nextSizes) {
        const existing = variants.find((v) => v.color === "" && v.size === size);
        updated.push({ color: "", size, quantity: existing?.quantity ?? "0", location: existing?.location ?? "" });
      }
    }
    setVariants(updated);
  }

  function addColor(c: string) {
    const trimmed = c.trim();
    if (!trimmed || colorsList.includes(trimmed)) return;
    const next = [...colorsList, trimmed];
    setColorsList(next);
    rebuildVariants(next, sizesList);
  }

  function removeColor(c: string) {
    const next = colorsList.filter((item) => item !== c);
    setColorsList(next);
    rebuildVariants(next, sizesList);
  }

  function addSize(s: string) {
    const trimmed = s.trim();
    if (!trimmed || sizesList.includes(trimmed)) return;
    const next = [...sizesList, trimmed].sort((a, b) => (isNaN(Number(a)) || isNaN(Number(b)) ? a.localeCompare(b) : Number(a) - Number(b)));
    setSizesList(next);
    const activeColors = colorsList.length ? colorsList : ["أسود", "بني", "هافان"];
    if (!colorsList.length) setColorsList(activeColors);
    rebuildVariants(activeColors, next);
  }

  function addShoeRange(from: number, to: number) {
    const range = Array.from({ length: to - from + 1 }, (_, i) => String(from + i));
    const next = [...new Set([...sizesList, ...range])].sort((a, b) => Number(a) - Number(b));
    setSizesList(next);
    const activeColors = colorsList.length ? colorsList : ["أسود", "بني", "هافان"];
    if (!colorsList.length) setColorsList(activeColors);
    rebuildVariants(activeColors, next);
  }

  function removeSize(s: string) {
    const next = sizesList.filter((item) => item !== s);
    setSizesList(next);
    rebuildVariants(colorsList, next);
  }

  function clearSizes() {
    setSizesList([]);
    rebuildVariants(colorsList, []);
  }

  const totalVariantQty = variants.reduce((sum, v) => sum + (parseInt(v.quantity, 10) || 0), 0);

  async function handleQuickCreateCategory(newCatName: string): Promise<string | void> {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    try {
      const newId = await invoke<number>("create_category", { token: session.token, name: trimmed });
      await refresh();
      setCategoryId(String(newId));
      const isShoe = /احذيه|حذاء|شوز|جزمه|كوتشي/i.test(normalizeArabic(trimmed));
      if (!isShoe) {
        setSizesList([]);
        rebuildVariants(colorsList, []);
      }
      setNotice(`تمت إضافة التصنيف "${trimmed}" وتحديده بنجاح`);
      return String(newId);
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message || "فشل إضافة التصنيف";
      setError(msg);
      throw new Error(msg);
    }
  }

  async function handleQuickCreateWarehouse(newWhName: string): Promise<string | void> {
    const trimmed = newWhName.trim();
    if (!trimmed) return;
    try {
      const newId = await invoke<number>("create_warehouse", { token: session.token, name: trimmed });
      await refresh();
      setWarehouseId(String(newId));
      setNotice(`تمت إضافة المخزن "${trimmed}" وتحديده بنجاح`);
      return String(newId);
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message || "فشل إضافة المخزن";
      setError(msg);
      throw new Error(msg);
    }
  }

  async function handleQuickCreateSupplier(newSupName: string): Promise<string | void> {
    const trimmed = newSupName.trim();
    if (!trimmed) return;
    try {
      const newId = await invoke<number>("create_supplier", { token: session.token, name: trimmed });
      await refresh();
      setSupplierId(String(newId));
      setNotice(`تمت إضافة المورد "${trimmed}" وتحديده بنجاح`);
      return String(newId);
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message || "فشل إضافة المورد";
      setError(msg);
      throw new Error(msg);
    }
  }

  async function handleQuickCreateWarehouseForEdit(newWhName: string): Promise<string | void> {
    const trimmed = newWhName.trim();
    if (!trimmed) return;
    try {
      const newId = await invoke<number>("create_warehouse", { token: session.token, name: trimmed });
      await refresh();
      setEditWarehouseId(String(newId));
      setNotice(`تمت إضافة المخزن "${trimmed}" وتحديده بنجاح`);
      return String(newId);
    } catch (err: any) {
      const msg = typeof err === "string" ? err : err?.message || "فشل إضافة المخزن";
      setError(msg);
      throw new Error(msg);
    }
  }

  const [quickAddModal, setQuickAddModal] = useState<{
    type: "category" | "warehouse" | "supplier" | "warehouse_edit";
    title: string;
    label: string;
    placeholder: string;
  } | null>(null);
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddBusy, setQuickAddBusy] = useState(false);
  const quickAddInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (quickAddModal) {
      setQuickAddName("");
      setTimeout(() => {
        quickAddInputRef.current?.focus();
      }, 50);
    }
  }, [quickAddModal]);

  async function handleQuickAddModalSubmit(e: FormEvent) {
    e.preventDefault();
    if (!quickAddModal || !quickAddName.trim() || quickAddBusy) return;
    setQuickAddBusy(true);
    try {
      if (quickAddModal.type === "category") {
        await handleQuickCreateCategory(quickAddName);
      } else if (quickAddModal.type === "warehouse") {
        await handleQuickCreateWarehouse(quickAddName);
      } else if (quickAddModal.type === "supplier") {
        await handleQuickCreateSupplier(quickAddName);
      } else if (quickAddModal.type === "warehouse_edit") {
        await handleQuickCreateWarehouseForEdit(quickAddName);
      }
      setQuickAddModal(null);
    } catch {
      // Error handled in respective quick-create functions
    } finally {
      setQuickAddBusy(false);
    }
  }

  function generateUnique7DigitBarcode(existingCodes: Set<string>): string {
    let candidate = "";
    let attempts = 0;
    while (attempts < 5000) {
      attempts++;
      // Random 7-digit number between 1000000 and 9999999
      const num = Math.floor(1000000 + Math.random() * 9000000);
      candidate = num.toString();
      if (!existingCodes.has(candidate)) {
        return candidate;
      }
    }
    // Fallback: 7 digits from timestamp
    return Date.now().toString().slice(-7);
  }

  function handleGenerateUniqueBarcode() {
    const existing = new Set(
      products.map((p) => (p.barcode || "").trim()).filter(Boolean)
    );
    const uniqueCode = generateUnique7DigitBarcode(existing);
    setBarcode(uniqueCode);
    setNotice(`تم توليد باركود عشوائي فريد بنجاح (7 أرقام): ${uniqueCode}`);
  }

  function handleGenerateUniqueBarcodeForEdit() {
    const existing = new Set(
      products
        .filter((p) => !editingGroup || p.productId !== editingGroup.productId)
        .map((p) => (p.barcode || "").trim())
        .filter(Boolean)
    );
    const uniqueCode = generateUnique7DigitBarcode(existing);
    setEditBarcode(uniqueCode);
    setNotice(`تم توليد باركود عشوائي فريد بنجاح (7 أرقام): ${uniqueCode}`);
  }

  function submitAdd(e: FormEvent) {
    e.preventDefault();
    save({
      name,
      categoryId: Number(categoryId),
      warehouseId: Number(warehouseId),
      supplierId: supplierId ? Number(supplierId) : null,
      barcode: barcode || null,
      buyPricePiasters: piastres(buy),
      sellPricePiasters: piastres(sell),
      lowStockThreshold: Number(threshold),
      openingQuantity: variants.length > 0 ? 0 : Number(quantity || 0),
      location: location.trim() || null,

      variants: variants.map((v) => ({
        color: v.color || "افتراضي",
        size: v.size || "عام",
        openingQuantity: Number(v.quantity || 0),
        location: v.location?.trim() || null,
      }))
    });
    setName(""); setCategoryId(""); setWarehouseId(""); setSupplierId(""); setBuy(""); setSell(""); setMarkup(""); setBarcode(""); setThreshold("0"); setQuantity("0"); setLocation("");
    setColorsList(["أسود", "بني", "هافان"]); setSizesList([]); setVariants([]); setCustomColorInput(""); setCustomSizeInput("");
    setViewMode("list");
    onViewModeChange?.("list");
  }

  function startEdit(group: ProductGroup) {
    setEditingGroup(group);
    setEditName(group.name);
    const firstRow = group.rows[0];
    setEditBuy(firstRow ? (firstRow.buyPricePiasters / 100).toFixed(2) : "0");
    setEditSell(firstRow ? (firstRow.sellPricePiasters / 100).toFixed(2) : "0");
    setEditThreshold(String(group.lowStockThreshold));
    setEditBarcode(group.barcode || "");
    setEditWarehouseId(firstRow ? String(firstRow.warehouseId) : "");
    setEditLocation(firstRow?.location || "");

    const isSimpleProduct =
      group.rows.length === 1 &&
      (group.rows[0].variantId === null ||
        (!group.rows[0].color && !group.rows[0].size) ||
        (group.rows[0].color === "افتراضي" && group.rows[0].size === "عام"));

    if (isSimpleProduct) {
      setEditQuantity(String(group.rows[0]?.quantity ?? group.totalQuantity ?? 0));
      setEditVariants([]);
    } else {
      setEditQuantity(String(group.totalQuantity));
      setEditVariants(
        group.rows.map((r) => ({
          variantId: r.variantId,
          color: r.color || "",
          size: r.size || "",
          quantity: String(r.quantity),
          location: r.location || "",
        }))
      );
    }
    setViewMode("edit");
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editingGroup) return;
    try {
      await invoke("update_product", {
        token: session.token,
        input: {
          productId: editingGroup.productId,
          name: editName,
          buyPricePiasters: piastres(editBuy),
          sellPricePiasters: piastres(editSell),
          lowStockThreshold: Number(editThreshold),
          barcode: editBarcode || null,
          warehouseId: editWarehouseId ? Number(editWarehouseId) : null,
          location: editLocation.trim() || null,
          quantity: editVariants.length === 0 ? Number(editQuantity || 0) : null,
          variants: editVariants.length === 0 ? [] : editVariants.map((v) => ({
            variantId: v.variantId,
            color: v.color || "افتراضي",
            size: v.size || "عام",
            quantity: Number(v.quantity || 0),
            location: v.location?.trim() || null,
          })),
        },
      });
      await refresh();
      setNotice(`تم تعديل المنتج "${editName}" بنجاح`);
      setViewMode("list");
      onViewModeChange?.("list");
    } catch (err: unknown) {
      setError(String(err) || "تعذر تعديل المنتج");
    }
  }

  async function handleDelete(p: Product) {
    if (!window.confirm(`هل أنت تأكد من حذف المنتج "${p.name}"؟`)) return;
    try {
      await invoke("delete_product", { token: session.token, productId: p.productId });
      await refresh();
      setNotice(`تم حذف المنتج "${p.name}" بنجاح`);
    } catch (err: unknown) {
      setError(String(err) || "تعذر حذف المنتج");
    }
  }

  const groupedProducts = groupProductRows(products);
  const filtered = groupedProducts.filter((group) => {
    // 1. Text Search Filter
    if (search.trim()) {
      const text = [
        group.name,
        group.barcode,
        group.category,
        group.supplierName || "",
        ...group.colors,
        ...group.sizes,
        ...group.warehouses
      ].join(" ").toLowerCase();
      if (!text.includes(search.toLowerCase().trim())) return false;
    }

    // 2. Category Filter
    if (categoryFilter !== "") {
      const selectedCategoryObj = categories.find((c) => String(c.id) === categoryFilter);
      if (selectedCategoryObj && group.category !== selectedCategoryObj.name) return false;
    }

    // 3. Supplier Filter
    if (supplierFilter !== "") {
      const selectedSupplierObj = suppliers.find((s) => String(s.id) === supplierFilter);
      if (selectedSupplierObj && group.supplierName !== selectedSupplierObj.name) return false;
    }

    // 4. Warehouse Filter
    if (warehouseFilter !== "") {
      const selectedWarehouseObj = warehouses.find((w) => String(w.id) === warehouseFilter);
      if (selectedWarehouseObj && !group.warehouses.includes(selectedWarehouseObj.name)) return false;
    }

    // 5. Stock Status Filter (Variant Aware)
    if (stockFilter === "out") {
      const hasOutOfStock = group.rows.some((r) => r.quantity <= 0);
      if (!hasOutOfStock) return false;
    }
    if (stockFilter === "low") {
      const hasLowStock = group.rows.some((r) => r.quantity > 0 && r.quantity <= group.lowStockThreshold);
      if (!hasLowStock) return false;
    }

    return true;
  });
  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedProducts = filtered.slice(startIndex, startIndex + pageSize);

  return <div className="stack">
    {viewMode === "add" && (
      <section className="panel">
        <div className="breadcrumb"><button type="button" className="link-button" onClick={() => { setViewMode("list"); onViewModeChange?.("list"); }}>→ المنتجات</button><span>/ إضافة منتج جديد</span></div>
        <div className="section-head"><div><h2>إضافة منتج جديد</h2><p>البيانات الأساسية والألوان والمقاسات والمخزون الافتتاحي</p></div></div>
        <form onSubmit={submitAdd}>
          <div className="form-grid">
            <label>اسم المنتج<input ref={productNameInputRef} value={name} onChange={(e) => setName(e.target.value)} required autoFocus /></label>
            <div className="field">
              <div className="field-header-row">
                <span className="field-label">التصنيف</span>
                <button
                  type="button"
                  className="field-quick-add"
                  title="إضافة تصنيف جديد"
                  onClick={() => setQuickAddModal({
                    type: "category",
                    title: "إضافة تصنيف جديد",
                    label: "اسم التصنيف الجديد",
                    placeholder: "مثال: أحذية كاجوال / بنطلونات",
                  })}
                >
                  + تصنيف جديد
                </button>
              </div>
              <BrandCreatableSelect
                label="التصنيف"
                value={categoryId}
                onValueChange={(nextId) => {
                  setCategoryId(nextId);
                  const catName = categories.find((x) => x.id === Number(nextId))?.name ?? "";
                  const isShoe = /احذيه|حذاء|شوز|جزمه|كوتشي/i.test(normalizeArabic(catName));
                  if (!isShoe) {
                    setSizesList([]);
                    rebuildVariants(colorsList, []);
                  }
                }}
                required
                placeholder="اختر أو اكتب تصنيف جديد"
                options={categories.map((x) => ({ value: String(x.id), label: x.name }))}
                onCreate={handleQuickCreateCategory}
              />
            </div>
            <div className="field">
              <div className="field-header-row">
                <span className="field-label">المخزن</span>
                <button
                  type="button"
                  className="field-quick-add"
                  title="إضافة مخزن جديد"
                  onClick={() => setQuickAddModal({
                    type: "warehouse",
                    title: "إضافة مخزن جديد",
                    label: "اسم المخزن الجديد",
                    placeholder: "مثال: مخزن المحل / المخزن الرئيسي",
                  })}
                >
                  + مخزن جديد
                </button>
              </div>
              <BrandCreatableSelect
                label="المخزن"
                value={warehouseId}
                onValueChange={setWarehouseId}
                required
                placeholder="اختر أو اكتب مخزن جديد"
                options={warehouses.map((x) => ({ value: String(x.id), label: x.name }))}
                onCreate={handleQuickCreateWarehouse}
              />
            </div>
            <div className="field">
              <div className="field-header-row">
                <span className="field-label">المورد</span>
                <button
                  type="button"
                  className="field-quick-add"
                  title="إضافة مورد جديد"
                  onClick={() => setQuickAddModal({
                    type: "supplier",
                    title: "إضافة مورد جديد",
                    label: "اسم المورد الجديد",
                    placeholder: "مثال: مصنع النور / الحاج أحمد",
                  })}
                >
                  + مورد جديد
                </button>
              </div>
              <BrandCreatableSelect
                label="المورد"
                value={supplierId}
                onValueChange={setSupplierId}
                placeholder="بدون مورد (أو اكتب مورد جديد)"
                emptyOptionLabel="بدون مورد"
                options={suppliers.map((x) => ({ value: String(x.id), label: x.name }))}
                onCreate={handleQuickCreateSupplier}
              />
            </div>
            <label>سعر الشراء بالجنيه<input type="number" min="0" step="0.01" value={buy} onChange={(e) => { setBuy(e.target.value); if (markup) setSell((Number(e.target.value) * (1 + Number(markup) / 100)).toFixed(2)); }} required /></label>
            <label>نسبة الزيادة %<input type="number" min="0" step="0.01" value={markup} onChange={(e) => { setMarkup(e.target.value); if (buy && e.target.value) setSell((Number(buy) * (1 + Number(e.target.value) / 100)).toFixed(2)); }} /></label>
            <label>سعر البيع بالجنيه<input type="number" min="0" step="0.01" value={sell} onChange={(e) => setSell(e.target.value)} required /></label>
            <label>تحذير المخزون<input type="number" min="0" value={threshold} onChange={(e) => setThreshold(e.target.value)} required /></label>
            <div className="field">
              <div className="field-header-row">
                <span className="field-label">
                  باركود المنتج <small style={{ fontWeight: 400, color: "#9b897b" }}>(اختياري)</small>
                </span>
                <button
                  type="button"
                  className="field-quick-add"
                  title="توليد باركود عشوائي فريد وغير مكرر"
                  onClick={handleGenerateUniqueBarcode}
                >
                  🎲 باركود عشوائي
                </button>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  placeholder="أدخل باركود أو اضغط توليد..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="secondary"
                  onClick={handleGenerateUniqueBarcode}
                  title="توليد باركود عشوائي فريد وغير مكرر"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    whiteSpace: "nowrap",
                    padding: "0 13px",
                    height: "40px",
                    borderRadius: "9px",
                    fontSize: "13px",
                    fontWeight: 700,
                    borderColor: "#c99a59",
                    color: "#785038",
                    background: "#fffaf4",
                    flexShrink: 0,
                  }}
                >
                  <LuBarcode style={{ fontSize: "16px" }} />
                  <span>توليد</span>
                </button>
              </div>
            </div>
            <label>مكان الصنف / الرف بالمحل <small>اختياري</small><input placeholder="مثال: رف 1 / ستاند أ" value={location} onChange={(e) => setLocation(e.target.value)} /></label>
            <label>الكمية الإجمالية {variants.length > 0 && <small style={{ color: "#785038" }}> (مجموع المتغيرات الحالية: {totalVariantQty})</small>}<input type="number" min="0" value={variants.length > 0 ? totalVariantQty : quantity} onChange={(e) => setQuantity(e.target.value)} readOnly={variants.length > 0} required /></label>

          </div>

          {/* Interactive Variant Management Section */}
          <div className="variant-section">
            <h3>🎨 ألوان ومقاسات المنتج (المتغيرات)</h3>

            {/* Colors */}
            <div className="variant-group">
              <label>الألوان المتاحة (اضغط لإضافة لون أو احذف/أضف ألوان مخصصة)</label>
              <div className="preset-buttons">
                {["أسود", "بني", "هافان", "كحلي", "أبيض", "زيتي", "جملي"].map((c) => (
                  <button key={c} type="button" className="preset-btn" onClick={() => addColor(c)}>+ {c}</button>
                ))}
              </div>
              <div className="tag-list">
                {colorsList.map((c) => (
                  <span key={c} className="variant-tag">{c} <button type="button" title="حذف هذا اللون" onClick={() => removeColor(c)}>×</button></span>
                ))}
                {!colorsList.length && <small style={{ color: "#9b897b" }}>لا توجد ألوان مضافة.</small>}
              </div>
              <div className="add-tag-inline">
                <input placeholder="إضافة لون مخصص (مثال: كافيه)..." value={customColorInput} onChange={(e) => setCustomColorInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addColor(customColorInput); setCustomColorInput(""); } }} />
                <button type="button" className="secondary" onClick={() => { addColor(customColorInput); setCustomColorInput(""); }}>+ إضافة لون</button>
              </div>
            </div>

            {/* Sizes (ONLY shown if category is Shoes) */}
            {isShoeCategory && (
              <div className="variant-group" style={{ marginTop: "22px" }}>
                <label>مقاسات الأحذية <span className="pill" style={{ fontSize: "11px", marginRight: "6px" }}>تصنيف أحذية</span></label>
                <div className="preset-buttons">
                  <button type="button" className="preset-btn" onClick={() => addShoeRange(16, 26)}>👶 مقاس البيبي (16–26)</button>
                  <button type="button" className="preset-btn" onClick={() => addShoeRange(21, 37)}>👧 مقاس الأطفال (21–37)</button>
                  <button type="button" className="preset-btn" onClick={() => addShoeRange(36, 40)}>👩 مقاس الحريمي (36–40)</button>
                  <button type="button" className="preset-btn" onClick={() => addShoeRange(41, 45)}>👨 مقاس الرجالي (41–45)</button>
                  {sizesList.length > 0 && <button type="button" className="link-button" onClick={clearSizes} style={{ fontSize: "12px", color: "#b94d3f" }}>مسح المقاسات</button>}
                </div>
                <div className="tag-list">
                  {sizesList.map((s) => (
                    <span key={s} className="variant-tag">مقاس {s} <button type="button" title="حذف هذا المقاس" onClick={() => removeSize(s)}>×</button></span>
                  ))}
                  {!sizesList.length && <small style={{ color: "#9b897b" }}>اختر أحد أزرار المقاسات السريعة أعلاه أو أضف مقاسًا مخصصًا.</small>}
                </div>
                <div className="add-tag-inline">
                  <input placeholder="إضافة مقاس مخصص (مثال: 46)..." value={customSizeInput} onChange={(e) => setCustomSizeInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSize(customSizeInput); setCustomSizeInput(""); } }} />
                  <button type="button" className="secondary" onClick={() => { addSize(customSizeInput); setCustomSizeInput(""); }}>+ إضافة مقاس</button>
                </div>
              </div>
            )}

            {/* Variants Quantities Grid */}
            {variants.length > 0 && (
              <div style={{ marginTop: "22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <strong style={{ fontSize: "14px", color: "#785038" }}>جدول تحديد الكميات والمكان بالمحل لكل لون/مقاس ({variants.length} تركيبات):</strong>
                  <span className="pill" style={{ background: "#785038", color: "#fff" }}>المجموع الإجمالي: {totalVariantQty} قطعة</span>
                </div>
                <div className="variant-card-grid">
                  {variants.map((v, i) => (
                    <div key={`${v.color}-${v.size}`} className="variant-card" style={{ gap: "6px" }}>
                      <span className="variant-card-title">{v.color} {v.size ? `· مقاس ${v.size}` : ""}</span>
                      <label style={{ fontSize: "11px", marginBottom: "0" }}>المكان في المحل / الرف
                        <input
                          placeholder="مثال: ستاند 1 / رف ب..."
                          value={v.location}
                          onChange={(e) => {
                            const newLoc = e.target.value;
                            setVariants((old) => old.map((item, index) => {
                              if (index === i) return { ...item, location: newLoc };
                              if (item.color === v.color && !item.location) return { ...item, location: newLoc };
                              return item;
                            }));
                          }}
                        />
                      </label>
                      <label style={{ fontSize: "11px", marginBottom: "0" }}>الكمية الافتتاحية
                        <input type="number" min="0" value={v.quantity} onChange={(e) => setVariants((old) => old.map((item, index) => index === i ? { ...item, quantity: e.target.value } : item))} />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="button-row" style={{ marginTop: "15px" }}><button className="primary" disabled={busy || !categories.length || !warehouses.length}>حفظ المنتج</button><button type="button" className="secondary" onClick={() => { setViewMode("list"); onViewModeChange?.("list"); }}>إلغاء</button></div>
        </form>
      </section>
    )}

    {viewMode === "edit" && editingGroup && (
      <section className="panel">
        <div className="breadcrumb"><button type="button" className="link-button" onClick={() => { setViewMode("list"); onViewModeChange?.("list"); }}>→ المنتجات</button><span>/ تعديل المنتج: {editingGroup.name}</span></div>
        <div className="section-head"><div><h2>تعديل بيانات المنتج والمتغيرات</h2><p>{editingGroup.category}</p></div></div>
        <form onSubmit={submitEdit}>
          <div className="form-grid">
            <label>اسم المنتج<input value={editName} onChange={(e) => setEditName(e.target.value)} required /></label>
            <div className="field">
              <div className="field-header-row">
                <span className="field-label">المخزن</span>
                <button
                  type="button"
                  className="field-quick-add"
                  title="إضافة مخزن جديد"
                  onClick={() => setQuickAddModal({
                    type: "warehouse_edit",
                    title: "إضافة مخزن جديد",
                    label: "اسم المخزن الجديد",
                    placeholder: "مثال: مخزن المحل / المخزن الرئيسي",
                  })}
                >
                  + مخزن جديد
                </button>
              </div>
              <BrandCreatableSelect
                label="المخزن"
                value={editWarehouseId}
                onValueChange={setEditWarehouseId}
                required
                placeholder="اختر أو اكتب مخزن جديد"
                options={warehouses.map((x) => ({ value: String(x.id), label: x.name }))}
                onCreate={handleQuickCreateWarehouseForEdit}
              />
            </div>
            <label>سعر الشراء بالجنيه<input type="number" min="0" step="0.01" value={editBuy} onChange={(e) => setEditBuy(e.target.value)} required /></label>
            <label>سعر البيع بالجنيه<input type="number" min="0" step="0.01" value={editSell} onChange={(e) => setEditSell(e.target.value)} required /></label>
            <label>تحذير المخزون<input type="number" min="0" value={editThreshold} onChange={(e) => setEditThreshold(e.target.value)} required /></label>
            <div className="field">
              <div className="field-header-row">
                <span className="field-label">
                  الباركود <small style={{ fontWeight: 400, color: "#9b897b" }}>(اختياري)</small>
                </span>
                <button
                  type="button"
                  className="field-quick-add"
                  title="توليد باركود عشوائي فريد وغير مكرر"
                  onClick={handleGenerateUniqueBarcodeForEdit}
                >
                  🎲 باركود عشوائي
                </button>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  placeholder="أدخل باركود أو اضغط توليد..."
                  value={editBarcode}
                  onChange={(e) => setEditBarcode(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="secondary"
                  onClick={handleGenerateUniqueBarcodeForEdit}
                  title="توليد باركود عشوائي فريد وغير مكرر"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    whiteSpace: "nowrap",
                    padding: "0 13px",
                    height: "40px",
                    borderRadius: "9px",
                    fontSize: "13px",
                    fontWeight: 700,
                    borderColor: "#c99a59",
                    color: "#785038",
                    background: "#fffaf4",
                    flexShrink: 0,
                  }}
                >
                  <LuBarcode style={{ fontSize: "16px" }} />
                  <span>توليد</span>
                </button>
              </div>
            </div>
            <label>مكان الصنف / الرف بالمحل <small>اختياري</small><input placeholder="مثال: رف 1 / ستاند أ" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} /></label>
            {editVariants.length === 0 ? (
              <label>
                الكمية المتاحة بالمخزن
                <input
                  type="number"
                  min="0"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value)}
                  required
                />
              </label>
            ) : (
              <label>
                الكمية الإجمالية <small style={{ color: "#785038" }}>(مجموع المتغيرات الحالية: {totalEditVariantQty})</small>
                <input
                  type="number"
                  min="0"
                  value={totalEditVariantQty}
                  readOnly
                  required
                />
              </label>
            )}
          </div>

          {editVariants.length === 0 ? (
            <div className="variant-section" style={{ marginTop: "20px" }}>
              <div style={{
                background: "#faf6f0",
                border: "1px dashed #d5c3b2",
                borderRadius: "12px",
                padding: "18px 22px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
              }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: "16px", color: "#5d3a28" }}>🎨 ألوان ومقاسات المنتج (المتغيرات)</h3>
                  <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#785038" }}>
                    هذا المنتج مسجل كـ <strong>منتج فردي (بدون ألوان أو مقاسات)</strong>. يمكنك تعديل كميته المتاحة ومكانه بالمخزن مباشرةً من الحقول أعلاه.
                  </p>
                </div>
                <button
                  type="button"
                  className="preset-btn"
                  style={{
                    padding: "9px 18px",
                    fontSize: "13px",
                    fontWeight: 700,
                    background: "#fff",
                    borderColor: "#785038",
                    color: "#785038",
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    setEditVariants([
                      { variantId: null, color: "أسود", size: "", quantity: editQuantity || "0", location: editLocation }
                    ]);
                  }}
                >
                  + تحويل إلى منتج بمتغيرات (إضافة ألوان / مقاسات)
                </button>
              </div>
            </div>
          ) : (
            <div className="variant-section" style={{ marginTop: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h3 style={{ margin: 0 }}>🎨 ألوان ومقاسات المنتج والكميات المتاحة ({editVariants.length} متغير)</h3>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6e5746" }}>يمكنك تعديل كميات وأماكن الألوان والمقاسات أو إضافة/حذف متغيرات لهذا المنتج مباشرةً.</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="pill" style={{ background: "#785038", color: "#fff" }}>
                    إجمالي كميات المتغيرات: {totalEditVariantQty} قطعة
                  </span>
                  <button
                    type="button"
                    className="link-button"
                    style={{ fontSize: "12px", color: "#b94d3f" }}
                    onClick={() => {
                      if (window.confirm("هل تريد تحويل هذا المنتج إلى منتج فردي بدون ألوان أو مقاسات؟")) {
                        setEditQuantity(String(totalEditVariantQty));
                        setEditVariants([]);
                      }
                    }}
                  >
                    تحويل إلى منتج فردي ✕
                  </button>
                </div>
              </div>

              <div className="variant-card-grid" style={{ maxHeight: "400px" }}>
                {editVariants.map((v, index) => (
                  <div key={index} className="variant-card" style={{ gap: "8px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f2ebe3", paddingBottom: "4px" }}>
                      <strong style={{ fontSize: "12px", color: "#785038" }}>متغير #{index + 1}</strong>
                      <button
                        type="button"
                        style={{ border: 0, background: "none", color: "#b94d3f", fontWeight: "bold", fontSize: "18px", cursor: "pointer", padding: "0 4px" }}
                        title="حذف هذا المتغير"
                        onClick={() => {
                          const next = editVariants.filter((_, i) => i !== index);
                          setEditVariants(next);
                          if (next.length === 0) {
                            setEditQuantity(String(totalEditVariantQty));
                          }
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <label style={{ fontSize: "11px", margin: 0 }}>اللون
                      <input
                        placeholder="مثال: أسود"
                        value={v.color}
                        onChange={(e) => setEditVariants((old) => old.map((item, i) => i === index ? { ...item, color: e.target.value } : item))}
                      />
                    </label>
                    <label style={{ fontSize: "11px", margin: 0 }}>المقاس
                      <input
                        placeholder="مثال: 42"
                        value={v.size}
                        onChange={(e) => setEditVariants((old) => old.map((item, i) => i === index ? { ...item, size: e.target.value } : item))}
                      />
                    </label>
                    <label style={{ fontSize: "11px", margin: 0 }}>المكان في المحل / الرف
                      <input
                        placeholder="مثال: ستاند 1 / رف ب"
                        value={v.location}
                        onChange={(e) => {
                          const newLoc = e.target.value;
                          setEditVariants((old) => old.map((item, i) => {
                            if (i === index) return { ...item, location: newLoc };
                            if (item.color === v.color && !item.location) return { ...item, location: newLoc };
                            return item;
                          }));
                        }}
                      />
                    </label>
                    <label style={{ fontSize: "11px", margin: 0 }}>الكمية المتاحة
                      <input
                        type="number"
                        min="0"
                        value={v.quantity}
                        onChange={(e) => setEditVariants((old) => old.map((item, i) => i === index ? { ...item, quantity: e.target.value } : item))}
                      />
                    </label>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="preset-btn"
                style={{ marginTop: "14px", padding: "8px 16px", fontSize: "13px" }}
                onClick={() => setEditVariants((old) => [...old, { variantId: null, color: "", size: "", quantity: "0", location: "" }])}
              >
                + إضافة متغير جديد (لون / مقاس)
              </button>
            </div>
          )}

          <div className="button-row" style={{ marginTop: "20px" }}>
            <button className="primary" disabled={busy}>حفظ التغييرات</button>
            <button type="button" className="secondary" onClick={() => { setViewMode("list"); onViewModeChange?.("list"); }}>إلغاء</button>
          </div>
        </form>
      </section>
    )}

    {viewMode === "list" && (
      <section className="panel">
        <div className="section-head"><div><h2>المنتجات</h2><p>منتج واحد لكل باركود، مع تفاصيل الألوان والمقاسات ({groupedProducts.length} منتج)</p></div><div style={{ display: "flex", gap: "14px", alignItems: "center", flex: "1", maxWidth: "750px", justifyContent: "flex-end" }}><input className="search large-search" placeholder="⌕  ابحث باسم المنتج أو الباركود..." value={search} onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }} /><button className="primary add-product-btn" onClick={() => { setViewMode("add"); onViewModeChange?.("add"); }}>+ إضافة منتج جديد <kbd className="btn-kbd">F1</kbd></button></div></div>

        {/* CUSTOM BRANDSELECT FILTERS BAR */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px",
          background: "linear-gradient(180deg, #fffbf7 0%, #faf4ee 100%)",
          padding: "16px",
          borderRadius: "14px",
          border: "1px solid #efe1d3",
          marginBottom: "20px",
          alignItems: "end"
        }}>
          {/* Category Filter */}
          <div className="field" style={{ margin: 0 }}>
            <span className="field-label" style={{ fontWeight: "700", color: "#5c3826", fontSize: "12px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
              📁 فلتر بالتصنيف
            </span>
            <BrandSelect
              label="التصنيف"
              value={categoryFilter}
              onValueChange={(val) => { setCategoryFilter(val); setCurrentPage(1); }}
              placeholder="جميع التصنيفات"
              emptyOptionLabel="جميع التصنيفات"
              options={categories.map((c) => ({ value: String(c.id), label: c.name }))}
            />
          </div>

          {/* Supplier Filter */}
          <div className="field" style={{ margin: 0 }}>
            <span className="field-label" style={{ fontWeight: "700", color: "#5c3826", fontSize: "12px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
              🚚 فلتر بالمورد
            </span>
            <BrandSelect
              label="المورد"
              value={supplierFilter}
              onValueChange={(val) => { setSupplierFilter(val); setCurrentPage(1); }}
              placeholder="جميع الموردين"
              emptyOptionLabel="جميع الموردين"
              options={suppliers.map((s) => ({ value: String(s.id), label: s.name }))}
            />
          </div>

          {/* Warehouse Filter */}
          <div className="field" style={{ margin: 0 }}>
            <span className="field-label" style={{ fontWeight: "700", color: "#5c3826", fontSize: "12px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
              🏭 فلتر بالمخزن
            </span>
            <BrandSelect
              label="المخزن"
              value={warehouseFilter}
              onValueChange={(val) => { setWarehouseFilter(val); setCurrentPage(1); }}
              placeholder="جميع المخازن"
              emptyOptionLabel="جميع المخازن"
              options={warehouses.map((w) => ({ value: String(w.id), label: w.name }))}
            />
          </div>

          {/* Stock Status Filter */}
          <div className="field" style={{ margin: 0 }}>
            <span className="field-label" style={{ fontWeight: "700", color: "#5c3826", fontSize: "12px", marginBottom: "6px", display: "flex", alignItems: "center", gap: "4px" }}>
              📦 حالة المخزون
            </span>
            <BrandSelect
              label="حالة المخزون"
              value={stockFilter}
              onValueChange={(val) => { setStockFilter(val as "all" | "out" | "low"); setCurrentPage(1); }}
              placeholder="جميع المنتجات"
              emptyOptionLabel="جميع المنتجات"
              options={[
                { value: "all", label: "جميع المنتجات" },
                { value: "out", label: "🚨 منتجات نفدت (رصيد 0)" },
                { value: "low", label: "⚠️ قربت تنفد (مخزون منخفض)" },
              ]}
            />
          </div>

          {/* Clear Filters Button if any active */}
          {(categoryFilter || supplierFilter || warehouseFilter || stockFilter !== "all") && (
            <div style={{ display: "flex", alignItems: "center", height: "42px" }}>
              <button
                type="button"
                style={{
                  background: "#fdeded",
                  color: "#c62828",
                  border: "1px solid #f5c6c6",
                  padding: "8px 14px",
                  borderRadius: "10px",
                  fontSize: "12px",
                  fontWeight: "700",
                  cursor: "pointer",
                  height: "42px",
                  whiteSpace: "nowrap"
                }}
                onClick={() => {
                  setCategoryFilter("");
                  setSupplierFilter("");
                  setWarehouseFilter("");
                  setStockFilter("all");
                  onResetStockFilter?.();
                  setCurrentPage(1);
                }}
              >
                ✕ تصفير الفلاتر
              </button>
            </div>
          )}
        </div>

        {/* ACTIVE STOCK FILTER BANNER */}
        {stockFilter !== "all" && (
          <div style={{
            background: stockFilter === "out" ? "#fef2f2" : "#fffbeb",
            border: `1.5px solid ${stockFilter === "out" ? "#fca5a5" : "#fcd34d"}`,
            borderRadius: "10px",
            padding: "10px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}>
            <span style={{ fontWeight: 800, fontSize: "13px", color: stockFilter === "out" ? "#991b1b" : "#92400e" }}>
              {stockFilter === "out"
                ? "🚨 تصفية مفعلة: يتم الآن عرض المنتجات التي نفد مخزونها تماماً (الرصيد الكلي = 0)"
                : "⚠️ تصفية مفعلة: يتم الآن عرض المنتجات التي قاربت على النفاد (الرصيد الكلي أقل من أو يساوي حد الطلب)"}
            </span>
            <button
              type="button"
              className="secondary"
              style={{ padding: "4px 12px", fontSize: "12px", background: "#fff", border: "1px solid #d1d5db" }}
              onClick={() => {
                setStockFilter("all");
                onResetStockFilter?.();
                setCurrentPage(1);
              }}
            >
              عرض كل المنتجات ✕
            </button>
          </div>
        )}
        <div className="table-wrap">
          <table className="product-table">
            <thead><tr><th>المنتج</th><th>التصنيف</th><th>الألوان</th><th>المقاسات</th><th>المخزن</th><th>باركود المنتج</th><th>الكمية الإجمالية</th><th>سعر البيع</th>{isAdmin && <th>الإجراءات</th>}</tr></thead>
            <tbody>{paginatedProducts.map((group) => <Fragment key={group.productId}>
              <tr>
                <td style={{ minWidth: "180px", maxWidth: "260px" }}>
                  <button type="button" className="product-name-button" onClick={() => setExpandedProductId(expandedProductId === group.productId ? null : group.productId)}>
                    <strong>{group.name}</strong>
                    <small>{expandedProductId === group.productId ? "إخفاء التفاصيل ↑" : "تفاصيل المتغيرات ↓"}</small>
                  </button>
                  {/* Variant stock alert indicators on the table row */}
                  {(() => {
                    const outVariants = group.rows.filter((r) => r.quantity <= 0);
                    const lowVariants = group.rows.filter((r) => r.quantity > 0 && r.quantity <= group.lowStockThreshold);
                    if (outVariants.length === 0 && lowVariants.length === 0) return null;

                    return (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                        {outVariants.length > 0 && (
                          <button
                            type="button"
                            title={`المنتهية: ${outVariants.map((r) => [r.color, r.size ? `مقاس ${r.size}` : ""].filter(Boolean).join(" ") || "افتراضي").join("، ")}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              fontSize: "11px",
                              fontWeight: 700,
                              background: "#fee2e2",
                              color: "#dc2626",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              border: "1px solid #fca5a5",
                              cursor: "pointer",
                              lineHeight: "1.3",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedProductId(expandedProductId === group.productId ? null : group.productId);
                            }}
                          >
                            🚨 {outVariants.length === 1
                              ? `نفد: ${[outVariants[0].color, outVariants[0].size ? `مقاس ${outVariants[0].size}` : ""].filter(Boolean).join(" ") || "افتراضي"}`
                              : `${outVariants.length} نفدت`}
                          </button>
                        )}
                        {lowVariants.length > 0 && (
                          <button
                            type="button"
                            title={`المقاسات التي قاربت على النفاد:\n${lowVariants.map((r) => `${[r.color, r.size ? `مقاس ${r.size}` : ""].filter(Boolean).join(" ") || "افتراضي"} (${r.quantity} ق)`).join("، ")}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              fontSize: "11px",
                              fontWeight: 700,
                              background: "#fef3c7",
                              color: "#b45309",
                              padding: "2px 8px",
                              borderRadius: "12px",
                              border: "1px solid #fcd34d",
                              cursor: "pointer",
                              lineHeight: "1.3",
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedProductId(expandedProductId === group.productId ? null : group.productId);
                            }}
                          >
                            ⚠️ {lowVariants.length === 1
                              ? `قرب يخلص: ${[lowVariants[0].color, lowVariants[0].size ? `مقاس ${lowVariants[0].size}` : ""].filter(Boolean).join(" ") || "افتراضي"} (${lowVariants[0].quantity} ق)`
                              : `${lowVariants.length} قربت تخلص`}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td>{group.category}</td>
                <td><div className="product-value-list">{group.colors.length ? group.colors.map((color) => <span className="product-value-chip" key={color}>{color}</span>) : "—"}</div></td>
                <td><div className="product-value-list">{group.sizes.length ? group.sizes.map((size) => <span className="product-value-chip" key={size}>{size}</span>) : "—"}</div></td>
                <td>{group.warehouses.join("، ")}</td>
                <td><code>{group.barcode}</code></td>
                <td><span className={group.totalQuantity <= group.lowStockThreshold ? "low" : "good"}>{group.totalQuantity}</span></td>
                <td>{money(group.sellPricePiasters)}</td>
                {isAdmin && <td><div className="action-cell"><button className="edit-button" onClick={() => startEdit(group)}>تعديل</button><button className="danger-button" onClick={() => handleDelete(group.rows[0])}>حذف</button></div></td>}
              </tr>
              {expandedProductId === group.productId && <tr className="product-details-row"><td colSpan={isAdmin ? 9 : 8}>
                <div className="product-details-title">تفاصيل المخزون حسب اللون والمقاس</div>
                <div className="product-variant-grid">{group.rows.map((variant) => {
                  const isOut = variant.quantity <= 0;
                  const isLow = variant.quantity > 0 && variant.quantity <= group.lowStockThreshold;

                  return (
                    <div
                      className="product-variant-card"
                      key={variant.productId + "-" + variant.variantId + "-" + variant.warehouseId}
                      style={{
                        background: isOut ? "#fff5f5" : isLow ? "#fffbeb" : undefined,
                        border: isOut ? "1.5px solid #fca5a5" : isLow ? "1.5px solid #fcd34d" : undefined,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <strong>{variant.color || "بدون لون"} / {variant.size || "بدون مقاس"}</strong>
                        {isOut && <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: "10px", fontWeight: 800, padding: "2px 6px", borderRadius: "4px" }}>🚨 نفد (0)</span>}
                        {isLow && <span style={{ background: "#fef3c7", color: "#d97706", fontSize: "10px", fontWeight: 800, padding: "2px 6px", borderRadius: "4px" }}>⚠️ حرج ({variant.quantity})</span>}
                      </div>
                      {variant.location && <span style={{ fontSize: "11px", color: "#1d4ed8", fontWeight: 700, display: "block", marginTop: "2px" }}>📍 {variant.location}</span>}
                      <small>{variant.warehouse}</small>
                      <span style={{ color: isOut ? "#dc2626" : isLow ? "#d97706" : undefined, fontWeight: isOut || isLow ? 800 : undefined }}>
                        الكمية: <b>{variant.quantity} قطعة</b>
                      </span>
                    </div>
                  );
                })}</div>
              </td></tr>}
            </Fragment>)}</tbody>
          </table>
          {!filtered.length && <Empty text="لا توجد منتجات مطابقة." />}
        </div>
        {filtered.length > pageSize && (
          <div className="pagination"><span>عرض {startIndex + 1}–{Math.min(startIndex + pageSize, filtered.length)} من {filtered.length} منتج</span><div className="pagination-buttons"><button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>السابق</button>{Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => <button key={n} className={n === currentPage ? "active" : ""} onClick={() => setCurrentPage(n)}>{n}</button>)}<button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>التالي</button></div></div>
        )}
      </section>
    )}
      {quickAddModal && (
        <div
          className="thermal-receipt-overlay"
          style={{ zIndex: 10001 }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !quickAddBusy) setQuickAddModal(null);
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "14px",
              padding: "24px",
              maxWidth: "420px",
              width: "90%",
              boxShadow: "0 14px 40px rgba(36,28,24,0.25)",
              border: "1px solid #e9e1d9",
              direction: "rtl",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "17px", color: "#34231c" }}>{quickAddModal.title}</h3>
              <button
                type="button"
                onClick={() => !quickAddBusy && setQuickAddModal(null)}
                style={{ border: 0, background: "none", fontSize: "20px", cursor: "pointer", color: "#9b897b" }}
              >
                ×
              </button>
            </div>
            <form onSubmit={handleQuickAddModalSubmit}>
              <label style={{ display: "grid", gap: "6px", marginBottom: "18px", fontWeight: 700, fontSize: "13px" }}>
                {quickAddModal.label}
                <input
                  ref={quickAddInputRef}
                  placeholder={quickAddModal.placeholder}
                  value={quickAddName}
                  onChange={(e) => setQuickAddName(e.target.value)}
                  required
                  disabled={quickAddBusy}
                />
              </label>
              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setQuickAddModal(null)}
                  disabled={quickAddBusy}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="primary"
                  disabled={quickAddBusy || !quickAddName.trim()}
                >
                  {quickAddBusy ? "جارٍ الإضافة..." : "إضافة وتحديد"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>;
}

function attendanceDelay(day: Attendance): string {
  if (!day.checkedInAt || day.lateMinutes <= 0) return "في الموعد";
  const scheduled = new Date(`${day.shiftDate}T${day.shiftStart}:00`);
  const actual = new Date(day.checkedInAt);
  const elapsed = Math.floor((actual.getTime() - scheduled.getTime()) / 1000);
  if (!Number.isFinite(elapsed) || elapsed <= 0) return `${day.lateMinutes} دقيقة`;
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  const parts = [hours && `${hours} ساعة`, minutes && `${minutes} دقيقة`, seconds && `${seconds} ثانية`].filter(Boolean);
  return parts.join(" و") || "أقل من ثانية";
}

function AttendanceWidget({ session }: { session: Session }) {
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    invoke<Attendance>("get_my_attendance", { token: session.token })
      .then((value) => { if (active) setAttendance(value); })
      .catch(() => { if (active) setAttendance(null); });
    return () => { active = false; };
  }, [session.token]);

  if (!attendance) return null;

  async function markAttendance(command: "check_in" | "check_out") {
    setBusy(true); setError("");
    try { setAttendance(await invoke<Attendance>(command, { token: session.token })); }
    catch (cause) { setError(String(cause)); }
    finally { setBusy(false); }
  }

  return <section className="panel attendance-widget">
    <div><strong>الوردية والحضور</strong><p>{attendance ? `${attendance.shiftDate} · ${formatShiftRange(attendance.shiftStart, attendance.shiftEnd)}` : "جارٍ تحميل الوردية…"}</p>
      {attendance?.checkedInAt && <small>تم الحضور: {formatDateTime(attendance.checkedInAt)}{attendance.lateMinutes > 0 ? ` · تأخير ${attendanceDelay(attendance)}` : " · في الموعد"}</small>}
      {attendance?.checkedOutAt && <small>تم الانصراف: {formatDateTime(attendance.checkedOutAt)}</small>}
    </div>
    {attendance && !attendance.checkedInAt && <button type="button" className="primary" disabled={busy} onClick={() => void markAttendance("check_in")}>{busy ? "جارٍ التسجيل…" : "إثبات الحضور"}</button>}
    {attendance?.checkedInAt && !attendance.checkedOutAt && <button type="button" className="secondary" disabled={busy} onClick={() => void markAttendance("check_out")}>{busy ? "جارٍ التسجيل…" : "إثبات الانصراف"}</button>}
    {attendance?.checkedOutAt && <span className="customer-clear">اكتملت الوردية</span>}
    {error && <p className="attendance-error" role="alert">{error}</p>}
  </section>;
}

interface AvailablePageItem {
  id: Page;
  label: string;
  group: string;
  icon: string;
  badge?: string;
  highlight?: boolean;
}

const AVAILABLE_PAGES: AvailablePageItem[] = [
  { id: "pos", label: "نقطة البيع (الكاشير)", group: "حركة البيع اليومية", icon: "🛒" },
  { id: "invoices", label: "سجل الفواتير", group: "حركة البيع اليومية", icon: "🧾" },
  { id: "online_orders", label: "طلبات الأونلاين", group: "حركة البيع اليومية", icon: "🌐", badge: "مبيعات وشحن", highlight: true },
  { id: "returns", label: "المرتجعات", group: "حركة البيع اليومية", icon: "🔄" },
  { id: "products", label: "المنتجات والمخزون", group: "المخزون والمنتجات", icon: "📦" },
  { id: "barcode_print", label: "طباعة الباركود", group: "المخزون والمنتجات", icon: "🏷️" },
  { id: "inventory_audit", label: "جرد المخزون", group: "المخزون والمنتجات", icon: "📋" },
  { id: "categories", label: "التصنيفات", group: "المخزون والمنتجات", icon: "📑" },
  { id: "warehouses", label: "المخازن", group: "المخزون والمنتجات", icon: "🏢" },
  { id: "suppliers", label: "الموردون وحساباتهم", group: "المخزون والمنتجات", icon: "🚚" },
  { id: "customers", label: "العملاء وحساباتهم", group: "فريق العمل والعملاء", icon: "👥" },
  { id: "attendance", label: "سجل إثبات الحضور والانصراف", group: "فريق العمل والعملاء", icon: "⏱️" },
  { id: "employees", label: "إدارة الموظفين والرواتب", group: "فريق العمل والعملاء", icon: "👤" },
  { id: "sales_report", label: "تقرير المبيعات الشامل", group: "التقارير والإحصائيات", icon: "📈" },
  { id: "sales_returns_report", label: "تقرير المرتجعات", group: "التقارير والإحصائيات", icon: "📊" },
  { id: "product_movement_report", label: "تقرير حركة المنتجات", group: "التقارير والإحصائيات", icon: "📉" },
  { id: "home", label: "الرئيسية ولوحة المعلومات", group: "لوحة التحكم", icon: "🏠" },
];

const PERMISSION_GROUPS = [
  { name: "حركة البيع اليومية", icon: "💰" },
  { name: "المخزون والمنتجات", icon: "📦" },
  { name: "فريق العمل والعملاء", icon: "👥" },
  { name: "التقارير والإحصائيات", icon: "📊" },
  { name: "لوحة التحكم", icon: "⚙️" },
];

function PermissionsSelector({
  permissions,
  onToggle,
  onSet,
  onToggleMainSeller,
}: {
  permissions: Page[];
  onToggle: (pageId: Page) => void;
  onSet: (pages: Page[]) => void;
  onToggleMainSeller: (enabled: boolean) => void;
}) {
  return (
    <div style={{ borderTop: "1px solid #ebd8c8", paddingTop: "14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
        <span style={{ fontWeight: 700, fontSize: "14px", color: "#5c3826" }}>
          📋 الصفحات والصلاحيات المتاحة لهذا الحساب ({permissions.length} محددة من أصل {AVAILABLE_PAGES.length}):
        </span>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="secondary"
            style={{ fontSize: "12px", padding: "4px 8px", color: "#9a3412", borderColor: "#fed7aa", background: "#fff7ed", fontWeight: 700 }}
            onClick={() => onToggleMainSeller(true)}
            title="تعيين صلاحيات البائع الرئيسي مع كاشير الحضور"
          >
            ⭐ حساب البائع الرئيسي (POS + الفواتير + الحضور)
          </button>
          <button
            type="button"
            className="secondary"
            style={{ fontSize: "12px", padding: "4px 8px", color: "#1d4ed8", borderColor: "#bfdbfe", background: "#eff6ff", fontWeight: 700 }}
            onClick={() => onSet(["pos", "invoices", "online_orders"])}
            title="نقطة البيع + الفواتير + طلبات الأونلاين"
          >
            🌐 بائع + طلبات أونلاين
          </button>
          <button
            type="button"
            className="secondary"
            style={{ fontSize: "12px", padding: "4px 8px", color: "#047857", borderColor: "#a7f3d0", background: "#ecfdf5", fontWeight: 700 }}
            onClick={() => onSet(["online_orders", "invoices"])}
            title="مسؤول طلبات الأونلاين والفواتير"
          >
            📦 مسؤول أونلاين فقط
          </button>
          <button
            type="button"
            className="secondary"
            style={{ fontSize: "12px", padding: "4px 8px" }}
            onClick={() => onSet(["pos", "invoices"])}
          >
            الافتراضي للبائع (نقطة البيع والفواتير)
          </button>
          <button
            type="button"
            className="secondary"
            style={{ fontSize: "12px", padding: "4px 8px" }}
            onClick={() => onSet(AVAILABLE_PAGES.map((p) => p.id))}
          >
            تحديد الكل
          </button>
          <button
            type="button"
            className="secondary"
            style={{ fontSize: "12px", padding: "4px 8px", color: "#dc2626" }}
            onClick={() => onSet([])}
          >
            إلغاء التحديد
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {PERMISSION_GROUPS.map((group) => {
          const groupPages = AVAILABLE_PAGES.filter((p) => p.group === group.name);
          if (groupPages.length === 0) return null;
          const selectedInGroup = groupPages.filter((p) => permissions.includes(p.id)).length;
          const allInGroupSelected = selectedInGroup === groupPages.length;

          const toggleGroup = () => {
            if (allInGroupSelected) {
              const toRemove = new Set(groupPages.map((p) => p.id));
              onSet(permissions.filter((p) => !toRemove.has(p)));
            } else {
              const combined = new Set([...permissions, ...groupPages.map((p) => p.id)]);
              onSet(Array.from(combined));
            }
          };

          return (
            <div
              key={group.name}
              style={{
                background: "#fcfbfa",
                border: "1px solid #ebd8c8",
                borderRadius: "10px",
                padding: "10px 12px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px dashed #e8ded4", paddingBottom: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 700, fontSize: "13px", color: "#451a03" }}>
                  <span>{group.icon}</span>
                  <span>{group.name}</span>
                  <span style={{ fontSize: "11px", fontWeight: 700, color: "#8c6b54", background: "#f2ece4", padding: "1px 7px", borderRadius: "10px" }}>
                    {selectedInGroup} / {groupPages.length}
                  </span>
                </div>
                <button
                  type="button"
                  className="secondary"
                  style={{ fontSize: "11px", padding: "2px 8px" }}
                  onClick={toggleGroup}
                >
                  {allInGroupSelected ? "إلغاء تحديد القسم" : "تحديد القسم بالكامل"}
                </button>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                gap: "8px",
              }}>
                {groupPages.map((page) => {
                  const isChecked = permissions.includes(page.id);
                  const isOnline = page.id === "online_orders";

                  return (
                    <label
                      key={page.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        cursor: "pointer",
                        padding: "7px 10px",
                        borderRadius: "8px",
                        background: isChecked
                          ? (isOnline ? "#eff6ff" : "#fcf6f0")
                          : (isOnline ? "#f8fafc" : "#ffffff"),
                        border: isChecked
                          ? (isOnline ? "1.5px solid #2563eb" : "1.5px solid #c99a59")
                          : (isOnline ? "1.5px dashed #93c5fd" : "1px solid #ebd8c8"),
                        boxShadow: isChecked && isOnline ? "0 0 0 2px rgba(37, 99, 235, 0.2)" : "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggle(page.id)}
                        style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: isOnline ? "#2563eb" : undefined }}
                      />
                      <span style={{ fontSize: "16px" }}>{page.icon}</span>
                      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "13px", fontWeight: isChecked ? 700 : 500, color: isOnline && isChecked ? "#1d4ed8" : "#34231c" }}>
                            {page.label}
                          </span>
                          {isOnline && (
                            <span style={{ fontSize: "10px", background: isChecked ? "#2563eb" : "#e0e7ff", color: isChecked ? "#fff" : "#3730a3", padding: "1px 5px", borderRadius: "4px", fontWeight: 700 }}>
                              🌐 أساسي
                            </span>
                          )}
                        </div>
                        {page.badge && (
                          <span style={{ fontSize: "10px", color: isChecked ? "#2563eb" : "#64748b", fontWeight: 600 }}>
                            {page.badge}
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Employees({ employees, session, busy, save, reload, targetEmployeeId, onClearTargetEmployeeId }: { employees: Employee[]; session: Session; busy: boolean; save: (value: unknown) => Promise<void> | void; reload?: () => Promise<void> | void; targetEmployeeId?: number | null; onClearTargetEmployeeId?: () => void }) {
  const [subView, setSubView] = useState<"list" | "add" | "edit" | "stats" | "account" | "telegram">("list");
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  // Form State for Add / Edit Employee
  const [name, setName] = useState("");
  const [createAccount, setCreateAccount] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState<Page[]>(["pos", "invoices"]);
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("بائع");
  const [address, setAddress] = useState("");
  const [workHours, setWorkHours] = useState("8");
  const [hireDate, setHireDate] = useState(new Date().toISOString().slice(0, 10));
  const [salary, setSalary] = useState("");
  const [shiftStart, setShiftStart] = useState("09:00");
  const [shiftEnd, setShiftEnd] = useState("17:00");
  const [isMainSellerAccount, setIsMainSellerAccount] = useState(false);

  function handleToggleMainSellerAccount(checked: boolean) {
    setIsMainSellerAccount(checked);
    if (checked) {
      setCreateAccount(true);
      if (!username.trim()) {
        setUsername("cashier");
      }
      if (!name.trim()) {
        setName("كاشير المحل الرئيسي");
      }
      setPermissions((prev) => {
        const set = new Set(prev);
        set.add("pos");
        set.add("invoices");
        set.add("attendance");
        set.add("main_cashier" as Page);
        return Array.from(set);
      });
    } else {
      setPermissions((prev) => prev.filter((p) => p !== ("main_cashier" as Page)));
    }
  }

  function togglePermission(pageId: Page) {
    setPermissions((prev) =>
      prev.includes(pageId) ? prev.filter((p) => p !== pageId) : [...prev, pageId]
    );
  }

  // Selected Employee & Account State
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);

  useEffect(() => {
    if (targetEmployeeId) {
      const emp = employees.find((e) => e.id === targetEmployeeId);
      if (emp) {
        setSelectedEmp(emp);
        setSubView("account");
      }
      onClearTargetEmployeeId?.();
    }
  }, [targetEmployeeId, employees, onClearTargetEmployeeId]);
  const [month, setMonth] = useState(() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`; });
  const [account, setAccount] = useState<EmployeeAccount | null>(null);
  const [rewardAmount, setRewardAmount] = useState("");
  const [rewardReason, setRewardReason] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanReason, setLoanReason] = useState("");
  const [deductionAmount, setDeductionAmount] = useState("");
  const [deductionReason, setDeductionReason] = useState("");
  const [accountWorking, setAccountWorking] = useState(false);
  const [accountError, setAccountError] = useState("");
  const [accountNotice, setAccountNotice] = useState("");

  // Telegram Settings State
  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings | null>(null);
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [graceMinutes, setGraceMinutes] = useState("0");
  const [autoReportEnabled, setAutoReportEnabled] = useState(false);
  const [autoReportTime, setAutoReportTime] = useState("23:00");
  const [telegramWorking, setTelegramWorking] = useState(false);
  const [telegramError, setTelegramError] = useState("");
  const [telegramNotice, setTelegramNotice] = useState("");

  // Employee Stats State
  type StatsPreset = "ALL" | "TODAY" | "WEEK" | "MONTH" | "CUSTOM";
  const [employeeStats, setEmployeeStats] = useState<EmployeeStatsView | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState("");
  const [statsPreset, setStatsPreset] = useState<StatsPreset>("ALL");
  const [statsStartDate, setStatsStartDate] = useState("");
  const [statsEndDate, setStatsEndDate] = useState("");

  // Invoice Details Modal State
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState<number | null>(null);
  const [thermalReceiptDetail, setThermalReceiptDetail] = useState<InvoiceDetailView | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetailView | null>(null);
  const [loadingInvoiceDetail, setLoadingInvoiceDetail] = useState(false);
  const [invoiceDetailError, setInvoiceDetailError] = useState("");

  async function loadTelegramSettings() {
    try {
      const data = await invoke<TelegramSettings>("get_telegram_settings", { token: session.token });
      setTelegramSettings(data);
      setChatId(data.chatId);
      setGraceMinutes(String(data.graceMinutes));
      setAutoReportEnabled(Boolean(data.autoReportEnabled));
      setAutoReportTime(data.autoReportTime || "23:00");
    } catch (cause) {
      setTelegramError(String(cause));
    }
  }

  useEffect(() => {
    if (subView === "telegram") {
      void loadTelegramSettings();
    }
  }, [subView, session.token]);

  async function fetchAccount(empId: number, periodMonth: string) {
    if (!empId) { setAccount(null); return; }
    try {
      const data = await invoke<EmployeeAccount>("get_employee_account", { token: session.token, employeeId: empId, periodMonth });
      setAccount(data);
    } catch (cause) {
      setAccountError(String(cause));
    }
  }

  useEffect(() => {
    let active = true;
    if (subView === "account" && selectedEmp) {
      invoke<EmployeeAccount>("get_employee_account", { token: session.token, employeeId: selectedEmp.id, periodMonth: month })
        .then((data) => { if (active) setAccount(data); })
        .catch((cause) => { if (active) setAccountError(String(cause)); });
    }
    return () => { active = false; };
  }, [subView, selectedEmp, month, session.token]);

  async function openAccountView(emp: Employee) {
    setSelectedEmp(emp);
    setAccountError("");
    setAccountNotice("");
    setSubView("account");
    await fetchAccount(emp.id, month);
  }

  function getStatsPresetDates(preset: StatsPreset): { start: string; end: string } {
    const now = new Date();
    const today = now.toLocaleDateString("en-CA");
    if (preset === "TODAY") {
      return { start: today, end: today };
    }
    if (preset === "WEEK") {
      const day = now.getDay();
      const diff = (day + 1) % 7;
      const sat = new Date(now);
      sat.setDate(now.getDate() - diff);
      return { start: sat.toLocaleDateString("en-CA"), end: today };
    }
    if (preset === "MONTH") {
      const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      return { start, end: today };
    }
    return { start: "", end: "" };
  }

  async function fetchEmployeeStats(empId: number, start?: string, end?: string) {
    setLoadingStats(true);
    setStatsError("");
    try {
      const data = await invoke<EmployeeStatsView>("get_employee_stats", {
        token: session.token,
        employeeId: empId,
        startDate: start || null,
        endDate: end || null,
      });
      setEmployeeStats(data);
    } catch (err: unknown) {
      setStatsError(String(err));
    } finally {
      setLoadingStats(false);
    }
  }

  function handleApplyStatsPreset(preset: StatsPreset, empId?: number) {
    const targetId = empId ?? selectedEmp?.id;
    if (!targetId) return;
    setStatsPreset(preset);
    if (preset === "ALL") {
      setStatsStartDate("");
      setStatsEndDate("");
      void fetchEmployeeStats(targetId);
    } else if (preset === "CUSTOM") {
      const s = statsStartDate || new Date().toLocaleDateString("en-CA");
      const e = statsEndDate || new Date().toLocaleDateString("en-CA");
      setStatsStartDate(s);
      setStatsEndDate(e);
      void fetchEmployeeStats(targetId, s, e);
    } else {
      const { start, end } = getStatsPresetDates(preset);
      setStatsStartDate(start);
      setStatsEndDate(end);
      void fetchEmployeeStats(targetId, start, end);
    }
  }

  function handleCustomStatsDateChange(newStart: string, newEnd: string) {
    setStatsStartDate(newStart);
    setStatsEndDate(newEnd);
    if (selectedEmp) {
      void fetchEmployeeStats(selectedEmp.id, newStart, newEnd);
    }
  }

  async function openStatsView(emp: Employee) {
    setSelectedEmp(emp);
    setSubView("stats");
    setStatsPreset("ALL");
    setStatsStartDate("");
    setStatsEndDate("");
    setEmployeeStats(null);
    await fetchEmployeeStats(emp.id);
  }

  function openAddView() {
    setEditingEmp(null);
    setName("");
    setCreateAccount(false);
    setIsMainSellerAccount(false);
    setUsername("");
    setPassword("");
    setPermissions(["pos", "invoices"]);
    setPhone("");
    setJobTitle("بائع");
    setAddress("");
    setWorkHours("8");
    setHireDate(new Date().toISOString().slice(0, 10));
    setSalary("");
    setShiftStart("09:00");
    setShiftEnd("17:00");
    setSubView("add");
  }

  function openEditView(emp: Employee) {
    setEditingEmp(emp);
    setName(emp.name);
    const hasAccount = Boolean(emp.userId || emp.username);
    setCreateAccount(hasAccount);
    const isMain = Boolean(emp.permissions?.includes("main_cashier" as Page) || (emp.permissions?.includes("attendance") && emp.permissions?.includes("pos")));
    setIsMainSellerAccount(isMain);
    setUsername(emp.username || "");
    setPassword("");
    setPermissions(emp.permissions && emp.permissions.length > 0 ? (emp.permissions as Page[]) : ["pos", "invoices"]);
    setPhone(emp.phone || "");
    setJobTitle(emp.jobTitle);
    setAddress(emp.address || "");
    setWorkHours(String(emp.workHours));
    setHireDate(emp.hireDate);
    setSalary((emp.baseSalaryPiasters / 100).toFixed(2));
    setShiftStart(emp.shiftStart);
    setShiftEnd(emp.shiftEnd);
    setSubView("edit");
  }

  async function openInvoiceDetails(num: number) {
    setSelectedInvoiceNumber(num);
    setLoadingInvoiceDetail(true);
    setInvoiceDetailError("");
    setInvoiceDetail(null);
    try {
      const data = await invoke<InvoiceDetailView>("get_invoice_details", {
        token: session.token,
        invoiceNumber: num,
      });
      setInvoiceDetail(data);
    } catch (err: unknown) {
      setInvoiceDetailError(String(err));
    } finally {
      setLoadingInvoiceDetail(false);
    }
  }

  async function runAccountAction(action: () => Promise<void>, successMsg: string) {
    if (accountWorking) return;
    setAccountWorking(true); setAccountError(""); setAccountNotice("");
    try {
      await action();
      setAccountNotice(successMsg);
    } catch (cause) {
      setAccountError(String(cause));
    } finally {
      setAccountWorking(false);
    }
  }

  async function runTelegramAction(action: () => Promise<void>, successMsg: string) {
    if (telegramWorking) return;
    setTelegramWorking(true); setTelegramError(""); setTelegramNotice("");
    try {
      await action();
      setTelegramNotice(successMsg);
    } catch (cause) {
      setTelegramError(String(cause));
    } finally {
      setTelegramWorking(false);
    }
  }

  async function submitNewEmployee(e: FormEvent) {
    e.preventDefault();
    if (createAccount) {
      if (!username.trim()) {
        alert("يرجى إدخال اسم المستخدم لحساب الدخول");
        return;
      }
      if (password.trim().length < 10) {
        alert("كلمة المرور يجب أن تكون 10 أحرف على الأقل");
        return;
      }
      if (permissions.length === 0) {
        alert("يرجى اختيار صفحة واحدة على الأقل لصلاحيات الحساب");
        return;
      }
    }
    let finalPerms: Page[] | null = null;
    if (createAccount) {
      const set = new Set(permissions);
      if (isMainSellerAccount) {
        set.add("pos");
        set.add("invoices");
        set.add("attendance");
        set.add("main_cashier" as Page);
      }
      finalPerms = Array.from(set);
    }
    await save({
      name: name.trim(),
      username: createAccount ? username.trim() : null,
      password: createAccount ? password.trim() : null,
      permissions: finalPerms,
      phone: phone.trim() || null,
      jobTitle: jobTitle.trim() || "بائع",
      address: address.trim() || null,
      workHours: Number(workHours) || 8,
      hireDate: hireDate || new Date().toISOString().slice(0, 10),
      baseSalaryPiasters: salary ? piastres(salary) : 0,
      shiftStart: shiftStart || "09:00",
      shiftEnd: shiftEnd || "17:00"
    });
    setName(""); setCreateAccount(false); setIsMainSellerAccount(false); setUsername(""); setPassword(""); setPhone(""); setJobTitle("بائع");
    setAddress(""); setWorkHours("8"); setHireDate(new Date().toISOString().slice(0, 10));
    setSalary(""); setShiftStart("09:00"); setShiftEnd("17:00");
    setSubView("list");
  }

  async function submitEditEmployee(e: FormEvent) {
    e.preventDefault();
    if (!editingEmp) return;
    const hasAccountBefore = Boolean(editingEmp.userId || editingEmp.username);
    if (createAccount) {
      if (!username.trim()) {
        alert("يرجى إدخال اسم المستخدم لحساب الدخول");
        return;
      }
      if (!hasAccountBefore && password.trim().length < 10) {
        alert("كلمة المرور يجب أن تكون 10 أحرف على الأقل لإنشاء الحساب الجديد");
        return;
      }
      if (password.trim() && password.trim().length < 10) {
        alert("كلمة المرور يجب أن تكون 10 أحرف على الأقل");
        return;
      }
      if (permissions.length === 0) {
        alert("يرجى اختيار صفحة واحدة على الأقل لصلاحيات الحساب");
        return;
      }
    }
    let finalPerms: Page[] | null = null;
    if (createAccount) {
      const set = new Set(permissions);
      if (isMainSellerAccount) {
        set.add("pos");
        set.add("invoices");
        set.add("attendance");
        set.add("main_cashier" as Page);
      }
      finalPerms = Array.from(set);
    }
    try {
      await invoke("update_employee", {
        token: session.token,
        input: {
          employeeId: editingEmp.id,
          name: name.trim(),
          username: createAccount ? username.trim() : null,
          password: createAccount && password.trim() ? password.trim() : null,
          permissions: finalPerms,
          removeAccount: hasAccountBefore && !createAccount,
          phone: phone.trim() || null,
          jobTitle: jobTitle.trim() || "بائع",
          address: address.trim() || null,
          workHours: Number(workHours) || 8,
          hireDate: hireDate || new Date().toISOString().slice(0, 10),
          baseSalaryPiasters: salary ? piastres(salary) : 0,
          shiftStart: shiftStart || "09:00",
          shiftEnd: shiftEnd || "17:00",
        }
      });
      if (reload) await reload();
      setSubView("list");
    } catch (cause) {
      alert(String(cause));
    }
  }

  async function handleDeleteEmployee(emp: Employee) {
    if (!window.confirm(`هل أنت تأكد من حذف الموظف "${emp.name}"؟`)) return;
    try {
      await invoke("delete_employee", { token: session.token, employeeId: emp.id });
      if (reload) await reload();
    } catch (cause) {
      alert(String(cause));
    }
  }

  function renderBreadcrumb() {
    return (
      <div className="breadcrumb" style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px", fontSize: "15px", fontWeight: 700 }}>
        {subView === "list" ? (
          <span style={{ color: "#34231c" }}>👥 إدارة الموظفين</span>
        ) : (
          <>
            <button
              type="button"
              className="link-button"
              style={{ fontSize: "15px", fontWeight: 700, color: "#785038", cursor: "pointer" }}
              onClick={() => setSubView("list")}
            >
              👥 الموظفون
            </button>
            <span style={{ color: "#8b7b70" }}>/</span>
            <span style={{ color: "#34231c" }}>
              {subView === "add" && "➕ إضافة موظف جديد"}
              {subView === "edit" && `✏️ تعديل بيانات الموظف — ${editingEmp?.name || ""}`}
              {subView === "telegram" && "📲 إعدادات التليجرام والتنبيهات"}
              {subView === "account" && `💳 حساب السلف والمكافآت والخصومات — ${selectedEmp?.name || ""}`}
              {subView === "stats" && `📊 إحصائيات وأداء الموظف — ${selectedEmp?.name || ""}`}
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="stack">
      {renderBreadcrumb()}

      {subView === "list" && (
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>الموظفون</h2>
              <p>الحسابات النشطة المسجلة في النظام وإدارة سلف وحسابات وأداء كل موظف</p>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span className="pill">{employees.length} موظف</span>
              <button className="secondary" onClick={() => setSubView("telegram")}>
                📲 إعدادات التليجرام
              </button>
              <button className="primary" onClick={openAddView}>
                + إضافة موظف جديد
              </button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>الاسم</th>
                  <th>اسم المستخدم</th>
                  <th>الوظيفة</th>
                  <th>الهاتف</th>
                  <th>ساعات العمل</th>
                  <th>الشفت (الحضور والانصراف)</th>
                  <th>الراتب الأساسي</th>
                  <th style={{ textAlign: "center" }}>الإجراءات وحساب الموظف</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <strong>{employee.name}</strong>
                      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginTop: "4px" }}>
                        {(employee.permissions?.includes("main_cashier" as Page) || (employee.permissions?.includes("attendance") && employee.permissions?.includes("pos"))) && (
                          <span className="pill" style={{ background: "#fffbeb", color: "#92400e", border: "1px solid #fde68a", fontSize: "11px", fontWeight: 700 }}>
                            ⭐ حساب البائع الرئيسي المشترك
                          </span>
                        )}
                        {employee.permissions?.includes("online_orders") && (
                          <span className="pill" style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", fontSize: "11px", fontWeight: 700 }}>
                            🌐 طلبات الأونلاين
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {employee.username ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <code>{employee.username}</code>
                            {(employee.permissions?.includes("main_cashier" as Page) || (employee.permissions?.includes("attendance") && employee.permissions?.includes("pos"))) && (
                              <span style={{ fontSize: "11px", color: "#b45309", fontWeight: 700 }}>⭐ كاشير عام</span>
                            )}
                          </div>
                          <small style={{ color: "#785038", fontSize: "11px" }}>
                            {employee.permissions && employee.permissions.length > 0
                              ? `${employee.permissions.filter((p) => p !== ("main_cashier" as Page)).length} صفحات مسموحة`
                              : "كل الصلاحيات"}
                          </small>
                        </div>
                      ) : (
                        <span className="pill neutral" style={{ background: "#f0ebe4", color: "#786558", fontSize: "12px", padding: "3px 8px" }}>
                          بدون حساب دخول
                        </span>
                      )}
                    </td>
                    <td>{employee.jobTitle}</td>
                    <td>{employee.phone || "—"}</td>
                    <td>{employee.workHours} س</td>
                    <td>{formatShiftRange(employee.shiftStart, employee.shiftEnd)}</td>
                    <td>{money(employee.baseSalaryPiasters)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="secondary"
                          style={{ fontWeight: 700 }}
                          onClick={() => void openAccountView(employee)}
                        >
                          💳 حساب السلف والمكافآت والخصومات
                        </button>
                        <button
                          type="button"
                          className="edit-button"
                          style={{ color: "#785038", borderColor: "#c99a59", fontWeight: 700 }}
                          onClick={() => void openStatsView(employee)}
                        >
                          📊 الإحصائيات والمبيعات
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          style={{ fontWeight: 700 }}
                          onClick={() => openEditView(employee)}
                        >
                          ✏️ تعديل
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          style={{ color: "#a34331", borderColor: "#f5c6cb", fontWeight: 700 }}
                          onClick={() => void handleDeleteEmployee(employee)}
                        >
                          🗑️ حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!employees.length && <Empty text="لا يوجد موظفون مسجلون بعد." />}
          </div>
        </section>
      )}

      {subView === "add" && (
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>إضافة موظف جديد</h2>
              <p>إضافة موظف مع إمكانية إنشاء حساب دخول مخصص (بائع مركزي أو فردي) وتحديد صلاحيات الصفحات.</p>
            </div>
          </div>
          <form onSubmit={submitNewEmployee} style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <div style={{
              background: createAccount ? "linear-gradient(180deg, #fffbf7 0%, #faf3eb 100%)" : "#fdfdfc",
              border: createAccount ? "1px solid #ebd8c8" : "1px dashed #d5cbc2",
              borderRadius: "14px",
              padding: "18px 20px",
              boxShadow: "0 2px 8px rgba(120, 80, 56, 0.04)",
              transition: "all 0.2s ease"
            }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: 700, fontSize: "15px", color: "#34231c" }}>
                <input
                  type="checkbox"
                  checked={createAccount}
                  onChange={(e) => {
                    setCreateAccount(e.target.checked);
                    if (!e.target.checked) setIsMainSellerAccount(false);
                  }}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <span>إنشاء حساب تسجيل دخول للنظام (اسم مستخدم وكلمة مرور)</span>
              </label>
              <p style={{ margin: "4px 28px 0 0", fontSize: "12px", color: "#786558" }}>
                💡 اتركه غير مفعّل إذا كان المحل يعمل بحساب بائع موحد لجميع الموظفين؛ يكفي فقط كتابة اسم الموظف بالأسفل ليظهر في قائمة البائعين بنقطة البيع (POS). فعّل هذا الخيار فقط إذا أردت للموظف حساب دخول خاص به.
              </p>

              {createAccount && (
                <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{
                    background: isMainSellerAccount ? "#fffbeb" : "#faf7f4",
                    border: isMainSellerAccount ? "2px solid #f59e0b" : "1px solid #ebd8c8",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    transition: "all 0.2s ease"
                  }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: 800, fontSize: "14px", color: isMainSellerAccount ? "#78350f" : "#34231c" }}>
                      <input
                        type="checkbox"
                        checked={isMainSellerAccount}
                        onChange={(e) => handleToggleMainSellerAccount(e.target.checked)}
                        style={{ width: "18px", height: "18px", cursor: "pointer" }}
                      />
                      <span>⭐ تعيين هذا الحساب كـ "حساب البائع الرئيسي المشترك" (الكاشير الموحد لجميع الموظفين)</span>
                    </label>
                    <p style={{ margin: "4px 28px 0 0", fontSize: "12px", color: isMainSellerAccount ? "#92400e" : "#786558", lineHeight: 1.5 }}>
                      💡 عند تفعيل هذا الخيار، يتم تجهيز الحساب ليكون حساب الكاشير العام للمحل؛ فيحصل تلقائياً على صلاحيات <strong>نقطة البيع (POS)</strong> و<strong>الفواتير</strong> و<strong>صفحة إثبات الحضور والانصراف اليومي لجميع الموظفين</strong>.
                    </p>
                  </div>

                  <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                    <label>
                      اسم المستخدم (Username)
                      <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="مثال: cashier أو ahmed_pos"
                        required={createAccount}
                      />
                    </label>

                    <label>
                      كلمة المرور (Password)
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="10 أرقام أو حروف على الأقل"
                        minLength={10}
                        required={createAccount}
                      />
                    </label>
                  </div>

                  <PermissionsSelector
                    permissions={permissions}
                    onToggle={togglePermission}
                    onSet={setPermissions}
                    onToggleMainSeller={handleToggleMainSellerAccount}
                  />
                </div>
              )}
            </div>

            <div style={{
              background: "#ffffff",
              border: "1px solid #e9e1d9",
              borderRadius: "14px",
              padding: "18px 20px"
            }}>
              <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>👤</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", color: "#333", fontWeight: "700" }}>
                    البيانات الشخصية والوظيفية
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#785038", fontWeight: 600 }}>
                    💡 الاسم فقط هو المطلوب. باقي الحقول (الراتب، مواعيد العمل، الهاتف، العنوان) اختيارية تماماً ويمكن تركها كما هي.
                  </p>
                </div>
              </div>

              <div className="form-grid" style={{ gap: "14px", alignItems: "start" }}>
                <label>الاسم بالكامل *<input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: أحمد محمد علي" required /></label>
                <label>الوظيفة (اختياري)<input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="الافتراضي: بائع" /></label>
                <label>رقم الهاتف (اختياري)<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010xxxxxxxx" /></label>
                <label>العنوان (اختياري)<input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="مثال: طنطا" /></label>
                <label>تاريخ التعيين (اختياري)<input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} /></label>
                <label>الراتب الأساسي بالجنيه (اختياري)<input type="number" min="0" step="0.01" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="0.00" /></label>
                <label>ساعات العمل اليومية (اختياري)<input type="number" min="1" max="24" value={workHours} onChange={(e) => setWorkHours(e.target.value)} placeholder="8" /><small>الافتراضي: 8 ساعات</small></label>
                <label>موعد الحضور (اختياري)<input type="time" dir="ltr" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} /><small>الافتراضي: {formatTime12(shiftStart || "09:00")}</small></label>
                <label>موعد الانصراف (اختياري)<input type="time" dir="ltr" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} /><small>الافتراضي: {formatTime12(shiftEnd || "17:00")}</small></label>
              </div>
            </div>

            <div className="button-row" style={{ marginTop: "4px" }}>
              <button className="primary" disabled={busy}>حفظ وتأكيد الموظف</button>
              <button type="button" className="secondary" onClick={() => setSubView("list")}>إلغاء</button>
            </div>
          </form>
        </section>
      )}

      {subView === "edit" && editingEmp && (
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>تعديل بيانات الموظف: {editingEmp.name}</h2>
              <p>تعديل البيانات الوظيفية والراتب والوردية وكلمة المرور.</p>
            </div>
          </div>
          <form onSubmit={submitEditEmployee} style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
            <div style={{
              background: createAccount ? "linear-gradient(180deg, #fffbf7 0%, #faf3eb 100%)" : "#fdfdfc",
              border: createAccount ? "1px solid #ebd8c8" : "1px dashed #d5cbc2",
              borderRadius: "14px",
              padding: "18px 20px",
              boxShadow: "0 2px 8px rgba(120, 80, 56, 0.04)",
              transition: "all 0.2s ease"
            }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: 700, fontSize: "15px", color: "#34231c" }}>
                <input
                  type="checkbox"
                  checked={createAccount}
                  onChange={(e) => {
                    setCreateAccount(e.target.checked);
                    if (!e.target.checked) setIsMainSellerAccount(false);
                  }}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <span>تفعيل حساب تسجيل دخول في النظام (حساب بائع مركزي أو فردي)</span>
              </label>
              <p style={{ margin: "4px 28px 0 0", fontSize: "12px", color: "#786558" }}>
                {editingEmp.userId
                  ? "إذا قمت بإلغاء تفعيل هذا الخيار وحفظت، فسيتم حذف حساب الدخول للموظف ويبقى الموظف مسجلاً في النظام بدون حساب."
                  : "الموظف حالياً بدون حساب دخول. يمكنك تفعيل هذا الخيار لإنشاء حساب وتحديد صفحات وصلاحيات الحساب."}
              </p>

              {createAccount && (
                <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div style={{
                    background: isMainSellerAccount ? "#fffbeb" : "#faf7f4",
                    border: isMainSellerAccount ? "2px solid #f59e0b" : "1px solid #ebd8c8",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    transition: "all 0.2s ease"
                  }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: 800, fontSize: "14px", color: isMainSellerAccount ? "#78350f" : "#34231c" }}>
                      <input
                        type="checkbox"
                        checked={isMainSellerAccount}
                        onChange={(e) => handleToggleMainSellerAccount(e.target.checked)}
                        style={{ width: "18px", height: "18px", cursor: "pointer" }}
                      />
                      <span>⭐ تعيين هذا الحساب كـ "حساب البائع الرئيسي المشترك" (الكاشير الموحد لجميع الموظفين)</span>
                    </label>
                    <p style={{ margin: "4px 28px 0 0", fontSize: "12px", color: isMainSellerAccount ? "#92400e" : "#786558", lineHeight: 1.5 }}>
                      💡 عند تفعيل هذا الخيار، يتم تجهيز الحساب ليكون حساب الكاشير العام للمحل؛ فيحصل تلقائياً على صلاحيات <strong>نقطة البيع (POS)</strong> و<strong>الفواتير</strong> و<strong>صفحة إثبات الحضور والانصراف اليومي لجميع الموظفين</strong>.
                    </p>
                  </div>

                  <div className="form-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                    <label>
                      اسم المستخدم (Username)
                      <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="مثال: cashier أو ahmed_pos"
                        required={createAccount}
                      />
                    </label>

                    <label>
                      كلمة المرور الجديدة {editingEmp.userId ? "(اختياري)" : ""}
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={editingEmp.userId ? "اتركه فارغًا للحفاظ على كلمة المرور الحالية" : "10 أرقام أو حروف على الأقل"}
                        minLength={10}
                        required={createAccount && !editingEmp.userId}
                      />
                    </label>
                  </div>

                  <PermissionsSelector
                    permissions={permissions}
                    onToggle={togglePermission}
                    onSet={setPermissions}
                    onToggleMainSeller={handleToggleMainSellerAccount}
                  />
                </div>
              )}
            </div>

            <div style={{
              background: "#ffffff",
              border: "1px solid #e9e1d9",
              borderRadius: "14px",
              padding: "18px 20px"
            }}>
              <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "18px" }}>👤</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "15px", color: "#333", fontWeight: "700" }}>
                    البيانات الشخصية والوظيفية
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#785038", fontWeight: 600 }}>
                    💡 الاسم فقط هو الإجباري. باقي الحقول اختيارية تماماً ويمكن تركها فارغة.
                  </p>
                </div>
              </div>

              <div className="form-grid" style={{ gap: "14px", alignItems: "start" }}>
                <label>الاسم بالكامل *<input value={name} onChange={(e) => setName(e.target.value)} required /></label>
                <label>الوظيفة (اختياري)<input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="الافتراضي: بائع" /></label>
                <label>رقم الهاتف (اختياري)<input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010xxxxxxxx" /></label>
                <label>العنوان (اختياري)<input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="مثال: طنطا" /></label>
                <label>تاريخ التعيين (اختياري)<input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} /></label>
                <label>الراتب الأساسي بالجنيه (اختياري)<input type="number" min="0" step="0.01" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="0.00" /></label>
                <label>ساعات العمل اليومية (اختياري)<input type="number" min="1" max="24" value={workHours} onChange={(e) => setWorkHours(e.target.value)} placeholder="8" /><small>الافتراضي: 8 ساعات</small></label>
                <label>موعد الحضور (اختياري)<input type="time" dir="ltr" value={shiftStart} onChange={(e) => setShiftStart(e.target.value)} /><small>الافتراضي: {formatTime12(shiftStart || "09:00")}</small></label>
                <label>موعد الانصراف (اختياري)<input type="time" dir="ltr" value={shiftEnd} onChange={(e) => setShiftEnd(e.target.value)} /><small>الافتراضي: {formatTime12(shiftEnd || "17:00")}</small></label>
              </div>
            </div>

            <div className="button-row" style={{ marginTop: "4px" }}>
              <button className="primary">حفظ التعديلات</button>
              <button type="button" className="secondary" onClick={() => setSubView("list")}>إلغاء</button>
            </div>
          </form>
        </section>
      )}

      {subView === "telegram" && (
        <section className="panel">
          <div className="section-head">
            <div>
              <h2>إعدادات وتنبيهات تليجرام</h2>
              <p>احفظ بيانات بوت تليجرام وفترة السماح لتلقي إشعارات الحضور والتأخير فوراً.</p>
            </div>
            <span className="pill">{telegramSettings?.configured ? "متصل بالإعدادات" : "غير مهيأ"}</span>
          </div>

          {telegramError && <div className="message error" role="alert">{telegramError}</div>}
          {telegramNotice && <div className="message success" role="status">{telegramNotice}</div>}

          <form className="staff-form-grid" onSubmit={(event) => {
            event.preventDefault();
            void runTelegramAction(async () => {
              await invoke("configure_telegram", {
                token: session.token,
                botToken: botToken.trim() || null,
                chatId,
                graceMinutes: Number(graceMinutes),
                autoReportEnabled,
                autoReportTime
              });
              setBotToken("");
              await loadTelegramSettings();
            }, "تم حفظ إعدادات تليجرام وجدولة التقرير بنجاح");
          }}>
            <label>
              رمز البوت (Bot Token)
              <input
                type="password"
                autoComplete="off"
                value={botToken}
                onChange={(event) => setBotToken(event.target.value)}
                placeholder={telegramSettings?.configured ? "اتركه فارغًا للاحتفاظ بالرمز الحالي" : "رمز البوت من BotFather"}
              />
            </label>
            <label>
              معرّف محادثة المدير (Chat ID)
              <input value={chatId} onChange={(event) => setChatId(event.target.value)} placeholder="Chat ID" />
            </label>
            <label>
              السماح بالتأخير (بالدقائق)
              <input type="number" min="0" max="180" value={graceMinutes} onChange={(event) => setGraceMinutes(event.target.value)} />
            </label>

            <div style={{
              gridColumn: "1 / -1",
              background: autoReportEnabled ? "#f0fdf4" : "#fdfbf7",
              border: autoReportEnabled ? "1.5px solid #86efac" : "1px dashed #d5cbc2",
              borderRadius: "12px",
              padding: "14px 18px",
              marginTop: "4px",
              transition: "all 0.2s ease"
            }}>
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", fontWeight: 700, fontSize: "14px", color: autoReportEnabled ? "#166534" : "#34231c" }}>
                <input
                  type="checkbox"
                  checked={autoReportEnabled}
                  onChange={(e) => setAutoReportEnabled(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <span>⏰ تفعيل إرسال تقرير اليوم تلقائياً إلى تليجرام المدير يومياً (إغلاق الوردية)</span>
              </label>
              <p style={{ margin: "4px 28px 0 0", fontSize: "12px", color: autoReportEnabled ? "#15803d" : "#786558" }}>
                💡 يقوم النظام تلقائياً عند حلول الوقت المحدد بإرسال التقرير المالي والإداري الشامل لليوم إلى حساب تليجرام المدير دون الحاجة للضغط على أي زر.
              </p>

              {autoReportEnabled && (
                <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", paddingRight: "28px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, fontWeight: 600, fontSize: "13px", color: "#166534" }}>
                    <span>موعد الإرسال اليومي (توقيت القاهرة):</span>
                    <input
                      type="time"
                      dir="ltr"
                      value={autoReportTime}
                      onChange={(e) => setAutoReportTime(e.target.value)}
                      required={autoReportEnabled}
                      style={{
                        direction: "ltr",
                        textAlign: "left",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: "1px solid #86efac",
                        background: "#fff",
                        fontWeight: 700,
                        fontSize: "14px",
                        color: "#14532d",
                        width: "130px"
                      }}
                    />
                  </label>
                  <span style={{ fontSize: "12px", color: "#15803d", fontWeight: 700 }}>
                    ({formatTime12(autoReportTime)})
                  </span>
                  {telegramSettings?.autoReportLastSentDate && (
                    <span style={{ fontSize: "11px", color: "#166534", background: "#dcfce7", padding: "3px 8px", borderRadius: "6px" }}>
                      ✓ آخر إرسال تلقائي: {telegramSettings.autoReportLastSentDate}
                    </span>
                  )}
                </div>
              )}
            </div>

            <button className="primary" disabled={telegramWorking}>حفظ الإعدادات</button>
          </form>

          <div className="staff-actions" style={{ marginTop: "16px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="secondary"
              disabled={telegramWorking || !telegramSettings?.configured}
              onClick={() => void runTelegramAction(async () => {
                const res = await invoke<string>("send_daily_report_to_telegram", { token: session.token, date: null });
                setTelegramNotice(res);
              }, "")}
              style={{ color: "#166534", borderColor: "#86efac", background: "#f0fdf4", fontWeight: 700 }}
              title="إرسال تقرير اليوم الفعلي الشامل الآن إلى تليجرام المدير"
            >
              📊 إرسال تقرير اليوم لتليجرام
            </button>
            <button
              type="button"
              className="secondary"
              disabled={telegramWorking || !telegramSettings?.configured}
              onClick={() => void runTelegramAction(() => invoke("test_telegram", { token: session.token }), "تم إرسال رسالة اختبار إلى حساب المدير على تليجرام")}
            >
              🚀 إرسال رسالة تجريبية
            </button>
            <button
              type="button"
              className="secondary"
              disabled={telegramWorking || !telegramSettings?.configured || !telegramSettings.pendingAlerts}
              onClick={() => void runTelegramAction(async () => {
                await invoke("retry_telegram_alerts", { token: session.token });
                await loadTelegramSettings();
              }, "تمت إعادة محاولة إرسال التنبيهات المعلقة")}
            >
              🔄 إعادة محاولة التنبيهات ({telegramSettings?.pendingAlerts ?? 0})
            </button>
          </div>
          <small style={{ marginTop: "12px", display: "block", color: "#8b7b70" }}>
            تأكد من بدء المحادثة مع البوت في تليجرام من حساب المدير أولاً قبل إرسال الرسالة التجريبية.
          </small>
        </section>
      )}

      {subView === "account" && selectedEmp && (
        <section className="panel" data-print-document="employee-account">
          <div className="section-head">
            <div>
              <h2>حساب وراتب الموظف: {selectedEmp.name}</h2>
              <p>متابعة الراتب الأساسي، المكافآت، السلف، الخصومات وصافي المستحق لهذا الموظف.</p>
            </div>
            <button type="button" className="secondary" onClick={() => void printDocumentFromPage("employee-account", "كشف الراتب")}>
              طباعة كشف الراتب 🖨️
            </button>
          </div>

          {accountError && <div className="message error" role="alert">{accountError}</div>}
          {accountNotice && <div className="message success" role="status">{accountNotice}</div>}

          <div className="staff-filters" style={{ marginBottom: "20px" }}>
            <div className="field">
              <span className="field-label">تبديل الموظف</span>
              <BrandSelect
                label="الموظف"
                placeholder="اختر الموظف"
                value={String(selectedEmp.id)}
                onValueChange={(val) => {
                  const emp = employees.find((e) => e.id === Number(val));
                  if (emp) void openAccountView(emp);
                }}
                options={employees.map((employee) => ({ value: String(employee.id), label: employee.name }))}
              />
            </div>
            <label>
              شهر الراتب والحسابات
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
            </label>
          </div>

          {account && (
            <>
              <div className="staff-summary" style={{ marginBottom: "20px" }}>
                <div><span>الراتب الأساسي</span><strong>{money(account.baseSalaryPiasters)}</strong></div>
                <div><span>مكافآت وحوافز</span><strong style={{ color: "#24742c" }}>+{money(account.rewardsPiasters)}</strong></div>
                <div>
                  <span>ساعات عمل إضافية</span>
                  <strong style={{ color: "#92400e" }}>
                    {formatOvertimeDuration(account.totalOvertimeMinutes)}
                  </strong>
                  <small style={{ fontSize: "10px", color: "#786558", display: "block", marginTop: "2px" }}>
                    (تم صرف: {formatOvertimeDuration(account.paidOvertimeMinutes)} · معلق: {formatOvertimeDuration(account.unpaidOvertimeMinutes)})
                  </small>
                </div>
                <div><span>سلف مخصومة من الراتب</span><strong style={{ color: "#b94d3f" }}>-{money(account.loanRepaymentsPiasters)}</strong></div>
                <div><span>خصومات أخرى</span><strong style={{ color: "#b94d3f" }}>-{money(account.deductionsPiasters)}</strong></div>
                <div><span>صافي الراتب المستحق</span><strong style={{ color: "#24742c", fontSize: "18px" }}>{money(account.netSalaryPiasters)}</strong></div>
              </div>

              <div className="staff-money-grid" style={{ marginBottom: "24px" }}>
                <form
                  style={{ display: "flex", flexDirection: "column", gap: "12px", border: "1px solid #c3e6cb", background: "#f8fdf9", borderRadius: "12px", padding: "16px" }}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runAccountAction(async () => {
                      await invoke("create_employee_reward", {
                        token: session.token,
                        employeeId: selectedEmp.id,
                        amountPiasters: piastres(rewardAmount),
                        reason: rewardReason,
                        periodMonth: month,
                      });
                      setRewardAmount(""); setRewardReason("");
                      await fetchAccount(selectedEmp.id, month);
                    }, `تم تسجيل مكافأة بقيمة ${rewardAmount} ج.م على راتب شهر ${month}`);
                  }}
                >
                  <h3 style={{ margin: 0, color: "#198754", display: "flex", alignItems: "center", gap: "6px" }}>🎁 تسجيل مكافأة / حافز لشهر {month}</h3>
                  <label>القيمة بالجنيه<input type="number" min="0.01" step="0.01" required value={rewardAmount} onChange={(event) => setRewardAmount(event.target.value)} placeholder="0.00" /></label>
                  <label>سبب المكافأة<input required value={rewardReason} onChange={(event) => setRewardReason(event.target.value)} placeholder="مثال: تميز بالمبيعات، حافز انتظام" /></label>
                  <button className="primary" style={{ marginTop: "10px", width: "100%", background: "#198754", borderColor: "#198754" }} disabled={accountWorking}>🎁 تسجيل المكافأة (+ تضاف للراتب)</button>
                </form>

                <form
                  style={{ display: "flex", flexDirection: "column", gap: "12px", border: "1px solid #fed7aa", background: "#fffdfa", borderRadius: "12px", padding: "16px" }}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runAccountAction(async () => {
                      await invoke("create_employee_loan", { token: session.token, employeeId: selectedEmp.id, amountPiasters: piastres(loanAmount), reason: loanReason || null, periodMonth: month });
                      setLoanAmount(""); setLoanReason("");
                      await fetchAccount(selectedEmp.id, month);
                    }, `تم إضافة سلفة بقيمة ${loanAmount} ج.م وتنزيلها من راتب شهر ${month}`);
                  }}
                >
                  <h3 style={{ margin: 0, color: "#c2410c", display: "flex", alignItems: "center", gap: "6px" }}>💸 تسجيل سلفة (تخصم من الراتب)</h3>
                  <label>القيمة بالجنيه<input type="number" min="0.01" step="0.01" required value={loanAmount} onChange={(event) => setLoanAmount(event.target.value)} placeholder="0.00" /></label>
                  <label>السبب أو الملاحظة<input value={loanReason} onChange={(event) => setLoanReason(event.target.value)} placeholder="مثال: سلفة شخصية" /></label>
                  <button className="primary" style={{ marginTop: "10px", width: "100%", background: "#ea580c", borderColor: "#ea580c" }} disabled={accountWorking}>💸 تسجيل السلفة (- تخصم)</button>
                </form>

                <form
                  style={{ display: "flex", flexDirection: "column", gap: "12px", border: "1px solid #fecdd3", background: "#fffafb", borderRadius: "12px", padding: "16px" }}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void runAccountAction(async () => {
                      await invoke("create_employee_deduction", { token: session.token, employeeId: selectedEmp.id, amountPiasters: piastres(deductionAmount), reason: deductionReason, periodMonth: month });
                      setDeductionAmount(""); setDeductionReason("");
                      await fetchAccount(selectedEmp.id, month);
                    }, `تم تسجيل خصم بقيمة ${deductionAmount} ج.م على راتب شهر ${month}`);
                  }}
                >
                  <h3 style={{ margin: 0, color: "#be123c", display: "flex", alignItems: "center", gap: "6px" }}>⚠️ تسجيل خصم من راتب شهر {month}</h3>
                  <label>القيمة بالجنيه<input type="number" min="0.01" step="0.01" required value={deductionAmount} onChange={(event) => setDeductionAmount(event.target.value)} placeholder="0.00" /></label>
                  <label>سبب الخصم<input required value={deductionReason} onChange={(event) => setDeductionReason(event.target.value)} placeholder="مثال: غياب، تأخير، تلفيات" /></label>
                  <button className="primary" style={{ marginTop: "10px", width: "100%", background: "#be123c", borderColor: "#be123c" }} disabled={accountWorking}>⚠️ تسجيل الخصم (- يخصم)</button>
                </form>
              </div>

              <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "#198754", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🎁</span> مكافآت وحوافز شهر ({month})
              </h3>
              <div className="table-wrap" style={{ marginBottom: "20px" }}>
                <table>
                  <thead>
                    <tr>
                      <th>التاريخ والوقت</th>
                      <th>مبلغ المكافأة</th>
                      <th>سبب المكافأة</th>
                      {session.role === "ADMIN" && <th style={{ textAlign: "center", width: "80px" }}>إجراء</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {account.rewards.map((reward) => (
                      <tr key={reward.id}>
                        <td><code>{formatDateTime(reward.createdAt)}</code></td>
                        <td><strong style={{ color: "#24742c" }}>+{money(reward.amountPiasters)}</strong></td>
                        <td>{reward.reason}</td>
                        {session.role === "ADMIN" && (
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="danger-button"
                              style={{ padding: "3px 8px", fontSize: "12px" }}
                              onClick={() => {
                                if (!confirm(`هل أنت متأكد من حذف مكافأة (${money(reward.amountPiasters)})؟`)) return;
                                void runAccountAction(async () => {
                                  await invoke("delete_employee_reward", { token: session.token, rewardId: reward.id });
                                  await fetchAccount(selectedEmp.id, month);
                                }, "تم حذف سجل المكافأة بنجاح");
                              }}
                              disabled={accountWorking}
                              title="حذف المكافأة"
                            >
                              🗑️
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!account.rewards.length && <Empty text="لا توجد مكافآت مسجلة في هذا الشهر." />}
              </div>

              <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "#34231c", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>💸</span> سجل السلف المخصومة من راتب شهر ({month})
              </h3>
              <div className="table-wrap" style={{ marginBottom: "20px" }}>
                <table>
                  <thead>
                    <tr>
                      <th>التاريخ والوقت</th>
                      <th>مبلغ السلفة المخصوم</th>
                      <th>السبب أو الملاحظة</th>
                      {session.role === "ADMIN" && <th style={{ textAlign: "center", width: "80px" }}>إجراء</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {account.loans.map((loan) => (
                      <tr key={loan.id}>
                        <td><code>{formatDateTime(loan.createdAt)}</code></td>
                        <td><strong style={{ color: "#b94d3f" }}>-{money(loan.amountPiasters)}</strong></td>
                        <td>{loan.reason || "—"}</td>
                        {session.role === "ADMIN" && (
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="danger-button"
                              style={{ padding: "3px 8px", fontSize: "12px" }}
                              onClick={() => {
                                if (!confirm(`هل أنت متأكد من حذف هذه السلفة (${money(loan.amountPiasters)})؟`)) return;
                                void runAccountAction(async () => {
                                  await invoke("delete_employee_loan", { token: session.token, loanId: loan.id });
                                  await fetchAccount(selectedEmp.id, month);
                                }, "تم حذف سجل السلفة بنجاح");
                              }}
                              disabled={accountWorking}
                              title="حذف السلفة"
                            >
                              🗑️
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!account.loans.length && <Empty text="لا توجد سلف مسجلة لهذا الموظف في هذا الشهر." />}
              </div>

              <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "#34231c", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>⚠️</span> خصومات شهر ({month})
              </h3>
              <div className="table-wrap" style={{ marginBottom: "20px" }}>
                <table>
                  <thead>
                    <tr>
                      <th>التاريخ والوقت</th>
                      <th>قيمة الخصم</th>
                      <th>سبب الخصم</th>
                      {session.role === "ADMIN" && <th style={{ textAlign: "center", width: "80px" }}>إجراء</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {account.deductions.map((deduction) => (
                      <tr key={deduction.id}>
                        <td><code>{formatDateTime(deduction.createdAt)}</code></td>
                        <td><strong style={{ color: "#b94d3f" }}>-{money(deduction.amountPiasters)}</strong></td>
                        <td>{deduction.reason}</td>
                        {session.role === "ADMIN" && (
                          <td style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              className="danger-button"
                              style={{ padding: "3px 8px", fontSize: "12px" }}
                              onClick={() => {
                                if (!confirm(`هل أنت متأكد من حذف هذا الخصم (${money(deduction.amountPiasters)})؟`)) return;
                                void runAccountAction(async () => {
                                  await invoke("delete_employee_deduction", { token: session.token, deductionId: deduction.id });
                                  await fetchAccount(selectedEmp.id, month);
                                }, "تم حذف سجل الخصم بنجاح");
                              }}
                              disabled={accountWorking}
                              title="حذف الخصم"
                            >
                              🗑️
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!account.deductions.length && <Empty text="لا توجد خصومات مسجلة في هذا الشهر." />}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
                <h3 style={{ fontSize: "16px", margin: 0, color: "#34231c" }}>
                  سجل الحضور والانصراف هذا الشهر ({month})
                </h3>
                {Boolean(account.unpaidOvertimeMinutes && account.unpaidOvertimeMinutes > 0) && session.role === "ADMIN" && (
                  <button
                    type="button"
                    className="secondary print-hide"
                    style={{
                      fontSize: "12px",
                      padding: "6px 12px",
                      fontWeight: 700,
                      background: "#f0fdf4",
                      color: "#166534",
                      borderColor: "#86efac",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                    disabled={accountWorking}
                    onClick={() => {
                      const ans = prompt(`تسوية وصرف كافة الساعات الإضافية المعلقة (${formatOvertimeDuration(account.unpaidOvertimeMinutes)}) لهذا الموظف في شهر ${month}:\n\nإذا أردت تسجيل مكافأة مالية تضاف تلقائياً للراتب، اكتب المبلغ بالجنيه، أو اترك الحقل فارغاً للمحاسبة دون إضافة مكافأة منفصلة:`, "");
                      if (ans === null) return;
                      const rewardVal = ans.trim() ? piastres(ans.trim()) : null;
                      void runAccountAction(async () => {
                        await invoke("settle_employee_overtime", {
                          token: session.token,
                          employeeId: selectedEmp.id,
                          periodMonth: month,
                          rewardAmountPiasters: rewardVal,
                          reason: rewardVal ? `مكافأة ساعات عمل إضافية (${formatOvertimeDuration(account.unpaidOvertimeMinutes)}) لشهر ${month}` : null,
                        });
                        await fetchAccount(selectedEmp.id, month);
                      }, `تمت تسوية واعتماد صرف كافة الساعات الإضافية بنجاح.`);
                    }}
                  >
                    ⚡ تسوية وصرف الساعات الإضافية المعلقة ({formatOvertimeDuration(account.unpaidOvertimeMinutes)})
                  </button>
                )}
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>الوردية</th>
                      <th>الحضور الفعلي</th>
                      <th>الانصراف</th>
                      <th>التأخير</th>
                      <th>الوقت الإضافي (Overtime)</th>
                      <th>حالة المحاسبة</th>
                      <th>حالة تليجرام</th>
                      {session.role === "ADMIN" && <th className="print-hide" style={{ textAlign: "center" }}>إجراء</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {account.attendance.map((day) => {
                      const hasOvertime = Boolean(day.overtimeMinutes && day.overtimeMinutes > 0);
                      return (
                        <tr key={day.shiftDate}>
                          <td>{day.shiftDate} · {formatShiftRange(day.shiftStart, day.shiftEnd)}</td>
                          <td>{day.checkedInAt ? formatDateTime(day.checkedInAt) : "—"}</td>
                          <td>{day.checkedOutAt ? formatDateTime(day.checkedOutAt) : "—"}</td>
                          <td>{day.lateMinutes ? attendanceDelay(day) : "في الموعد"}</td>
                          <td>
                            {hasOvertime ? (
                              <strong style={{ color: day.overtimePaid ? "#15803d" : "#b45309" }}>
                                +{formatOvertimeDuration(day.overtimeMinutes)}
                              </strong>
                            ) : (
                              <span style={{ color: "#9ca3af" }}>—</span>
                            )}
                          </td>
                          <td>
                            {hasOvertime ? (
                              day.overtimePaid ? (
                                <span style={{ background: "#dcfce7", color: "#166534", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
                                  ✓ تم التحاسب والصرف
                                </span>
                              ) : (
                                <span style={{ background: "#fef2f2", color: "#b91c1c", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
                                  ⏳ معلق (لم يُحاسب)
                                </span>
                              )
                            ) : (
                              <span style={{ color: "#9ca3af" }}>—</span>
                            )}
                          </td>
                          <td>{day.telegramStatus === "SENT" ? "تم الإرسال" : day.telegramStatus === "FAILED" ? "فشل — يحتاج إعادة محاولة" : day.telegramStatus === "UNCONFIGURED" ? "تليجرام غير مهيأ" : day.telegramStatus === "PENDING" ? "قيد الإرسال" : "—"}</td>
                          {session.role === "ADMIN" && (
                            <td className="print-hide" style={{ textAlign: "center" }}>
                              {hasOvertime ? (
                                <button
                                  type="button"
                                  className="secondary"
                                  style={{
                                    fontSize: "11px",
                                    padding: "3px 8px",
                                    fontWeight: 700,
                                    color: day.overtimePaid ? "#6b7280" : "#15803d",
                                    borderColor: day.overtimePaid ? "#d1d5db" : "#86efac",
                                  }}
                                  disabled={accountWorking}
                                  onClick={() => {
                                    void runAccountAction(async () => {
                                      await invoke("toggle_attendance_overtime_paid", {
                                        token: session.token,
                                        employeeId: selectedEmp.id,
                                        shiftDate: day.shiftDate,
                                      });
                                      await fetchAccount(selectedEmp.id, month);
                                    }, day.overtimePaid ? "تم إلغاء حالة المحاسبة" : "تم تأكيد محاسبة وصرف الساعات الإضافية");
                                  }}
                                  title={day.overtimePaid ? "إلغاء الصرف والرجوع لحالة معلق" : "تأكيد محاسبة وصرف الساعات الإضافية"}
                                >
                                  {day.overtimePaid ? "↩️ إلغاء" : "💵 تسوية"}
                                </button>
                              ) : (
                                "—"
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!account.attendance.length && <Empty text="لا يوجد حضور مسجل في هذا الشهر." />}
              </div>
            </>
          )}
        </section>
      )}

      {subView === "stats" && selectedEmp && (
        <section className="panel" data-print-document="employee-stats">
          <div className="section-head">
            <div>
              <h2>📊 تقرير أداء وإحصائيات الموظف</h2>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#785038", fontWeight: "700" }}>
                {selectedEmp.name} ({selectedEmp.jobTitle})
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                type="button"
                className="secondary print-hide"
                onClick={() => {
                  if (statsPreset === "ALL") {
                    void fetchEmployeeStats(selectedEmp.id);
                  } else {
                    void fetchEmployeeStats(selectedEmp.id, statsStartDate || undefined, statsEndDate || undefined);
                  }
                }}
                disabled={loadingStats}
                title="إعادة تحميل البيانات"
              >
                🔄 تحديث
              </button>
              <button type="button" className="secondary" onClick={() => void printDocumentFromPage("employee-stats", "إحصائيات الموظف")}>
                طباعة الإحصائيات 🖨️
              </button>
            </div>
          </div>

          {/* شريط فلاتر الفترة الزمنية */}
          <div
            className="print-hide"
            style={{
              background: "#faf6f0",
              border: "1px solid #e2d4c5",
              borderRadius: "12px",
              padding: "12px 16px",
              marginBottom: "16px",
              display: "flex",
              flexWrap: "wrap",
              gap: "14px",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#785038" }}>
                ⏳ تصفية حسب الفترة:
              </span>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="preset-btn"
                  style={statsPreset === "TODAY" ? { background: "#785038", color: "#fff", borderColor: "#785038", fontWeight: 700 } : { fontWeight: 600 }}
                  onClick={() => handleApplyStatsPreset("TODAY")}
                >
                  📅 اليوم
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  style={statsPreset === "WEEK" ? { background: "#785038", color: "#fff", borderColor: "#785038", fontWeight: 700 } : { fontWeight: 600 }}
                  onClick={() => handleApplyStatsPreset("WEEK")}
                >
                  🗓️ هذا الأسبوع
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  style={statsPreset === "MONTH" ? { background: "#785038", color: "#fff", borderColor: "#785038", fontWeight: 700 } : { fontWeight: 600 }}
                  onClick={() => handleApplyStatsPreset("MONTH")}
                >
                  📆 هذا الشهر
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  style={statsPreset === "ALL" ? { background: "#785038", color: "#fff", borderColor: "#785038", fontWeight: 700 } : { fontWeight: 600 }}
                  onClick={() => handleApplyStatsPreset("ALL")}
                >
                  ♾️ طول الوقت
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  style={statsPreset === "CUSTOM" ? { background: "#785038", color: "#fff", borderColor: "#785038", fontWeight: 700 } : { fontWeight: 600 }}
                  onClick={() => handleApplyStatsPreset("CUSTOM")}
                >
                  🎯 مخصص
                </button>
              </div>
            </div>

            {statsPreset === "CUSTOM" && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <label style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#5a4539" }}>من:</label>
                  <input
                    type="date"
                    value={statsStartDate}
                    onChange={(e) => handleCustomStatsDateChange(e.target.value, statsEndDate)}
                    style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #dfd5ca", fontSize: "12px" }}
                  />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <label style={{ margin: 0, fontSize: "12px", fontWeight: 600, color: "#5a4539" }}>إلى:</label>
                  <input
                    type="date"
                    value={statsEndDate}
                    onChange={(e) => handleCustomStatsDateChange(statsStartDate, e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #dfd5ca", fontSize: "12px" }}
                  />
                </div>
              </div>
            )}

            {employees.length > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "220px" }}>
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#785038", whiteSpace: "nowrap" }}>تبديل الموظف:</span>
                <div style={{ flex: 1, minWidth: "170px" }}>
                  <BrandSelect
                    label="الموظف"
                    placeholder="اختر الموظف"
                    value={String(selectedEmp.id)}
                    onValueChange={(val) => {
                      const emp = employees.find((x) => x.id === Number(val));
                      if (emp) {
                        setSelectedEmp(emp);
                        if (statsPreset === "ALL") {
                          void fetchEmployeeStats(emp.id);
                        } else {
                          void fetchEmployeeStats(emp.id, statsStartDate || undefined, statsEndDate || undefined);
                        }
                      }
                    }}
                    options={employees.map((emp) => ({
                      value: String(emp.id),
                      label: `${emp.name} (${emp.jobTitle})`,
                    }))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* شارة نطاق الفترة (تظهر على الشاشة وتُطبع في التقرير) */}
          <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "5px 12px",
                borderRadius: "8px",
                background: "#f0e6dc",
                color: "#5b3823",
                fontSize: "13px",
                fontWeight: 700,
                border: "1px solid #dfd0c0",
              }}
            >
              📌 نطاق الإحصائيات المعروضة:{" "}
              {statsPreset === "ALL" && "طول الوقت (جميع المبيعات المسجلة)"}
              {statsPreset === "TODAY" && `اليوم (${statsStartDate || new Date().toLocaleDateString("en-CA")})`}
              {statsPreset === "WEEK" && `هذا الأسبوع (${statsStartDate} إلى ${statsEndDate})`}
              {statsPreset === "MONTH" && `هذا الشهر (${statsStartDate} إلى ${statsEndDate})`}
              {statsPreset === "CUSTOM" && `فترة مخصصة (${statsStartDate || "البداية"} إلى ${statsEndDate || "اليوم"})`}
            </span>
          </div>

          {loadingStats && <div className="empty"><p>جارٍ تحميل إحصائيات الموظف…</p></div>}
          {statsError && <div className="message error">{statsError}</div>}

          {employeeStats && (
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              <div className="invoice-details-grid" style={{ background: "#faf6f0", border: "1px solid #e2d4c5", borderRadius: "12px", padding: "14px" }}>
                <div><small>اسم الموظف</small><strong>{selectedEmp.name}</strong></div>
                <div><small>اسم المستخدم (الدخول)</small><strong>{selectedEmp.username}</strong></div>
                <div><small>الوظيفة</small><strong>{selectedEmp.jobTitle}</strong></div>
                <div><small>رقم الهاتف</small><strong>{selectedEmp.phone || "—"}</strong></div>
                <div><small>ساعات العمل والشفت</small><strong>{selectedEmp.workHours} ساعة ({formatShiftRange(selectedEmp.shiftStart, selectedEmp.shiftEnd)})</strong></div>
                <div><small>الراتب الأساسي</small><strong>{money(selectedEmp.baseSalaryPiasters)}</strong></div>
                <div><small>تاريخ التعيين</small><strong>{selectedEmp.hireDate}</strong></div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
                <div style={{ background: "#fff", padding: "14px", borderRadius: "12px", border: "1px solid #e9e1d9" }}>
                  <span style={{ fontSize: "12px", color: "#8b7b70", display: "block" }}>إجمالي المبيعات (الصافي)</span>
                  <strong style={{ fontSize: "20px", color: "#24742c", marginTop: "4px", display: "block" }}>
                    {money(employeeStats.totalSalesPiasters)}
                  </strong>
                  <small style={{ fontSize: "10px", color: "#8b7b70" }}>قبل الخصم والارتجاع: {money(employeeStats.grossSalesPiasters)}</small>
                </div>

                <div style={{ background: "#fff", padding: "14px", borderRadius: "12px", border: "1px solid #e9e1d9" }}>
                  <span style={{ fontSize: "12px", color: "#8b7b70", display: "block" }}>الفواتير الناجحة</span>
                  <strong style={{ fontSize: "20px", color: "#785038", marginTop: "4px", display: "block" }}>
                    {employeeStats.completedInvoicesCount} فاتورة
                  </strong>
                </div>

                <div style={{ background: "#fff", padding: "14px", borderRadius: "12px", border: "1px solid #e9e1d9" }}>
                  <span style={{ fontSize: "12px", color: "#8b7b70", display: "block" }}>متوسط قيمة الفاتورة</span>
                  <strong style={{ fontSize: "20px", color: "#241c18", marginTop: "4px", display: "block" }}>
                    {money(employeeStats.completedInvoicesCount ? Math.round(employeeStats.totalSalesPiasters / employeeStats.completedInvoicesCount) : 0)}
                  </strong>
                </div>

                <div style={{ background: "#fff0ed", padding: "14px", borderRadius: "12px", border: "1px solid #f5c6cb" }}>
                  <span style={{ fontSize: "12px", color: "#9f352a", display: "block" }}>المرتجعات المستقطعة</span>
                  <strong style={{ fontSize: "20px", color: "#9f352a", marginTop: "4px", display: "block" }}>
                    -{money(employeeStats.refundSalesPiasters)}
                  </strong>
                  <small style={{ fontSize: "10px", color: "#9f352a" }}>من {employeeStats.refundCount} عملية مرتجع</small>
                </div>
              </div>

              <div style={{ background: "#34231c", color: "#fff", borderRadius: "12px", padding: "16px" }}>
                <h4 style={{ margin: "0 0 12px", fontSize: "13px", color: "#d9c4b3" }}>💳 تفكيك وسائل التحصيل الصافية للموظف (بعد الخصم والارتجاع):</h4>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
                  <div style={{ background: "rgba(255,255,255,0.12)", padding: "8px 12px", borderRadius: "8px" }}>
                    <span style={{ fontSize: "11px", color: "#e3d1c2", display: "block" }}>💵 نقدياً (كاش صافي)</span>
                    <strong style={{ fontSize: "15px", color: "#fff" }}>{money(employeeStats.paidCashPiasters)}</strong>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.12)", padding: "8px 12px", borderRadius: "8px" }}>
                    <span style={{ fontSize: "11px", color: "#e3d1c2", display: "block" }}>📲 إنستا باي (صافي)</span>
                    <strong style={{ fontSize: "15px", color: "#fff" }}>{money(employeeStats.paidInstapayPiasters)}</strong>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.12)", padding: "8px 12px", borderRadius: "8px" }}>
                    <span style={{ fontSize: "11px", color: "#e3d1c2", display: "block" }}>💳 محفظة (صافي)</span>
                    <strong style={{ fontSize: "15px", color: "#fff" }}>{money(employeeStats.paidWalletPiasters)}</strong>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.12)", padding: "8px 12px", borderRadius: "8px" }}>
                    <span style={{ fontSize: "11px", color: "#e3d1c2", display: "block" }}>⏳ آجل متبقي</span>
                    <strong style={{ fontSize: "15px", color: "#ffcdd2" }}>{money(employeeStats.remainingPiasters)}</strong>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: "15px", marginBottom: "10px", color: "#34231c" }}>🏆 أكثر المنتجات مبيعاً بواسطة {selectedEmp.name} (الكميات الصافية)</h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>المنتج / المتغير</th>
                        <th>إجمالي الكمية الصافية المباعة</th>
                        <th>صافي قيمة المبيعات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeStats.topProducts.map((p, idx) => {
                        const variantText = [p.color, p.size ? `مقاس ${p.size}` : ""].filter(Boolean).join(" · ");
                        return (
                          <tr key={idx}>
                            <td><strong>#{idx + 1}</strong></td>
                            <td>
                              <strong>{p.name}</strong>
                              {variantText && <small style={{ display: "block", color: "#785038" }}>{variantText}</small>}
                            </td>
                            <td><strong style={{ color: "#24742c" }}>{p.quantity} قطعة</strong></td>
                            <td><strong>{money(p.totalPiasters)}</strong></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!employeeStats.topProducts.length && <Empty text="لم يتم تسجيل عمليات بيع لهذا الموظف بعد." />}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: "15px", marginBottom: "10px", color: "#b94d3f", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>↩️</span> سجل المرتجعات المستقطعة من مبيعات الموظف ({employeeStats.refundsList?.length || 0})
                </h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>إذن المرتجع</th>
                        <th>الفاتورة الأصلية</th>
                        <th>العميل</th>
                        <th>طريقة الاسترداد</th>
                        <th>التاريخ والوقت</th>
                        <th>المبلغ المرجع/المخصوم</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(employeeStats.refundsList || []).map((r, idx) => (
                        <tr key={idx}>
                          <td><strong>#{r.refundNumber}</strong></td>
                          <td>
                            <button
                              type="button"
                              className="link-button"
                              style={{ fontWeight: 800, textDecoration: "underline", color: "#785038" }}
                              onClick={() => void openInvoiceDetails(r.invoiceNumber)}
                            >
                              #{r.invoiceNumber} 🔍
                            </button>
                          </td>
                          <td><strong>{r.customerName || "عميل نقدي"}</strong></td>
                          <td>{getMethodBadge(r.refundMethod)}</td>
                          <td><code>{formatDateTime(r.createdAt)}</code></td>
                          <td><strong style={{ color: "#b94d3f" }}>-{money(r.totalRefundPiasters)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!employeeStats.refundsList?.length && <Empty text="لم يتم إجراء أي مرتجعات على فواتير هذا الموظف حتى الآن." />}
                </div>
              </div>

              <div>
                <h3 style={{ fontSize: "15px", marginBottom: "10px", color: "#34231c", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>🏷️</span> سجل الخصومات التي منحها الموظف ({employeeStats.discountsGiven.length})
                </h3>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>الفاتورة</th>
                        <th>العميل</th>
                        <th>التاريخ والوقت</th>
                        <th>قيمة الخصم</th>
                        <th>إجمالي الفاتورة الصافي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employeeStats.discountsGiven.map((d, idx) => (
                        <tr key={idx}>
                          <td>
                            <button
                              type="button"
                              className="link-button"
                              style={{ fontWeight: 800, textDecoration: "underline", color: "#785038" }}
                              onClick={() => void openInvoiceDetails(d.invoiceNumber)}
                            >
                              #{d.invoiceNumber} 🔍
                            </button>
                          </td>
                          <td><strong>{d.customerName || "عميل نقدي"}</strong></td>
                          <td><code>{formatDateTime(d.createdAt)}</code></td>
                          <td><strong style={{ color: "#b94d3f" }}>-{money(d.discountPiasters)}</strong></td>
                          <td><strong>{money(d.totalPiasters)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!employeeStats.discountsGiven.length && <Empty text="لم يمنح هذا الموظف أي خصومات على الفواتير حتى الآن." />}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {selectedInvoiceNumber !== null && (
        <div
          className="variant-picker-overlay print-hide"
          style={{ zIndex: 3000 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedInvoiceNumber(null);
          }}
        >
          <section className="invoice-details-dialog" role="dialog" aria-modal="true" aria-label={`تفاصيل الفاتورة #${selectedInvoiceNumber}`} style={{ position: "relative", zIndex: 3001 }}>
            <div className="invoice-details-header">
              <div>
                <h2>تفاصيل الفاتورة #{selectedInvoiceNumber}</h2>
                {invoiceDetail && (
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#8b7b70" }}>
                    تمت في {formatDateTime(invoiceDetail.createdAt)} · بواسطة {invoiceDetail.sellerName}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="sheet-close"
                aria-label="إغلاق"
                onClick={() => setSelectedInvoiceNumber(null)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {loadingInvoiceDetail && <div className="empty"><p>جارٍ تحميل تفاصيل الفاتورة…</p></div>}
            {invoiceDetailError && <div className="message error">{invoiceDetailError}</div>}

            {invoiceDetail && (
              <div>
                <div className="invoice-details-grid">
                  <div><small>رقم الفاتورة</small><strong>#{invoiceDetail.invoiceNumber}</strong></div>
                  <div><small>الحالة</small><strong>{invoiceDetail.status === "COMPLETED" ? "مكتملة" : "ملغاة"}</strong></div>
                  {invoiceDetail.onlineOrderNumber && (
                    <div><small>نوع الفاتورة</small><strong style={{ color: "#854d0e" }}>📦 طلب أونلاين #{invoiceDetail.onlineOrderNumber}</strong></div>
                  )}
                  <div><small>الموظف البائع</small><strong>{invoiceDetail.sellerName}</strong></div>
                  <div><small>العميل</small><strong>{invoiceDetail.customerName || "عميل نقدي"}</strong></div>
                  {invoiceDetail.customerPhone && <div><small>رقم هاتف العميل</small><strong>{invoiceDetail.customerPhone}</strong></div>}
                  {invoiceDetail.notes && <div style={{ gridColumn: "1 / -1" }}><small>ملاحظات</small><strong>{invoiceDetail.notes}</strong></div>}
                </div>

                <h3 style={{ fontSize: "15px", marginBottom: "10px", color: "#34231c" }}>المنتجات والأصناف وتفاصيل الخصم لكل منتج</h3>
                <div className="table-wrap" style={{ marginBottom: "18px" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>المنتج / المتغير</th>
                        <th>المخزن</th>
                        <th>الكمية</th>
                        <th>السعر الأصلي</th>
                        <th>الخصم على الصنف</th>
                        <th>المجموع الصافي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceDetail.items.map((item, index) => {
                        const variantText = [item.color, item.size ? `مقاس ${item.size}` : ""].filter(Boolean).join(" · ");
                        const itemDiscountTotal = item.discountEachPiasters * item.quantity;
                        return (
                          <tr key={index}>
                            <td>
                              <strong>{item.nameSnapshot}</strong>
                              {variantText && <small style={{ display: "block", color: "#785038" }}>{variantText}</small>}
                            </td>
                            <td>{item.warehouseName}</td>
                            <td><strong>{item.quantity}</strong></td>
                            <td>{money(item.sellPricePiasters)}</td>
                            <td style={{ color: itemDiscountTotal > 0 ? "#b94d3f" : "inherit", fontWeight: itemDiscountTotal > 0 ? 700 : 400 }}>
                              {itemDiscountTotal > 0 ? `-${money(itemDiscountTotal)}` : "—"}
                            </td>
                            <td><strong>{money(item.lineTotalPiasters)}</strong></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="sheet-totals" style={{ marginTop: "0" }}>
                  {(invoiceDetail.shippingFeePiasters || 0) > 0 ? (
                    <>
                      <div className="total"><span>إجمالي المنتجات</span><strong>{money(invoiceDetail.subtotalPiasters - (invoiceDetail.shippingFeePiasters || 0))}</strong></div>
                      <div className="total"><span>مصاريف الشحن</span><strong>+{money(invoiceDetail.shippingFeePiasters || 0)}</strong></div>
                    </>
                  ) : (
                    <div className="total"><span>المجموع الفرعي (قبل الخصم)</span><strong>{money(invoiceDetail.subtotalPiasters)}</strong></div>
                  )}
                  {(invoiceDetail.extraDiscountPiasters || 0) > 0 && (
                    <>
                      {invoiceDetail.discountPiasters - (invoiceDetail.extraDiscountPiasters || 0) > 0 && (
                        <div className="total" style={{ color: "#b94d3f" }}><span>خصم القطع</span><strong>-{money(invoiceDetail.discountPiasters - (invoiceDetail.extraDiscountPiasters || 0))}</strong></div>
                      )}
                      <div className="total" style={{ color: "#b94d3f" }}><span>خصم الفاتورة</span><strong>-{money(invoiceDetail.extraDiscountPiasters || 0)}</strong></div>
                    </>
                  )}
                  {invoiceDetail.discountPiasters > 0 && (
                    <div className="total" style={{ color: "#b94d3f" }}><span>إجمالي الخصم الممنوح</span><strong>-{money(invoiceDetail.discountPiasters)}</strong></div>
                  )}
                  <div className="total grand"><span>إجمالي الفاتورة النهائي</span><strong>{money(invoiceDetail.totalPiasters)}</strong></div>
                  <div className="divider" style={{ margin: "10px 0" }} />
                  {(invoiceDetail.depositPiasters || 0) > 0 ? (
                    <>
                      <div className="total" style={{ color: "#1b5e20" }}><span>العربون المدفوع</span><strong>{money(invoiceDetail.depositPiasters || 0)}</strong></div>
                      <div className="total" style={{ color: "#b94d3f", fontWeight: "bold" }}><span>المطلوب عند الاستلام</span><strong>{money(Math.max(0, invoiceDetail.totalPiasters - (invoiceDetail.depositPiasters || 0)))}</strong></div>
                    </>
                  ) : invoiceDetail.onlineOrderNumber ? (
                    <div className="total" style={{ color: "#b94d3f", fontWeight: "bold" }}><span>المطلوب عند الاستلام</span><strong>{money(invoiceDetail.totalPiasters)}</strong></div>
                  ) : (
                    <>
                      {invoiceDetail.paidCashPiasters > 0 && <div className="total"><span>المدفوع نقدي</span><strong>{money(invoiceDetail.paidCashPiasters)}</strong></div>}
                      {invoiceDetail.paidInstapayPiasters > 0 && <div className="total"><span>المدفوع إنستاباي</span><strong>{money(invoiceDetail.paidInstapayPiasters)}</strong></div>}
                      {invoiceDetail.paidWalletPiasters > 0 && <div className="total"><span>المدفوع محفظة</span><strong>{money(invoiceDetail.paidWalletPiasters)}</strong></div>}
                      {invoiceDetail.remainingPiasters > 0 && <div className="total" style={{ color: "#b94d3f" }}><span>المتبقي (آجل)</span><strong>{money(invoiceDetail.remainingPiasters)}</strong></div>}
                    </>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
                  <button type="button" className="secondary" onClick={() => setThermalReceiptDetail(invoiceDetail)}>طباعة الفاتورة 🖨️</button>
                  <button type="button" className="primary" onClick={() => setSelectedInvoiceNumber(null)}>إغلاق</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {thermalReceiptDetail !== null && (
        <ThermalReceiptModal
          invoiceDetail={thermalReceiptDetail}
          onClose={() => setThermalReceiptDetail(null)}
        />
      )}
    </div>
  );
}

function DailyAttendance({ session, onGoToPos }: { session: Session; onGoToPos?: () => void }) {
  const [date, setDate] = useState(() => getTodayCairoDate());
  const [attendanceList, setAttendanceList] = useState<DailyEmployeeAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  async function handleSendDailyReport() {
    setSendingTelegram(true);
    setError("");
    setNotice("");
    try {
      const res = await invoke<string>("send_daily_report_to_telegram", {
        token: session.token,
        date: date || null,
      });
      setNotice(res);
    } catch (cause: unknown) {
      setError(String(cause));
    } finally {
      setSendingTelegram(false);
    }
  }
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "NOT_ATTENDED" | "PRESENT" | "COMPLETED">("ALL");

  function getLiveTimeStr() {
    const d = new Date();
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, "0");
    const s = String(d.getSeconds()).padStart(2, "0");
    const p = h >= 12 ? "م" : "ص";
    h = h % 12 || 12;
    return `${h}:${m}:${s} ${p}`;
  }

  const [currentTime, setCurrentTime] = useState(() => getLiveTimeStr());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getLiveTimeStr());
      // Auto-update to current date if day has changed while app was left open
      const today = getTodayCairoDate();
      setDate((currentDate) => {
        // If current date was yesterday's auto date, advance it
        const yesterday = new Date(Date.now() - 86400000);
        const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
        if (currentDate === yStr) return today;
        return currentDate;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadAttendance = useCallback(async (selectedDate: string) => {
    setLoading(true);
    setError("");
    try {
      const data = await invoke<DailyEmployeeAttendance[]>("get_daily_attendance", {
        token: session.token,
        date: selectedDate,
      });
      setAttendanceList(data);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setLoading(false);
    }
  }, [session.token]);

  useEffect(() => {
    void loadAttendance(date);
  }, [date, loadAttendance]);

  async function handleCheckIn(emp: DailyEmployeeAttendance) {
    if (!window.confirm(`هل أنت متأكد من تسجيل حضور الموظف "${emp.name}" في الوردية الآن؟`)) return;
    setActionLoading(emp.employeeId);
    setError("");
    setNotice("");
    try {
      await invoke("check_in_employee", {
        token: session.token,
        employeeId: emp.employeeId,
      });
      setNotice(`تم إثبات حضور الموظف "${emp.name}" بنجاح.`);
      await loadAttendance(date);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCheckOut(emp: DailyEmployeeAttendance) {
    if (!window.confirm(`هل أنت متأكد من تسجيل انصراف الموظف "${emp.name}" وإنهاء الوردية الآن؟`)) return;
    setActionLoading(emp.employeeId);
    setError("");
    setNotice("");
    try {
      await invoke("check_out_employee", {
        token: session.token,
        employeeId: emp.employeeId,
      });
      setNotice(`تم إثبات انصراف الموظف "${emp.name}" بنجاح.`);
      await loadAttendance(date);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleResetAttendance(emp: DailyEmployeeAttendance) {
    if (!window.confirm(`هل تريد إعادة فتح الوردية وإلغاء تسجيل حضور/انصراف الموظف "${emp.name}" لهذا اليوم؟\nسيعود الموظف لحالة "لم يحضر" ليتسنى تسجيل حضوره مجدداً.`)) return;
    setActionLoading(emp.employeeId);
    setError("");
    setNotice("");
    try {
      await invoke("reset_employee_attendance", {
        token: session.token,
        employeeId: emp.employeeId,
        date,
      });
      setNotice(`تمت إعادة فتح الوردية وتجديد حالة الموظف "${emp.name}".`);
      await loadAttendance(date);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleOvertimePaid(emp: DailyEmployeeAttendance) {
    setActionLoading(emp.employeeId);
    setError("");
    setNotice("");
    try {
      const nextPaid = await invoke<boolean>("toggle_attendance_overtime_paid", {
        token: session.token,
        employeeId: emp.employeeId,
        shiftDate: emp.shiftDate,
      });
      setNotice(nextPaid ? `تم تأكيد محاسبة وصرف ساعات عمل الموظف "${emp.name}" بنجاح.` : `تم إلغاء حالة المحاسبة لساعات عمل الموظف "${emp.name}".`);
      await loadAttendance(date);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setActionLoading(null);
    }
  }

  const isEmployeeTerminal = session.role !== "ADMIN" || Boolean(session.permissions?.includes("main_cashier" as Page));

  const displayList = attendanceList.filter((emp) => {
    // Exclude the cashier account itself from the attendance list
    if (emp.userId && session.userId && emp.userId === session.userId) return false;
    if (session.permissions?.includes("main_cashier" as Page) && emp.name.trim() === session.full_name.trim()) return false;
    return true;
  });

  const totalCount = displayList.length;
  const presentCount = displayList.filter((e) => e.status === "PRESENT").length;
  const completedCount = displayList.filter((e) => e.status === "COMPLETED").length;
  const notAttendedCount = displayList.filter((e) => e.status === "NOT_ATTENDED").length;
  const totalOvertimeMinutes = displayList.reduce((acc, e) => acc + (e.overtimeMinutes || 0), 0);
  const paidOvertimeMinutes = displayList.filter((e) => e.overtimePaid).reduce((acc, e) => acc + (e.overtimeMinutes || 0), 0);

  const filtered = displayList.filter((emp) => {
    const matchesSearch =
      !search.trim() ||
      emp.name.toLowerCase().includes(search.toLowerCase()) ||
      emp.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
      (emp.phone && emp.phone.includes(search));
    const matchesStatus = isEmployeeTerminal || statusFilter === "ALL" || emp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="stack">
      <section className="panel">
        <div className="section-head" style={{ alignItems: "center" }}>
          <div>
            <h2>📋 سجل إثبات الحضور والانصراف</h2>
            <p>{isEmployeeTerminal ? "سجل حضورك وانصرافك في الوردية بضغطة واحدة" : "تسجيل حضور وانصراف الموظفين في الوردية وإرسال تنبيهات التأخير تلقائياً"}</p>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#faf3eb",
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid #ebd8c8",
              fontSize: "13px",
              fontWeight: 700,
              color: "#5c3826"
            }}>
              <span>🕒 الوقت الآن:</span>
              <span style={{ direction: "rtl", unicodeBidi: "isolate" }}>{currentTime}</span>
            </div>
            <label style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", fontWeight: 700 }}>
              تاريخ الوردية:
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ padding: "6px 10px", borderRadius: "8px", fontSize: "13px" }}
              />
            </label>
            <button
              type="button"
              className={date === getTodayCairoDate() ? "primary" : "secondary"}
              onClick={() => setDate(getTodayCairoDate())}
              style={{ fontSize: "12px", padding: "6px 10px" }}
              title="العودة لوردية اليوم الحالي"
            >
              📅 وردية اليوم
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => void loadAttendance(date)}
              disabled={loading}
              style={{ fontSize: "13px", padding: "7px 12px" }}
            >
              🔄 تحديث
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => void handleSendDailyReport()}
              disabled={sendingTelegram}
              style={{
                fontSize: "13px",
                padding: "7px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "#0369a1",
                borderColor: "#bae6fd",
                background: "#f0f9ff",
                fontWeight: 700
              }}
              title="إرسال تقرير اليوم والمبيعات والحضور إلى تليجرام المدير"
            >
              <span>📲</span> {sendingTelegram ? "جارٍ الإرسال..." : "تقرير اليوم لتليجرام"}
            </button>
            {onGoToPos && isPageAllowed(session, "pos") && (
              <button
                type="button"
                className="secondary"
                onClick={onGoToPos}
                style={{
                  fontSize: "13px",
                  padding: "7px 14px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  fontWeight: 700,
                  borderColor: "#785038",
                  color: "#34231c",
                  background: "#fdf8f4"
                }}
                title="الرجوع إلى نقطة البيع (F3)"
              >
                <span>🛒</span>
                <span>نقطة البيع (POS)</span>
                <kbd className="shortcut-hint" style={{ fontSize: "11px", padding: "2px 5px", background: "#f1dfd3", borderRadius: "4px" }}>F3</kbd>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="message error" style={{ marginBottom: "14px" }} role="alert">
            {error}
            <button type="button" onClick={() => setError("")}>×</button>
          </div>
        )}
        {notice && (
          <div className="message success" style={{ marginBottom: "14px" }} role="status">
            {notice}
            <button type="button" onClick={() => setNotice("")}>×</button>
          </div>
        )}

        {/* Stats Row - Hidden for Staff */}
        {!isEmployeeTerminal && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "18px"
          }}>
            <div className="stat" style={{ background: "#fdfbf9", border: "1px solid #ebd8c8", borderRadius: "10px", padding: "12px" }}>
              <span style={{ fontSize: "12px", color: "#786558" }}>👥 إجمالي الموظفين</span>
              <strong style={{ fontSize: "20px", color: "#34231c" }}>{totalCount}</strong>
            </div>
            <div className="stat" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "12px" }}>
              <span style={{ fontSize: "12px", color: "#15803d" }}>🟢 حاضرون بالوردية</span>
              <strong style={{ fontSize: "20px", color: "#166534" }}>{presentCount}</strong>
            </div>
            <div className="stat" style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "12px" }}>
              <span style={{ fontSize: "12px", color: "#b45309" }}>⚪ لم يحضروا بعد</span>
              <strong style={{ fontSize: "20px", color: "#92400e" }}>{notAttendedCount}</strong>
            </div>
            <div className="stat" style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "12px" }}>
              <span style={{ fontSize: "12px", color: "#1d4ed8" }}>🔵 اكتملت ورديتهم</span>
              <strong style={{ fontSize: "20px", color: "#1e40af" }}>{completedCount}</strong>
            </div>
            {totalOvertimeMinutes > 0 && (
              <div className="stat" style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "10px", padding: "12px" }}>
                <span style={{ fontSize: "12px", color: "#b45309" }}>⏰ ساعات إضافية اليوم</span>
                <strong style={{ fontSize: "20px", color: "#92400e" }}>
                  {formatOvertimeDuration(totalOvertimeMinutes)}
                </strong>
                <small style={{ fontSize: "10px", color: "#786558", display: "block", marginTop: "2px" }}>
                  (تم صرف: {formatOvertimeDuration(paidOvertimeMinutes)})
                </small>
              </div>
            )}
          </div>
        )}

        {/* Search Bar and Filters */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: "16px"
        }}>
          <div style={{ flex: "1", minWidth: "240px", maxWidth: isEmployeeTerminal ? "480px" : "360px" }}>
            <input
              type="search"
              placeholder={isEmployeeTerminal ? "🔍 ابحث عن اسمك لتسجيل الحضور أو الانصراف..." : "🔍 بحث باسم الموظف أو الوظيفة..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: isEmployeeTerminal ? "10px 14px" : "8px 12px",
                borderRadius: "8px",
                fontSize: isEmployeeTerminal ? "14px" : "13px",
                border: "1px solid #d5c3b2",
                background: "#faf7f4"
              }}
              autoFocus={isEmployeeTerminal}
            />
          </div>

          {!isEmployeeTerminal && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {[
                ["ALL", `الكل (${totalCount})`],
                ["NOT_ATTENDED", `لم يحضروا (${notAttendedCount})`],
                ["PRESENT", `حاضرون حالياً (${presentCount})`],
                ["COMPLETED", `انصرفوا (${completedCount})`],
              ].map(([val, lbl]) => (
                <button
                  key={val}
                  type="button"
                  className={statusFilter === val ? "primary" : "secondary"}
                  style={{ fontSize: "12px", padding: "6px 12px", fontWeight: 700 }}
                  onClick={() => setStatusFilter(val as typeof statusFilter)}
                >
                  {lbl}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Employees Cards Grid */}
        {loading ? (
          <p style={{ textAlign: "center", padding: "30px", color: "#786558" }}>جارٍ تحميل سجل الحضور...</p>
        ) : filtered.length === 0 ? (
          <Empty text="لا يوجد موظفون مطابقون لخيارات البحث أو الفلتر." />
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "14px"
          }}>
            {filtered.map((emp) => {
              const isWorking = actionLoading === emp.employeeId;
              const hasCheckedIn = Boolean(emp.checkedInAt);
              const hasCheckedOut = Boolean(emp.checkedOutAt);

              return (
                <div
                  key={emp.employeeId}
                  style={{
                    background: "#ffffff",
                    border: emp.status === "PRESENT" ? "2px solid #86efac" : emp.status === "COMPLETED" ? "1px solid #bfdbfe" : "1px solid #e9e1d9",
                    borderRadius: "14px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "14px",
                    boxShadow: emp.status === "PRESENT" ? "0 4px 12px rgba(34, 197, 94, 0.08)" : "0 2px 6px rgba(0,0,0,0.02)",
                    transition: "all 0.2s ease"
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        background: emp.status === "PRESENT" ? "#dcfce7" : emp.status === "COMPLETED" ? "#dbeafe" : "#fef3c7",
                        color: emp.status === "PRESENT" ? "#15803d" : emp.status === "COMPLETED" ? "#1d4ed8" : "#b45309",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: "18px"
                      }}>
                        {emp.name.slice(0, 1)}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#2d1a10" }}>
                          {emp.name}
                        </h3>
                        <span style={{ fontSize: "12px", color: "#786558" }}>
                          {emp.jobTitle} {emp.phone ? `· ${emp.phone}` : ""}
                        </span>
                      </div>
                    </div>

                    {/* Status Pill */}
                    {emp.status === "NOT_ATTENDED" && (
                      <span className="pill neutral" style={{ background: "#fef3c7", color: "#92400e", fontWeight: 700, fontSize: "11px" }}>
                        ⚪ لم يحضر
                      </span>
                    )}
                    {emp.status === "PRESENT" && (
                      <span className="pill success" style={{ background: "#dcfce7", color: "#15803d", fontWeight: 700, fontSize: "11px" }}>
                        🟢 حاضر
                      </span>
                    )}
                    {emp.status === "COMPLETED" && (
                      <span className="pill info" style={{ background: "#dbeafe", color: "#1e40af", fontWeight: 700, fontSize: "11px" }}>
                        🔵 انصرف
                      </span>
                    )}
                  </div>

                  {/* Shift & Attendance Info */}
                  <div style={{
                    background: "#faf7f4",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    fontSize: "12px",
                    color: "#5c493d",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>⏰ الوردية المحددة:</span>
                      <strong style={{ direction: "rtl", unicodeBidi: "isolate" }}>
                        {formatShiftRange(emp.shiftStart, emp.shiftEnd)} ({emp.workHours} س)
                      </strong>
                    </div>

                    {hasCheckedIn && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>✅ وقت الحضور الفعلي:</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <strong style={{ direction: "rtl", unicodeBidi: "isolate" }}>
                            {formatTime12(emp.checkedInAt)}
                          </strong>
                          {emp.lateMinutes > 0 ? (
                            <span style={{ color: "#dc2626", fontWeight: 700, fontSize: "11px" }}>
                              (تأخير {emp.lateMinutes} د)
                            </span>
                          ) : (
                            <span style={{ color: "#16a34a", fontWeight: 600, fontSize: "11px" }}>
                              (في الموعد)
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {hasCheckedOut && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span>🚪 وقت الانصراف الفعلي:</span>
                        <strong style={{ direction: "rtl", unicodeBidi: "isolate" }}>
                          {formatTime12(emp.checkedOutAt)}
                        </strong>
                      </div>
                    )}

                    {Boolean(emp.overtimeMinutes && emp.overtimeMinutes > 0) && (
                      <div
                        style={{
                          marginTop: "4px",
                          padding: "8px 10px",
                          borderRadius: "8px",
                          background: emp.overtimePaid ? "#f0fdf4" : "#fffbeb",
                          border: emp.overtimePaid ? "1px solid #bbf7d0" : "1px solid #fde68a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "14px" }}>⏳</span>
                          <div>
                            <span style={{ fontSize: "11px", color: emp.overtimePaid ? "#166534" : "#92400e", fontWeight: 700, display: "block" }}>
                              ساعات إضافية (Overtime):
                            </span>
                            <strong style={{ fontSize: "12px", color: emp.overtimePaid ? "#15803d" : "#b45309" }}>
                              +{formatOvertimeDuration(emp.overtimeMinutes)} ({emp.overtimeMinutes} دقيقة)
                            </strong>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {emp.overtimePaid ? (
                            <span style={{ background: "#dcfce7", color: "#166534", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
                              ✓ تم التحاسب والصرف
                            </span>
                          ) : (
                            <span style={{ background: "#fef2f2", color: "#b91c1c", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 700 }}>
                              ⏳ معلق (لم يُحاسب)
                            </span>
                          )}

                          {!isEmployeeTerminal && session.role === "ADMIN" && (
                            <button
                              type="button"
                              className="secondary"
                              style={{
                                fontSize: "11px",
                                padding: "3px 8px",
                                fontWeight: 700,
                                color: emp.overtimePaid ? "#6b7280" : "#15803d",
                                borderColor: emp.overtimePaid ? "#d1d5db" : "#86efac",
                                background: "#fff",
                              }}
                              disabled={isWorking}
                              onClick={() => void handleToggleOvertimePaid(emp)}
                              title={emp.overtimePaid ? "إلغاء حالة المحاسبة وجعلها معلقة" : "تأكيد صرف ومحاسبة الساعات الإضافية"}
                            >
                              {emp.overtimePaid ? "↩️ إلغاء" : "💵 تسوية"}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions Button */}
                  <div>
                    {emp.status === "NOT_ATTENDED" && (
                      <button
                        type="button"
                        className="primary"
                        style={{ width: "100%", fontWeight: 700, padding: "10px", fontSize: "14px" }}
                        disabled={isWorking}
                        onClick={() => void handleCheckIn(emp)}
                      >
                        {isWorking ? "جارٍ تسجيل الحضور..." : "✅ إثبات الحضور للموظف"}
                      </button>
                    )}

                    {emp.status === "PRESENT" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <button
                          type="button"
                          className="secondary"
                          style={{
                            width: "100%",
                            fontWeight: 700,
                            padding: "10px",
                            fontSize: "14px",
                            color: "#c2410c",
                            borderColor: "#fdba74",
                            background: "#fff7ed"
                          }}
                          disabled={isWorking}
                          onClick={() => void handleCheckOut(emp)}
                        >
                          {isWorking ? "جارٍ تسجيل الانصراف..." : "🚪 إثبات الانصراف (إنهاء الوردية)"}
                        </button>
                        {!isEmployeeTerminal && (
                          <button
                            type="button"
                            className="secondary"
                            style={{ fontSize: "11px", padding: "4px 8px", color: "#8b7b70" }}
                            disabled={isWorking}
                            onClick={() => void handleResetAttendance(emp)}
                            title="إلغاء تسجيل الحضور لهذا اليوم وإعادة فتح الوردية"
                          >
                            🔄 إلغاء الحضور وإعادة فتح الوردية
                          </button>
                        )}
                      </div>
                    )}

                    {emp.status === "COMPLETED" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        <div style={{
                          textAlign: "center",
                          padding: "8px",
                          background: "#eff6ff",
                          borderRadius: "8px",
                          color: "#1e40af",
                          fontWeight: 700,
                          fontSize: "13px"
                        }}>
                          ✔️ اكتملت الوردية بنجاح
                        </div>
                        {!isEmployeeTerminal && (
                          <button
                            type="button"
                            className="secondary"
                            style={{ fontSize: "11px", padding: "4px 8px", color: "#8b7b70" }}
                            disabled={isWorking}
                            onClick={() => void handleResetAttendance(emp)}
                            title="إلغاء تسجيل الحضور والانصراف لهذا اليوم وتجديد الوردية للموظف"
                          >
                            🔄 تجديد / إعادة فتح الوردية اليوم
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

const POS_DRAFT_STORAGE_KEY = "morsi_pos_draft_v1";

interface PosDraftData {
  cart: CartLine[];
  sellerEmployeeId?: string;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  cash?: string;
  instapay?: string;
  wallet?: string;
  editPrice?: boolean;
  editName?: boolean;
  showSecretMetrics?: boolean;
  invoiceDiscountType?: "FIXED" | "PERCENT";
  invoiceDiscountValue?: string;
  method?: string;
  creditPaymentMethod?: string;
  paymentEdited?: boolean;
  sheetOpen?: boolean;
}

function loadPosDraft(): PosDraftData {
  try {
    const raw = localStorage.getItem(POS_DRAFT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.cart)) {
        return {
          ...parsed,
          cart: parsed.cart.filter((l: any) => l && l.product && typeof l.quantity === "number"),
        };
      }
    }
  } catch (e) {
    console.error("Failed to load POS draft:", e);
  }
  return { cart: [] };
}

const CATALOG_PAGE_SIZE = 24;

function CatalogPagination({ totalItems, page, onPageChange }: { totalItems: number; page: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / CATALOG_PAGE_SIZE));
  if (totalPages <= 1) return null;
  const firstItem = (page - 1) * CATALOG_PAGE_SIZE + 1;
  const lastItem = Math.min(page * CATALOG_PAGE_SIZE, totalItems);

  return <nav className="pagination" aria-label="صفحات المنتجات" style={{ flexWrap: "wrap", gap: "12px" }}>
    <span>عرض {firstItem}–{lastItem} من {totalItems} منتج</span>
    <div className="pagination-buttons">
      <button type="button" disabled={page === 1} onClick={() => onPageChange(1)}>الأولى</button>
      <button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)}>السابق</button>
      <span aria-live="polite">{page} / {totalPages}</span>
      <button type="button" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>التالي</button>
      <button type="button" disabled={page === totalPages} onClick={() => onPageChange(totalPages)}>الأخيرة</button>
    </div>
  </nav>;
}

function playScanBeep(success: boolean) {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (success) {
      osc.type = "sine";
      osc.frequency.setValueAtTime(1750, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.08);
    } else {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.18);
    }
  } catch {}
}

function getNormalizedChar(e: KeyboardEvent): string | null {
  if (e.key === "Enter") return null;
  // If e.code is Digit0-9
  if (e.code && e.code.startsWith("Digit") && e.code.length === 6) {
    return e.code.slice(5);
  }
  // If e.code is Numpad0-9
  if (e.code && e.code.startsWith("Numpad") && e.code.length === 7) {
    return e.code.slice(6);
  }
  // If e.code is KeyA-Z
  if (e.code && e.code.startsWith("Key") && e.code.length === 4) {
    return e.code.slice(3).toUpperCase();
  }
  if (e.code === "Minus" || e.key === "-") return "-";
  if (e.code === "Period" || e.key === ".") return ".";
  if (e.code === "Slash" || e.key === "/") return "/";
  if (e.code === "Space" || e.key === " ") return " ";

  // Arabic Indic digits fallback (٠١٢٣٤٥٦٧٨٩)
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const idx = arabicDigits.indexOf(e.key);
  if (idx !== -1) return String(idx);

  // Standard alphanumeric single character
  if (e.key && e.key.length === 1 && /^[a-zA-Z0-9\-\.\s]$/.test(e.key)) {
    return e.key.toUpperCase();
  }
  return null;
}

function Pos({ active = true, products, employees, customerChoices, session, busy, save }: { active?: boolean; products: Product[]; employees: Employee[]; customerChoices: CustomerChoice[]; session: Session; busy: boolean; save: (value: unknown, done: (invoiceNumber?: number) => void) => void }) {
  const [initialDraft] = useState<PosDraftData>(() => loadPosDraft());
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [categoryFilter, setCategoryFilter] = useState("الكل");
  const [catalogPage, setCatalogPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(() => Boolean(initialDraft.sheetOpen));
  const [selectedProduct, setSelectedProduct] = useState<ProductGroup | null>(null);
  const [cart, setCart] = useState<CartLine[]>(() => {
    const lines = initialDraft.cart || [];
    if (!lines.length || !products.length) return lines;
    return lines.map((line) => {
      const match = products.find(
        (p) =>
          p.productId === line.product.productId &&
          p.variantId === line.product.variantId &&
          p.warehouseId === line.product.warehouseId
      );
      if (match) {
        return {
          ...line,
          product: match,
          quantity: Math.min(line.quantity, Math.max(1, match.quantity)),
        };
      }
      return line;
    });
  });
  const [completedInvoice, setCompletedInvoice] = useState<InvoiceDetailView | null>(null);

  const processBarcodeRef = useRef<(code?: string) => boolean>(() => false);
  const scannerBufferRef = useRef<string>("");
  const scannerTimingRef = useRef<number[]>([]);
  const lastKeyTimeRef = useRef<number>(0);
  const activeInputPreScanRef = useRef<{ element: HTMLInputElement | HTMLTextAreaElement; value: string; selectionStart: number | null } | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    function handlePosKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (selectedProduct) {
          e.preventDefault();
          setSelectedProduct(null);
          return;
        } else if (sheetOpen) {
          e.preventDefault();
          setSheetOpen(false);
          return;
        }
      } else if (e.key === "F2") {
        if (cart.length > 0) {
          e.preventDefault();
          setSheetOpen(true);
          return;
        }
      } else if (e.key === "F8") {
        e.preventDefault();
        newInvoice();
        return;
      } else if ((e.ctrlKey || e.metaKey) && (e.code === "KeyF" || e.key.toLowerCase() === "f" || e.key === "ب")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (cart.length > 0) {
          e.preventDefault();
          if (!sheetOpen) {
            setSheetOpen(true);
          } else {
            const form = document.querySelector(".sheet-body form, .invoice-sheet form") as HTMLFormElement | null;
            form?.requestSubmit();
          }
          return;
        }
      }

      // Barcode Scanner Global Detection
      const target = e.target as HTMLElement | null;
      const isInput = Boolean(target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA"));
      const isBarcodeField = target === searchInputRef.current || target === sheetBarcodeInputRef.current;

      if (e.key === "Enter") {
        const buffer = scannerBufferRef.current.trim();
        const timings = scannerTimingRef.current;
        const count = timings.length;
        const totalDuration = count > 1 ? timings[count - 1] - timings[0] : 999;
        const avgInterval = count > 1 ? totalDuration / (count - 1) : 999;
        const isFastBurst = count >= 3 && avgInterval < 65;
        const isOutsideInput = !isInput;

        if (isFastBurst || (isOutsideInput && buffer.length >= 2)) {
          e.preventDefault();
          e.stopPropagation();

          if (activeInputPreScanRef.current && activeInputPreScanRef.current.element === target) {
            const { element, value, selectionStart } = activeInputPreScanRef.current;
            element.value = value;
            if (selectionStart !== null) element.setSelectionRange(selectionStart, selectionStart);
            element.dispatchEvent(new Event("input", { bubbles: true }));
          }

          scannerBufferRef.current = "";
          scannerTimingRef.current = [];
          activeInputPreScanRef.current = null;
          if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

          processBarcodeRef.current(buffer);
          return;
        }

        if (isBarcodeField && buffer.length > 0) {
          scannerBufferRef.current = "";
          scannerTimingRef.current = [];
          activeInputPreScanRef.current = null;
          return;
        }

        scannerBufferRef.current = "";
        scannerTimingRef.current = [];
        activeInputPreScanRef.current = null;
        return;
      }

      if (e.ctrlKey || e.altKey || e.metaKey || e.key.length > 1) {
        return;
      }

      const char = getNormalizedChar(e);
      if (!char) return;

      const now = performance.now();
      const diff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (diff > 85) {
        scannerBufferRef.current = char;
        scannerTimingRef.current = [now];
        if (isInput && !isBarcodeField) {
          activeInputPreScanRef.current = {
            element: target as HTMLInputElement,
            value: (target as HTMLInputElement).value,
            selectionStart: (target as HTMLInputElement).selectionStart,
          };
        } else {
          activeInputPreScanRef.current = null;
        }
      } else {
        scannerBufferRef.current += char;
        scannerTimingRef.current.push(now);

        if (isInput && !isBarcodeField && scannerTimingRef.current.length >= 2 && diff < 50) {
          e.preventDefault();
          if (activeInputPreScanRef.current && activeInputPreScanRef.current.element === target) {
            (target as HTMLInputElement).value = activeInputPreScanRef.current.value;
            (target as HTMLInputElement).dispatchEvent(new Event("input", { bubbles: true }));
          }
        }
      }

      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      resetTimerRef.current = window.setTimeout(() => {
        scannerBufferRef.current = "";
        scannerTimingRef.current = [];
        activeInputPreScanRef.current = null;
      }, 300);
    }
    window.addEventListener("keydown", handlePosKeyDown, true);
    return () => window.removeEventListener("keydown", handlePosKeyDown, true);
  }, [active, selectedProduct, sheetOpen, cart.length]);

  const [sellerEmployeeId, setSellerEmployeeId] = useState(() => initialDraft.sellerEmployeeId || "");
  const [customerName, setCustomerName] = useState(() => initialDraft.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(() => initialDraft.customerPhone || "");
  const [notes, setNotes] = useState(() => initialDraft.notes || "");
  const [cash, setCash] = useState(() => initialDraft.cash || "");
  const [instapay, setInstapay] = useState(() => initialDraft.instapay || "");
  const [wallet, setWallet] = useState(() => initialDraft.wallet || "");
  const [editPrice, setEditPrice] = useState(() => Boolean(initialDraft.editPrice));
  const [editName, setEditName] = useState(() => Boolean(initialDraft.editName));
  const [showSecretMetrics, setShowSecretMetrics] = useState(() => Boolean(initialDraft.showSecretMetrics));
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<"FIXED" | "PERCENT">(() => initialDraft.invoiceDiscountType || "FIXED");
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState<string>(() => initialDraft.invoiceDiscountValue || "");
  const [method, setMethod] = useState(() => initialDraft.method || "CASH");
  const [creditPaymentMethod, setCreditPaymentMethod] = useState(() => initialDraft.creditPaymentMethod || "CASH");
  const [paymentEdited, setPaymentEdited] = useState(() => Boolean(initialDraft.paymentEdited));
  const [lastAdded, setLastAdded] = useState("");
  const [sheetBarcode, setSheetBarcode] = useState("");
  const [sheetBarcodeFeedback, setSheetBarcodeFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const sheetBarcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sheetOpen) {
      const t = setTimeout(() => {
        sheetBarcodeInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(t);
    }
  }, [sheetOpen]);

  // Sync cart product rows with latest products data
  useEffect(() => {
    if (!products.length) return;
    setCart((current) => {
      let changed = false;
      const updated = current.map((line) => {
        const match = products.find(
          (p) =>
            p.productId === line.product.productId &&
            p.variantId === line.product.variantId &&
            p.warehouseId === line.product.warehouseId
        );
        if (match) {
          const clamped = Math.min(line.quantity, Math.max(1, match.quantity));
          if (clamped !== line.quantity || match !== line.product) {
            changed = true;
            return { ...line, product: match, quantity: clamped };
          }
        }
        return line;
      });
      return changed ? updated : current;
    });
  }, [products]);

  // Persist invoice draft to localStorage
  useEffect(() => {
    if (cart.length > 0 || customerName || customerPhone || notes) {
      try {
        const draft: PosDraftData = {
          cart,
          sellerEmployeeId,
          customerName,
          customerPhone,
          notes,
          cash,
          instapay,
          wallet,
          editPrice,
          editName,
          showSecretMetrics,
          invoiceDiscountType,
          invoiceDiscountValue,
          method,
          creditPaymentMethod,
          paymentEdited,
          sheetOpen,
        };
        localStorage.setItem(POS_DRAFT_STORAGE_KEY, JSON.stringify(draft));
        window.dispatchEvent(new Event("morsi_pos_cart_updated"));
      } catch (err) {
        console.error("Error saving POS draft:", err);
      }
    } else {
      try {
        localStorage.removeItem(POS_DRAFT_STORAGE_KEY);
        window.dispatchEvent(new Event("morsi_pos_cart_updated"));
      } catch (err) {
        console.error("Error removing POS draft:", err);
      }
    }
  }, [
    cart,
    sellerEmployeeId,
    customerName,
    customerPhone,
    notes,
    cash,
    instapay,
    wallet,
    editPrice,
    editName,
    showSecretMetrics,
    invoiceDiscountType,
    invoiceDiscountValue,
    method,
    creditPaymentMethod,
    paymentEdited,
    sheetOpen,
  ]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const lineDiscount = cart.reduce((sum, item) => sum + item.discount * item.quantity, 0);
  const subtotalAfterLineDiscounts = Math.max(0, subtotal - lineDiscount);

  const extraDiscountPiasters = useMemo(() => {
    const rawVal = Number(invoiceDiscountValue) || 0;
    if (rawVal <= 0) return 0;
    if (invoiceDiscountType === "PERCENT") {
      const pct = Math.min(100, Math.max(0, rawVal));
      return Math.round((subtotalAfterLineDiscounts * pct) / 100);
    }
    return Math.min(subtotalAfterLineDiscounts, Math.max(0, piastres(invoiceDiscountValue)));
  }, [invoiceDiscountType, invoiceDiscountValue, subtotalAfterLineDiscounts]);

  const discount = lineDiscount + extraDiscountPiasters;
  const total = Math.max(0, subtotal - discount);
  const paid = piastres(cash) + piastres(instapay) + piastres(wallet);
  const cost = cart.reduce((sum, item) => sum + item.product.buyPricePiasters * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const groupedProducts = groupProductRows(products);
  const categories = ["الكل", ...new Set(groupedProducts.map((product) => product.category))];
  const filtered = groupedProducts.filter((product) => {
    const matchesCategory = categoryFilter === "الكل" || product.category === categoryFilter;
    const searchable = [product.name, product.barcode, ...product.colors, ...product.sizes].join(" ");
    return matchesCategory && searchable.toLowerCase().includes(search.toLowerCase().trim());
  });
  const validCatalogPage = Math.min(catalogPage, Math.max(1, Math.ceil(filtered.length / CATALOG_PAGE_SIZE)));
  const visibleProducts = filtered.slice((validCatalogPage - 1) * CATALOG_PAGE_SIZE, validCatalogPage * CATALOG_PAGE_SIZE);

  useEffect(() => {
    if (paymentEdited) return;
    const amount = (Math.max(0, total) / 100).toFixed(2);
    if (method === "CASH") setCash(amount);
    if (method === "INSTAPAY") setInstapay(amount);
    if (method === "WALLET") setWallet(amount);
  }, [total, method, paymentEdited]);

  function choosePaymentMethod(nextMethod: string) {
    setMethod(nextMethod);
    if (nextMethod === "CREDIT") setCreditPaymentMethod("CASH");
    setPaymentEdited(false);
    setCash(nextMethod === "CASH" ? (Math.max(0, total) / 100).toFixed(2) : "");
    setInstapay(nextMethod === "INSTAPAY" ? (Math.max(0, total) / 100).toFixed(2) : "");
    setWallet(nextMethod === "WALLET" ? (Math.max(0, total) / 100).toFixed(2) : "");
  }

  function chooseCreditPaymentMethod(nextMethod: string) {
    const amount = cash || instapay || wallet;
    setCreditPaymentMethod(nextMethod);
    setCash(nextMethod === "CASH" ? amount : "");
    setInstapay(nextMethod === "INSTAPAY" ? amount : "");
    setWallet(nextMethod === "WALLET" ? amount : "");
  }

  function add(product: Product) {
    if (product.quantity < 1) return;
    setCart((current) => {
      const index = current.findIndex(
        (line) =>
          line.product.productId === product.productId &&
          line.product.variantId === product.variantId &&
          line.product.warehouseId === product.warehouseId &&
          (line.product.color || "") === (product.color || "") &&
          (line.product.size || "") === (product.size || "")
      );
      if (index < 0) return [...current, { product, quantity: 1, price: product.sellPricePiasters, discount: 0, name: product.name }];
      return current.map((line, i) => i === index ? { ...line, quantity: Math.min(line.quantity + 1, product.quantity) } : line);
    });
    setLastAdded(product.name + (product.color || product.size ? " — " + (product.color || "") + (product.color && product.size ? " / " : "") + (product.size || "") : ""));
    setSearch("");
    setSheetOpen(true);
  }

  function chooseProduct(product: ProductGroup) {
    const available = product.rows.filter((row) => row.quantity > 0);
    if (available.length === 1) {
      add(available[0]);
    } else if (available.length > 1) {
      setSelectedProduct(product);
    }
  }

  function update(index: number, value: Partial<CartLine>) {
    setCart((current) => current.map((line, i) => i === index ? { ...line, ...value } : line));
  }

  function clear() {
    setCart([]);
    setSelectedProduct(null);
    setSellerEmployeeId("");
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
    setCash("");
    setInstapay("");
    setWallet("");
    setMethod("CASH");
    setCreditPaymentMethod("CASH");
    setPaymentEdited(false);
    setEditPrice(false);
    setEditName(false);
    setInvoiceDiscountType("FIXED");
    setInvoiceDiscountValue("");
    setLastAdded("");
    setSheetBarcode("");
    setSheetBarcodeFeedback(null);
    try {
      localStorage.removeItem(POS_DRAFT_STORAGE_KEY);
      window.dispatchEvent(new Event("morsi_pos_cart_updated"));
    } catch {}
  }

  function processBarcode(rawCode?: string): boolean {
    let code = (rawCode !== undefined ? rawCode : sheetBarcode).trim();
    if (!code) return false;

    // Handle Code 39 leading/trailing asterisks if transmitted by scanner
    if (code.length > 2 && code.startsWith("*") && code.endsWith("*")) {
      code = code.slice(1, -1).trim();
    }

    // 1. Check exact variant barcode match (in stock)
    const exactVariant = products.find(
      (p) => p.barcode && p.barcode.trim().toLowerCase() === code.toLowerCase() && p.quantity > 0
    );
    if (exactVariant) {
      add(exactVariant);
      setSheetBarcode("");
      setSearch("");
      playScanBeep(true);
      setSheetBarcodeFeedback({
        type: "success",
        text: `تمت إضافة: "${exactVariant.name}" ${exactVariant.color || exactVariant.size ? `(${[exactVariant.color, exactVariant.size].filter(Boolean).join(" / ")})` : ""}`,
      });
      setTimeout(() => setSheetBarcodeFeedback(null), 3500);
      return true;
    }

    // 2. Check grouped product barcode match
    const exactGroup = groupedProducts.find(
      (product) => product.barcode && product.barcode.trim().toLowerCase() === code.toLowerCase()
    );
    if (exactGroup) {
      const available = exactGroup.rows.filter((row) => row.quantity > 0);
      if (available.length === 1) {
        add(available[0]);
        setSheetBarcode("");
        setSearch("");
        playScanBeep(true);
        setSheetBarcodeFeedback({ type: "success", text: `تمت إضافة: "${available[0].name}"` });
        setTimeout(() => setSheetBarcodeFeedback(null), 3500);
        return true;
      } else if (available.length > 1) {
        setSelectedProduct(exactGroup);
        setSheetBarcode("");
        setSearch("");
        playScanBeep(true);
        setSheetBarcodeFeedback(null);
        return true;
      } else {
        playScanBeep(false);
        setSheetBarcodeFeedback({ type: "error", text: `المنتج "${exactGroup.name}" نفد من المخزن بالكامل` });
        setTimeout(() => setSheetBarcodeFeedback(null), 4000);
        return false;
      }
    }

    // 3. Fallback: Match by Product ID (e.g. if code is P1002 or 1002 from generated stickers)
    const pidMatch = code.match(/^[pP]?(\d+)$/);
    if (pidMatch) {
      const pid = parseInt(pidMatch[1], 10);
      const exactVariantById = products.find((p) => p.productId === pid && p.quantity > 0);
      if (exactVariantById) {
        const groupById = groupedProducts.find((g) => g.productId === pid);
        if (groupById) {
          const avail = groupById.rows.filter((r) => r.quantity > 0);
          if (avail.length === 1) {
            add(avail[0]);
            setSheetBarcode("");
            setSearch("");
            playScanBeep(true);
            setSheetBarcodeFeedback({ type: "success", text: `تمت إضافة: "${avail[0].name}"` });
            setTimeout(() => setSheetBarcodeFeedback(null), 3500);
            return true;
          } else if (avail.length > 1) {
            setSelectedProduct(groupById);
            setSheetBarcode("");
            setSearch("");
            playScanBeep(true);
            setSheetBarcodeFeedback(null);
            return true;
          }
        }
      }
    }

    // 4. Out of stock check
    const outOfStock = products.find(
      (p) => p.barcode && p.barcode.trim().toLowerCase() === code.toLowerCase()
    );
    if (outOfStock) {
      playScanBeep(false);
      setSheetBarcodeFeedback({ type: "error", text: `المنتج "${outOfStock.name}" غير متوفر حالياً (الكمية 0)` });
      setTimeout(() => setSheetBarcodeFeedback(null), 4000);
      return false;
    }

    // 5. Exact name match fallback (if typed by product name)
    const nameMatches = groupedProducts.filter(
      (product) => product.name.trim().toLowerCase() === code.toLowerCase()
    );
    if (nameMatches.length === 1) {
      chooseProduct(nameMatches[0]);
      setSheetBarcode("");
      setSearch("");
      playScanBeep(true);
      setSheetBarcodeFeedback(null);
      return true;
    }

    // 6. Not found
    playScanBeep(false);
    setSheetBarcodeFeedback({ type: "error", text: `لم يتم العثور على أي منتج بالباركود: ${code}` });
    setTimeout(() => setSheetBarcodeFeedback(null), 4000);
    return false;
  }

  processBarcodeRef.current = processBarcode;

  function handleAddByBarcode() {
    processBarcode();
  }

  function newInvoice() {
    if (cart.length > 0 && !window.confirm("بدء فاتورة جديدة ومسح الفاتورة الحالية؟")) return;
    clear();
    setSheetOpen(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!cart.length) return;
    save({
      employeeId: sellerEmployeeId ? Number(sellerEmployeeId) : null,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      notes: notes || null,
      extraDiscountPiasters: extraDiscountPiasters > 0 ? extraDiscountPiasters : null,
      paidCashPiasters: piastres(cash),
      paidInstapayPiasters: piastres(instapay),
      paidWalletPiasters: piastres(wallet),
      lines: cart.map((line) => ({
        productId: line.product.productId,
        variantId: line.product.variantId,
        warehouseId: line.product.warehouseId,
        quantity: line.quantity,
        sellPricePiasters: line.price,
        nameOverride: line.name === line.product.name ? null : line.name,
        discountEachPiasters: line.discount,
      })),
    }, async (invoiceNumber?: number) => {
      clear();
      setSheetOpen(false);
      if (invoiceNumber) {
        try {
          const detail = await invoke<InvoiceDetailView>("get_invoice_details", {
            token: session.token,
            invoiceNumber,
          });
          if (detail) {
            setCompletedInvoice(detail);
          }
        } catch (e) {
          console.error("Failed to load invoice receipt", e);
        }
      }
    });
  }

  return <div className="pos-page">
    <section className="panel catalog-panel">
      <div className="catalog-header">
        <div>
          <h2>كل المنتجات</h2>
          <p>اختار المنتج بضغطة واحدة، وهيتضاف للفاتورة الحالية.</p>
        </div>
        <div className="catalog-actions">
          {itemCount > 0 && <button className="secondary current-invoice" type="button" title="اختصار: F2" onClick={() => setSheetOpen(true)}>عرض الفاتورة <kbd className="btn-kbd" style={{ background: "#f0e5da", color: "#6a4530", border: "1px solid #dfcfc0" }}>F2</kbd> <span>{itemCount}</span></button>}
          <button className="primary" type="button" title="اختصار: F8" onClick={newInvoice}>+ فاتورة جديدة <kbd className="btn-kbd">F8</kbd></button>
        </div>
      </div>
      <div className="catalog-toolbar">
        {sheetBarcodeFeedback && !sheetOpen && (
          <div className={`sheet-barcode-feedback ${sheetBarcodeFeedback.type}`} style={{ width: "100%", margin: "0 0 10px" }}>
            {sheetBarcodeFeedback.text}
          </div>
        )}
        <input
          ref={searchInputRef}
          className="search full"
          placeholder="ابحث بالاسم أو امسح الباركود بالسكنر من أي مكان… (Ctrl + F)"
          value={search}
          onChange={(event) => {
            const raw = event.target.value;
            setSearch(raw);
            setCatalogPage(1);
            const val = raw.trim();
            if (val) {
              const exactVariant = products.find(
                (p) => p.barcode && p.barcode.trim().toLowerCase() === val.toLowerCase() && p.quantity > 0
              );
              if (exactVariant) {
                add(exactVariant);
                playScanBeep(true);
                return;
              }
              const exactGroup = groupedProducts.find(
                (product) => product.barcode && product.barcode.trim().toLowerCase() === val.toLowerCase()
              );
              if (exactGroup) {
                chooseProduct(exactGroup);
              }
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              const val = search.trim();
              if (!val) return;
              event.preventDefault();
              if (processBarcode(val)) {
                return;
              }
              if (filtered.length === 1) {
                chooseProduct(filtered[0]);
              }
            }
          }}
          autoFocus
        />
        <span className="catalog-count">{filtered.length} منتج</span>
      </div>
      <div className="category-tabs" role="group" aria-label="فلتر التصنيف">
        {categories.map((category) => <button
          type="button"
          key={category}
          className={categoryFilter === category ? "category-tab selected" : "category-tab"}
          onClick={() => { setCategoryFilter(category); setCatalogPage(1); }}
        >{category}</button>)}
      </div>
      {lastAdded && <div className="added-hint" role="status">تمت إضافة {lastAdded} للفاتورة. <button type="button" onClick={() => setSheetOpen(true)}>عرض الفاتورة ←</button></div>}
      <div className="picks" aria-label="كل المنتجات">
        {visibleProducts.map((product) => {
          const inCart = cart.filter((line) => line.product.productId === product.productId).reduce((sum, line) => sum + line.quantity, 0);
          return <button
            type="button"
            key={product.productId}
            className={"pick" + (product.totalQuantity === 0 ? " sold-out" : "")}
            disabled={product.totalQuantity === 0}
            onClick={() => chooseProduct(product)}
            aria-label={"اختيار " + product.name + " للفاتورة"}
          >
            <span className="pick-category">{product.category}</span>
            <strong className="pick-name">{product.name}</strong>
            <span className="pick-variant">{product.colors.length ? product.colors.join("، ") : "بدون ألوان"}{product.sizes.length ? " · المقاسات: " + product.sizes.join("، ") : ""}</span>
            <span className="pick-footer"><b>{money(product.sellPricePiasters)}</b><small className={"pick-stock" + (product.totalQuantity <= product.lowStockThreshold ? " low" : "")}>{product.totalQuantity === 0 ? "نفد" : "متاح " + product.totalQuantity}</small></span>
            {inCart > 0 && <span className="pick-cart-badge">في الفاتورة: {inCart}</span>}
          </button>;
        })}
      </div>
      {filtered.length === 0 && <Empty text="لا توجد منتجات مطابقة. جرّب تصنيفًا أو بحثًا آخر." />}
      <CatalogPagination totalItems={filtered.length} page={validCatalogPage} onPageChange={setCatalogPage} />
    </section>

    {selectedProduct && <div className="variant-picker-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProduct(null); }}>
      <section className="variant-picker" role="dialog" aria-modal="true" aria-label={"اختيار متغير " + selectedProduct.name}>
        <div className="variant-picker-header"><div><h2>{selectedProduct.name}</h2><p>اختار اللون والمقاس والمخزن المطلوب</p></div><button type="button" className="sheet-close" aria-label="إغلاق" onClick={() => setSelectedProduct(null)}>
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
</button></div>
        <div className="variant-picker-list">
          {selectedProduct.rows.filter((row) => row.quantity > 0).map((row) => {
            const inCartLine = cart.find(
              (l) =>
                l.product.productId === row.productId &&
                l.product.variantId === row.variantId &&
                l.product.warehouseId === row.warehouseId &&
                (l.product.color || "") === (row.color || "") &&
                (l.product.size || "") === (row.size || "")
            );
            return (
              <button
                type="button"
                key={row.productId + "-" + row.variantId + "-" + row.warehouseId}
                onClick={() => {
                  add(row);
                  setSelectedProduct(null);
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center", gap: "6px" }}>
                  <strong>{row.color || "بدون لون"} · {row.size ? "مقاس " + row.size : "بدون مقاس"}</strong>
                  {inCartLine && <span className="pill" style={{ background: "#785038", color: "#fff", fontSize: "10px", padding: "1px 6px" }}>في الفاتورة: {inCartLine.quantity}</span>}
                </div>
                <span>{row.warehouse}</span>
                <small>متاح {row.quantity} · {money(row.sellPricePiasters)}</small>
              </button>
            );
          })}
        </div>
      </section>
    </div>}

    {itemCount > 0 && <button type="button" className="invoice-float" onClick={() => setSheetOpen(true)}>
      <span>عرض الفاتورة · {itemCount} قطعة</span><strong>{money(total)}</strong>
    </button>}

    {sheetOpen && <div className="sheet-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSheetOpen(false); }}>
      <form className="invoice-sheet" onSubmit={submit} aria-label="الفاتورة الحالية">
        <div className="sheet-header">
          <div><span className="eyebrow">MORSI FOR BELT</span><h2>فاتورة جديدة</h2><p>{itemCount} قطعة في الفاتورة</p></div>
          <div className="sheet-header-actions">
            {cart.length > 0 && (
              <button
                type="button"
                className="sheet-clear-btn"
                onClick={() => {
                  if (window.confirm("هل أنت متأكد من حذف جميع المنتجات وتفريغ الفاتورة؟")) {
                    clear();
                  }
                }}
                title="حذف جميع المنتجات وتفريغ الفاتورة (F8)"
              >
                <LuTrash2 size={16} />
                <span>حذف الفاتورة</span>
              </button>
            )}
            <button type="button" className="sheet-close" aria-label="إغلاق الفاتورة" onClick={() => setSheetOpen(false)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        <div className="sheet-body">
          <div className="sheet-layout-grid">
            <div className="sheet-cart-col">
              <div className="section-head">
                <div><h3>المنتجات في الفاتورة</h3><p>الخصم يُحسب لكل قطعة</p></div>
                <div className="checks">
                  <label><input type="checkbox" checked={editPrice} onChange={(event) => setEditPrice(event.target.checked)} /> تعديل السعر</label>
                  <label><input type="checkbox" checked={editName} onChange={(event) => setEditName(event.target.checked)} /> تعديل الاسم</label>
                  <button
                    type="button"
                    className={`secret-toggle-btn ${showSecretMetrics ? "active" : ""}`}
                    onClick={() => setShowSecretMetrics((prev) => !prev)}
                    title="عرض / إخفاء"
                  >
                    {showSecretMetrics ? <LuEyeOff size={14} /> : <LuEye size={14} />}
                    <span>عرض / إخفاء</span>
                  </button>
                </div>
              </div>

              {/* Barcode scanner/manual input directly inside invoice */}
              <div className="sheet-barcode-bar">
                <div className="sheet-barcode-input-wrapper">
                  <LuBarcode size={20} className="sheet-barcode-icon" />
                  <input
                    ref={sheetBarcodeInputRef}
                    type="text"
                    className="sheet-barcode-input"
                    value={sheetBarcode}
                    onChange={(e) => {
                      setSheetBarcode(e.target.value);
                      if (sheetBarcodeFeedback) setSheetBarcodeFeedback(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddByBarcode();
                      }
                    }}
                    placeholder="امسح الباركود بالسكنر من أي مكان أو اكتبه هنا واضغط Enter…"
                    aria-label="إضافة منتج بالباركود داخل الفاتورة"
                  />
                  {sheetBarcode && (
                    <button
                      type="button"
                      className="sheet-barcode-clear"
                      onClick={() => {
                        setSheetBarcode("");
                        sheetBarcodeInputRef.current?.focus();
                      }}
                      title="مسح"
                    >
                      ×
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="primary sheet-barcode-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    handleAddByBarcode();
                  }}
                  title="إضافة المنتج بالباركود إلى الفاتورة"
                >
                  + إضافة
                </button>
              </div>

              {sheetBarcodeFeedback && (
                <div className={`sheet-barcode-feedback ${sheetBarcodeFeedback.type}`}>
                  {sheetBarcodeFeedback.text}
                </div>
              )}

              {cart.length > 0 && (
                <div className="sheet-cart-header">
                  <span>المنتج</span>
                  <span style={{ textAlign: "center" }}>الكمية</span>
                  <span style={{ textAlign: "center" }}>السعر</span>
                  <span style={{ textAlign: "center" }}>الخصم</span>
                  <span style={{ textAlign: "center" }}>الإجمالي</span>
                  <span></span>
                </div>
              )}

              {cart.length === 0 ? <Empty text="اضغط على منتج من الصفحة لإضافته للفاتورة." /> : <div className="cart">
                {cart.map((line, index) => {
                  const productRows = products.filter((p) => p.productId === line.product.productId && p.warehouseId === line.product.warehouseId);
                  const availableColors = [...new Set(productRows.map((r) => r.color).filter(Boolean))] as string[];
                  const availableSizes = [...new Set(productRows.filter((r) => !line.product.color || r.color === line.product.color).map((r) => r.size).filter(Boolean))] as string[];

                  return (
                    <div className="cart-line" key={`${line.product.productId}-${line.product.variantId}-${line.product.warehouseId}-${index}`}>
                      <div className="cart-name">
                        {editName ? (
                          <input value={line.name} onChange={(event) => update(index, { name: event.target.value })} />
                        ) : (
                          <strong>{line.name}</strong>
                        )}
                        {(availableColors.length > 0 || availableSizes.length > 0) ? (
                          <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap", alignItems: "center" }}>
                            {availableColors.length > 0 && (
                              <div className="cart-variant-select">
                                <BrandSelect
                                  label="اللون"
                                  value={line.product.color || ""}
                                  onValueChange={(newColor) => {
                                    const matching = productRows.find((r) => r.color === newColor && (r.size === line.product.size || !r.size)) || productRows.find((r) => r.color === newColor);
                                    if (matching) {
                                      const existingIndex = cart.findIndex((l, i) => i !== index && l.product.productId === matching.productId && l.product.variantId === matching.variantId && l.product.warehouseId === matching.warehouseId && (l.product.color || "") === (matching.color || "") && (l.product.size || "") === (matching.size || ""));
                                      if (existingIndex >= 0) {
                                        setCart((curr) => curr.map((l, i) => i === existingIndex ? { ...l, quantity: Math.min(matching.quantity, l.quantity + line.quantity) } : l).filter((_, i) => i !== index));
                                      } else {
                                        update(index, { product: matching, price: matching.sellPricePiasters, name: matching.name, quantity: Math.min(line.quantity, matching.quantity) });
                                      }
                                    }
                                  }}
                                  options={availableColors.map((c) => ({ value: c, label: "اللون: " + c }))}
                                  placeholder="اللون"
                                />
                              </div>
                            )}
                            {availableSizes.length > 0 && (
                              <div className="cart-variant-select">
                                <BrandSelect
                                  label="المقاس"
                                  value={line.product.size || ""}
                                  onValueChange={(newSize) => {
                                    const matching = productRows.find((r) => r.size === newSize && r.color === line.product.color) || productRows.find((r) => r.size === newSize);
                                    if (matching) {
                                      const existingIndex = cart.findIndex((l, i) => i !== index && l.product.productId === matching.productId && l.product.variantId === matching.variantId && l.product.warehouseId === matching.warehouseId && (l.product.color || "") === (matching.color || "") && (l.product.size || "") === (matching.size || ""));
                                      if (existingIndex >= 0) {
                                        setCart((curr) => curr.map((l, i) => i === existingIndex ? { ...l, quantity: Math.min(matching.quantity, l.quantity + line.quantity) } : l).filter((_, i) => i !== index));
                                      } else {
                                        update(index, { product: matching, price: matching.sellPricePiasters, name: matching.name, quantity: Math.min(line.quantity, matching.quantity) });
                                      }
                                    }
                                  }}
                                  options={availableSizes.map((s) => ({ value: s, label: "المقاس: " + s }))}
                                  placeholder="المقاس"
                                />
                              </div>
                            )}
                            {productRows.length > 1 && (
                              <button
                                type="button"
                                style={{
                                  border: "1px dashed #c99a59",
                                  background: "#fffaf4",
                                  color: "#785038",
                                  borderRadius: "6px",
                                  padding: "3px 8px",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                  height: "30px",
                                  whiteSpace: "nowrap",
                                }}
                                title="إضافة مقاس أو لون آخر من هذا المنتج للفاتورة"
                                onClick={() => {
                                  const grp = groupedProducts.find((g) => g.productId === line.product.productId);
                                  if (grp) setSelectedProduct(grp);
                                }}
                              >
                                + مقاس/لون آخر
                              </button>
                            )}
                          </div>
                        ) : (
                          <small>{line.product.warehouse}</small>
                        )}
                      </div>
                      <div>
                        <div className="quantity-stepper">
                          <button
                            type="button"
                            className="stepper-btn"
                            disabled={line.quantity <= 1}
                            onClick={() => update(index, { quantity: Math.max(1, line.quantity - 1) })}
                            title="تنقيص"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="1"
                            max={line.product.quantity}
                            value={line.quantity}
                            aria-label="الكمية"
                            onChange={(event) => update(index, { quantity: Math.max(1, Math.min(Number(event.target.value) || 1, line.product.quantity)) })}
                          />
                          <button
                            type="button"
                            className="stepper-btn"
                            disabled={line.quantity >= line.product.quantity}
                            onClick={() => update(index, { quantity: Math.min(line.product.quantity, line.quantity + 1) })}
                            title="زيادة"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={!editPrice}
                          value={line.price / 100}
                          aria-label="السعر"
                          placeholder="السعر"
                          onChange={(event) => update(index, { price: piastres(event.target.value) })}
                        />
                        {showSecretMetrics && (
                          <div
                            style={{
                              textAlign: "center",
                              fontSize: "11px",
                              fontWeight: 800,
                              color: "#785038",
                              marginTop: "4px",
                              background: "#f4eee7",
                              borderRadius: "5px",
                              padding: "2px 4px",
                              lineHeight: 1.2,
                            }}
                          >
                            {moneyNoUnit(line.product.buyPricePiasters)}
                          </div>
                        )}
                      </div>
                      <div>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.discount / 100}
                          aria-label="خصم القطعة"
                          placeholder="الخصم"
                          onChange={(event) => update(index, { discount: piastres(event.target.value) })}
                        />
                      </div>
                      <strong style={{ textAlign: "center" }}>{money((line.price - line.discount) * line.quantity)}</strong>
                      <button type="button" className="remove" aria-label={"حذف " + line.name} onClick={() => setCart((current) => current.filter((_, i) => i !== index))}>×</button>
                    </div>
                  );
                })}
              </div>}
              <button type="button" className="secondary add-more" onClick={() => setSheetOpen(false)}>+ إضافة منتجات أخرى</button>
            </div>

            <div className="sheet-checkout-col">
              <div className="sheet-card">
                <h3 style={{ marginTop: 0, marginBottom: 14 }}>بيانات العميل والبائع</h3>
                <div className="form-grid compact">
                  <label>
                    الموظف البائع
                    <BrandSelect
                      label="الموظف البائع"
                      value={sellerEmployeeId}
                      onValueChange={(val) => setSellerEmployeeId(val)}
                      options={[
                        { value: "", label: `${session?.full_name || "الحساب الحالي"} (الحالي)` },
                        ...employees.map((emp) => ({
                          value: String(emp.id),
                          label: emp.name + (emp.jobTitle ? ` (${emp.jobTitle})` : "")
                        }))
                      ]}
                      placeholder="اختر البائع"
                    />
                  </label>
                  <label>اسم العميل<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} required={Boolean(customerPhone.trim()) || paid < total} /></label>
                  <label>رقم الهاتف<input value={customerPhone} onChange={(event) => { const phone = event.target.value; setCustomerPhone(phone); const existing = customerChoices.find((customer) => customer.phone === phone.trim()); if (existing) setCustomerName(existing.name); }} inputMode="tel" list="customer-phone-options" required={Boolean(customerName.trim()) || paid < total} /><datalist id="customer-phone-options">{customerChoices.map((customer) => <option key={customer.id} value={customer.phone}>{customer.name}</option>)}</datalist></label>
                </div>
                <label style={{ marginTop: 8 }}>ملاحظة<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} /></label>
              </div>

              <div className="invoice-discount-section">
                <div className="invoice-discount-header">
                  <span>خصم على الفاتورة</span>
                  <div className="discount-type-tabs" role="group" aria-label="نوع الخصم">
                    <button
                      type="button"
                      className={invoiceDiscountType === "FIXED" ? "selected" : ""}
                      onClick={() => setInvoiceDiscountType("FIXED")}
                    >
                      مبلغ (ج.م)
                    </button>
                    <button
                      type="button"
                      className={invoiceDiscountType === "PERCENT" ? "selected" : ""}
                      onClick={() => setInvoiceDiscountType("PERCENT")}
                    >
                      نسبة (%)
                    </button>
                  </div>
                </div>
                <div className="invoice-discount-input-row">
                  <input
                    type="number"
                    min="0"
                    max={invoiceDiscountType === "PERCENT" ? 100 : undefined}
                    step={invoiceDiscountType === "PERCENT" ? "1" : "0.01"}
                    placeholder={invoiceDiscountType === "PERCENT" ? "أدخل النسبة (مثال: 10)" : "أدخل قيمة الخصم (ج.م)"}
                    value={invoiceDiscountValue}
                    onChange={(e) => setInvoiceDiscountValue(e.target.value)}
                  />
                  {invoiceDiscountValue && (
                    <button
                      type="button"
                      className="discount-clear-btn"
                      title="مسح الخصم"
                      onClick={() => setInvoiceDiscountValue("")}
                    >
                      ✕
                    </button>
                  )}
                </div>
                {extraDiscountPiasters > 0 && invoiceDiscountType === "PERCENT" && (
                  <div className="discount-calc-hint">
                    خصم {invoiceDiscountValue}% = {money(extraDiscountPiasters)}
                  </div>
                )}
              </div>

              <div className="sheet-card">
                <h3 style={{ marginTop: 0, marginBottom: 14 }}>طريقة الدفع</h3>
                <div className="payment-tabs">{[["CASH", "نقدي"], ["CREDIT", "آجل"], ["INSTAPAY", "إنستاباي"], ["WALLET", "محفظة"], ["MIXED", "دفع مختلط"]].map(([value, label]) => <button
                  type="button" key={value} className={method === value ? "selected" : ""}
                  aria-pressed={method === value}
                  onClick={() => choosePaymentMethod(value)}
                >{label}</button>)}</div>
                {method === "CASH" && <div className="form-grid compact"><label>المبلغ النقدي<input type="number" min="0" step="0.01" value={cash} onChange={(event) => { setCash(event.target.value); setPaymentEdited(true); }} /></label></div>}
                {method === "INSTAPAY" && <div className="form-grid compact"><label>مبلغ إنستاباي<input type="number" min="0" step="0.01" value={instapay} onChange={(event) => { setInstapay(event.target.value); setPaymentEdited(true); }} /></label></div>}
                {method === "WALLET" && <div className="form-grid compact"><label>مبلغ المحفظة<input type="number" min="0" step="0.01" value={wallet} onChange={(event) => { setWallet(event.target.value); setPaymentEdited(true); }} /></label></div>}
                {method === "MIXED" && <div className="form-grid compact">
                  <label>نقدي<input type="number" min="0" step="0.01" value={cash} onChange={(event) => setCash(event.target.value)} /></label>
                  <label>إنستاباي<input type="number" min="0" step="0.01" value={instapay} onChange={(event) => setInstapay(event.target.value)} /></label>
                  <label>محفظة<input type="number" min="0" step="0.01" value={wallet} onChange={(event) => setWallet(event.target.value)} /></label>
                </div>}
                {method === "CREDIT" && <div className="credit-payment">
                  <p className="payment-hint">ممكن تسيب المدفوع الآن صفر، أو تسجل جزءًا مدفوعًا ويُحفظ الباقي آجلًا على العميل.</p>
                  <div className="payment-tabs credit-payment-tabs" role="group" aria-label="وسيلة دفع الجزء المدفوع">{[["CASH", "نقدي"], ["INSTAPAY", "إنستاباي"], ["WALLET", "محفظة"]].map(([value, label]) => <button
                    type="button" key={value} className={creditPaymentMethod === value ? "selected" : ""}
                    aria-pressed={creditPaymentMethod === value}
                    onClick={() => chooseCreditPaymentMethod(value)}
                  >{label}</button>)}</div>
                  <div className="form-grid compact"><label>المدفوع الآن<input type="number" min="0" step="0.01" value={creditPaymentMethod === "CASH" ? cash : creditPaymentMethod === "INSTAPAY" ? instapay : wallet} onChange={(event) => {
                    const amount = event.target.value;
                    if (creditPaymentMethod === "CASH") setCash(amount);
                    if (creditPaymentMethod === "INSTAPAY") setInstapay(amount);
                    if (creditPaymentMethod === "WALLET") setWallet(amount);
                  }} /></label></div>
                  <p className="payment-hint">يلزم إدخال اسم العميل ورقم هاتفه لحفظ المبلغ المتبقي.</p>
                </div>}
                {paid < total && method !== "CREDIT" && <p className="payment-hint">المتبقي آجل على العميل؛ يلزم إدخال اسمه ورقم هاتفه.</p>}
                {paid > total && <p className="payment-hint payment-error">المبلغ المدفوع أكبر من إجمالي الفاتورة.</p>}
                {method === "CREDIT" && total > 0 && paid === total && <p className="payment-hint">المبلغ مدفوع بالكامل؛ اختار طريقة الدفع المباشر بدل الآجل.</p>}
              </div>

              <div className="sheet-totals">
                <div className="total"><span>المجموع</span><strong>{money(subtotal)}</strong></div>
                {extraDiscountPiasters > 0 ? (
                  <>
                    {lineDiscount > 0 && <div className="total"><span>خصم القطع</span><strong>{money(lineDiscount)}</strong></div>}
                    <div className="total"><span>خصم الفاتورة</span><strong>{money(extraDiscountPiasters)}</strong></div>
                    <div className="total"><span>إجمالي الخصم</span><strong>{money(discount)}</strong></div>
                  </>
                ) : (
                  <div className="total"><span>خصم القطع</span><strong>{money(discount)}</strong></div>
                )}
                <div className="total"><span>المدفوع</span><strong>{money(paid)}</strong></div>
                <div className="total"><span>المتبقي</span><strong>{money(Math.max(0, total - paid))}</strong></div>
                {showSecretMetrics && (
                  <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px dashed #e9e1d9", display: "flex", justifyContent: "flex-end" }}>
                    <span
                      style={{
                        display: "inline-block",
                        background: total - cost >= 0 ? "#ecf7ed" : "#fff0ed",
                        color: total - cost >= 0 ? "#256d32" : "#b94d3f",
                        padding: "4px 12px",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: 800,
                      }}
                    >
                      {moneyNoUnit(total - cost)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="sheet-footer">
          <div>
            <small>الإجمالي النهائي</small>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <strong>{money(total)}</strong>
              {showSecretMetrics && (
                <span
                  style={{
                    background: total - cost >= 0 ? "#ecf7ed" : "#fff0ed",
                    color: total - cost >= 0 ? "#256d32" : "#b94d3f",
                    padding: "3px 10px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    fontWeight: 800,
                  }}
                >
                  {moneyNoUnit(total - cost)}
                </span>
              )}
            </div>
          </div>
          <div className="sheet-footer-actions">
            {cart.length > 0 && (
              <button
                type="button"
                className="sheet-clear-footer-btn"
                onClick={() => {
                  if (window.confirm("هل أنت متأكد من حذف جميع المنتجات وتفريغ الفاتورة؟")) {
                    clear();
                  }
                }}
                title="حذف جميع المنتجات وتفريغ الفاتورة (F8)"
              >
                <LuTrash2 size={16} />
                <span>مسح الكل</span>
              </button>
            )}
            <button className="primary" disabled={busy || !cart.length || paid > total || (method === "CREDIT" && paid >= total) || (paid < total && (!customerName.trim() || !customerPhone.trim()))}>{busy ? "جارٍ الحفظ…" : "إتمام البيع (Enter ↵)"}</button>
          </div>
        </div>
      </form>
    </div>}

    {completedInvoice && (
      <ThermalReceiptModal
        invoiceDetail={completedInvoice}
        onClose={() => setCompletedInvoice(null)}
        onNewSale={() => {
          setCompletedInvoice(null);
          newInvoice();
        }}
      />
    )}
  </div>;
}

function Customers({ customers, session, refresh, setNotice, setError, onGoToInvoice, targetCustomerId, onClearTargetCustomerId }: {
  customers: Customer[]; session: Session; refresh: () => Promise<void>;
  setNotice: (message: string) => void; setError: (message: string) => void;
  onGoToInvoice: (num: number) => void;
  targetCustomerId?: number | null;
  onClearTargetCustomerId?: () => void;
}) {
  const [viewMode, setViewMode] = useState<"list" | "add">("list");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [details, setDetails] = useState<CustomerDetail | null>(null);
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [paymentInvoice, setPaymentInvoice] = useState<CustomerInvoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");

  useEffect(() => {
    if (targetCustomerId) {
      setSelectedId(targetCustomerId);
      setViewMode("list");
      onClearTargetCustomerId?.();
    }
  }, [targetCustomerId, onClearTargetCustomerId]);

  useEffect(() => {
    if (selectedId === null) { setDetails(null); return; }
    let active = true;
    setDetailsBusy(true);
    invoke<CustomerDetail>("get_customer_details", { token: session.token, customerId: selectedId })
      .then((data) => { if (active) setDetails(data); })
      .catch((cause) => { if (active) setError(String(cause)); })
      .finally(() => { if (active) setDetailsBusy(false); });
    return () => { active = false; };
  }, [selectedId, reloadCount, session.token]);

  async function addCustomer(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError("");
    try {
      const id = await invoke<number>("create_customer", { token: session.token, name, phone });
      await refresh();
      setName(""); setPhone(""); setSelectedId(id); setViewMode("list"); setReloadCount((count) => count + 1);
      setNotice("تمت إضافة العميل بنجاح");
    } catch (cause) { setError(String(cause)); }
    finally { setSaving(false); }
  }

  async function recordPayment(event: FormEvent) {
    event.preventDefault();
    if (!details || !paymentInvoice || saving) return;
    const amountPiasters = piastres(paymentAmount);
    if (amountPiasters <= 0 || amountPiasters > paymentInvoice.remainingPiasters) {
      setError("مبلغ السداد يجب أن يكون أكبر من صفر ولا يتجاوز المتبقي على الفاتورة");
      return;
    }
    setSaving(true); setError("");
    try {
      await invoke("collect_customer_payment", {
        token: session.token, customerId: details.customer.id,
        invoiceNumber: paymentInvoice.invoiceNumber, amountPiasters, method: paymentMethod,
      });
      await refresh();
      setReloadCount((count) => count + 1);
      setPaymentInvoice(null); setPaymentAmount("");
      setNotice(`تم تسجيل سداد الفاتورة #${paymentInvoice.invoiceNumber}`);
    } catch (cause) { setError(String(cause)); }
    finally { setSaving(false); }
  }

  const filtered = customers.filter((customer) => `${customer.name} ${customer.phone ?? ""}`.toLowerCase().includes(search.toLowerCase().trim()));
  const totalOutstanding = customers.reduce((sum, customer) => sum + customer.outstandingPiasters, 0);
  const owingCount = customers.filter((customer) => customer.outstandingPiasters > 0).length;

  if (viewMode === "add") {
    return (
      <div className="stack customers-page">
        <div className="breadcrumb">
          <button type="button" className="link-button" onClick={() => setViewMode("list")}>
            → العملاء
          </button>
          <span>/ إضافة عميل جديد</span>
        </div>

        <section className="panel">
          <div className="section-head">
            <div>
              <h2>إضافة عميل جديد</h2>
              <p>أدخل اسم العميل ورقم هاتفه لربط الفواتير المكتملة والآجلة بحسابه.</p>
            </div>
          </div>
          <form onSubmit={addCustomer}>
            <div className="form-grid compact">
              <label>
                اسم العميل
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={120}
                  placeholder="اسم العميل"
                  autoFocus
                />
              </label>
              <label>
                رقم الهاتف
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  required
                  inputMode="tel"
                  placeholder="01xxxxxxxxx"
                />
              </label>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <button className="primary" disabled={saving}>
                {saving ? "جارٍ الحفظ…" : "حفظ العميل"}
              </button>
              <button type="button" className="secondary" onClick={() => setViewMode("list")}>
                إلغاء
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  return <div className="stack customers-page">
    <div className="customer-summary">
      <div className="stat"><span>العملاء</span><strong>{customers.length}</strong></div>
      <div className="stat"><span>عليهم رصيد آجل</span><strong>{owingCount}</strong></div>
      <div className="stat"><span>إجمالي الآجل المتبقي</span><strong>{money(totalOutstanding)}</strong></div>
    </div>
    <section className="panel">
      <div className="section-head">
        <div>
          <h2>قائمة العملاء</h2>
          <p>ابحث بالاسم أو رقم الهاتف، وافتح كشف العميل لعرض مشترياته.</p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <input className="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="بحث عن عميل…" />
          <button type="button" className="primary add-product-btn" onClick={() => { setName(""); setPhone(""); setViewMode("add"); }}>
            + إضافة عميل جديد
          </button>
        </div>
      </div>
      <div className="table-wrap"><table><thead><tr><th>العميل</th><th>رقم الهاتف</th><th>الفواتير</th><th>إجمالي المشتريات</th><th>المتبقي آجل</th><th>آخر فاتورة</th><th>التفاصيل</th></tr></thead><tbody>
        {filtered.map((customer) => <tr key={customer.id} className={selectedId === customer.id ? "customer-selected-row" : ""}>
          <td><strong>{customer.name}</strong></td><td>{customer.phone || "—"}</td><td>{customer.invoiceCount}</td><td>{money(customer.totalPiasters)}</td>
          <td><span className={customer.outstandingPiasters > 0 ? "customer-debt" : "customer-clear"}>{customer.outstandingPiasters > 0 ? money(customer.outstandingPiasters) : "مسدد"}</span></td>
          <td>{customer.lastInvoiceAt || "—"}</td><td><button type="button" className="secondary" onClick={() => { setDetails(null); setSelectedId(customer.id); setPaymentInvoice(null); setReloadCount((count) => count + 1); }}>عرض كشف الحساب</button></td>
        </tr>)}
      </tbody></table>{filtered.length === 0 && <Empty text="لا يوجد عملاء مطابقون للبحث." />}</div>
    </section>
    {selectedId !== null && (
      <div
        className="variant-picker-overlay"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            setSelectedId(null);
            setPaymentInvoice(null);
          }
        }}
      >
        <section className="invoice-details-dialog" role="dialog" aria-modal="true" aria-label={`كشف العميل ${details?.customer.name ?? ""}`}>
          <div className="invoice-details-header">
            <div>
              <span className="eyebrow">كشف حساب عميل</span>
              <h2 style={{ margin: "2px 0 0" }}>{details?.customer.name ?? "جارٍ التحميل…"}</h2>
              {details?.customer.phone && <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#8b7b70" }}>هاتف: {details.customer.phone}</p>}
            </div>
            <button
              type="button"
              className="sheet-close"
              aria-label="إغلاق"
              onClick={() => { setSelectedId(null); setPaymentInvoice(null); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          {detailsBusy && <div className="empty"><p>جارٍ تحميل كشف العميل…</p></div>}

          {details && (
            <>
              <div className="customer-detail-stats">
                <div><span>عدد الفواتير</span><strong>{details.customer.invoiceCount}</strong></div>
                <div><span>إجمالي المشتريات</span><strong>{money(details.customer.totalPiasters)}</strong></div>
                <div>
                  <span>المتبقي عليه</span>
                  <strong className={details.customer.outstandingPiasters > 0 ? "customer-debt" : "customer-clear"}>
                    {money(details.customer.outstandingPiasters)}
                  </strong>
                </div>
              </div>

              <h3 style={{ fontSize: "15px", margin: "16px 0 10px", color: "#34231c" }}>فواتير العميل</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>رقم الفاتورة</th>
                      <th>التاريخ</th>
                      <th>البائع</th>
                      <th>الإجمالي</th>
                      <th>المدفوع</th>
                      <th>المتبقي</th>
                      <th>الإجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.invoices.map((invoice) => (
                      <tr key={invoice.invoiceNumber}>
                        <td>
                          <button
                            type="button"
                            className="link-button"
                            style={{ fontWeight: 800, fontSize: "13px" }}
                            onClick={() => onGoToInvoice(invoice.invoiceNumber)}
                            title="عرض تفاصيل الفاتورة في صفحة الفواتير"
                          >
                            #{invoice.invoiceNumber}
                          </button>
                        </td>
                        <td>{formatDateTime(invoice.createdAt)}</td>
                        <td>{invoice.sellerName}</td>
                        <td>{money(invoice.totalPiasters)}</td>
                        <td>{money(invoice.paidPiasters)}</td>
                        <td>{money(invoice.remainingPiasters)}</td>
                        <td>
                          {invoice.remainingPiasters > 0 ? (
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => {
                                setPaymentInvoice(invoice);
                                setPaymentAmount((invoice.remainingPiasters / 100).toFixed(2));
                                setPaymentMethod("CASH");
                              }}
                            >
                              تسجيل سداد
                            </button>
                          ) : (
                            <span className="customer-clear">مسددة بالكامل</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {details.invoices.length === 0 && <Empty text="لم تُسجل فواتير لهذا العميل بعد." />}
              </div>

              {paymentInvoice && (
                <form className="customer-payment-form" onSubmit={recordPayment} style={{ marginTop: "14px" }}>
                  <div>
                    <strong>سداد الفاتورة #{paymentInvoice.invoiceNumber}</strong>
                    <small style={{ display: "block" }}>المتبقي: {money(paymentInvoice.remainingPiasters)}</small>
                  </div>
                  <label>
                    المبلغ المدفوع
                    <input
                      type="number"
                      min="0.01"
                      max={(paymentInvoice.remainingPiasters / 100).toFixed(2)}
                      step="0.01"
                      value={paymentAmount}
                      onChange={(event) => setPaymentAmount(event.target.value)}
                      required
                    />
                  </label>
                  <div className="field">
                    <span className="field-label">وسيلة الدفع</span>
                    <BrandSelect
                      label="وسيلة الدفع"
                      value={paymentMethod}
                      onValueChange={setPaymentMethod}
                      options={[
                        { value: "CASH", label: "نقدي" },
                        { value: "INSTAPAY", label: "إنستاباي" },
                        { value: "WALLET", label: "محفظة" },
                      ]}
                      placeholder="وسيلة الدفع"
                    />
                  </div>
                  <button className="primary" disabled={saving}>
                    {saving ? "جارٍ الحفظ…" : "حفظ السداد"}
                  </button>
                  <button type="button" className="secondary" onClick={() => setPaymentInvoice(null)}>
                    إلغاء
                  </button>
                </form>
              )}

              <h3 style={{ fontSize: "15px", margin: "16px 0 10px", color: "#34231c" }}>المنتجات الأكثر شراءً</h3>
              <div className="customer-favorites">
                {details.favoriteProducts.map((product, index) => (
                  <div className="customer-favorite" key={product.productId}>
                    <span>{index + 1}</span>
                    <strong>{product.name}</strong>
                    <small>{product.quantity} قطعة · {money(product.totalPiasters)}</small>
                  </div>
                ))}
                {details.favoriteProducts.length === 0 && <p style={{ color: "#8b7b70", fontSize: "12px" }}>لا توجد مشتريات بعد.</p>}
              </div>

              <h3 style={{ fontSize: "15px", margin: "16px 0 10px", color: "#34231c" }}>سجل سداد الآجل</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>الفاتورة</th>
                      <th>التاريخ</th>
                      <th>المبلغ</th>
                      <th>الطريقة</th>
                      <th>الموظف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.payments.map((payment, index) => (
                      <tr key={`${payment.invoiceNumber}-${payment.createdAt}-${index}`}>
                    <td>
                      <button
                        type="button"
                        className="link-button"
                        style={{ fontWeight: 800, fontSize: "13px" }}
                        onClick={() => onGoToInvoice(payment.invoiceNumber)}
                        title="عرض تفاصيل الفاتورة في صفحة الفواتير"
                      >
                        #{payment.invoiceNumber}
                      </button>
                    </td>
                    <td>{formatDateTime(payment.createdAt)}</td>
                        <td>{money(payment.amountPiasters)}</td>
                        <td>
                          {payment.method === "CASH"
                            ? "نقدي"
                            : payment.method === "INSTAPAY"
                            ? "إنستاباي"
                            : "محفظة"}
                        </td>
                        <td>{payment.employeeName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {details.payments.length === 0 && <Empty text="لا توجد دفعات آجل مسجلة بعد." />}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "18px" }}>
                <button
                  type="button"
                  className="primary"
                  onClick={() => { setSelectedId(null); setPaymentInvoice(null); }}
                >
                  إغلاق
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    )}
  </div>;
}

function Suppliers({
  session,
  refresh,
  setNotice,
  setError,
}: {
  session: Session;
  refresh: () => Promise<void>;
  setNotice: (msg: string) => void;
  setError: (msg: string) => void;
}) {
  const [viewMode, setViewMode] = useState<"list" | "add">("list");
  const [suppliers, setSuppliers] = useState<SupplierAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Goods Receiving & Payment Modal
  const [transSupplier, setTransSupplier] = useState<SupplierAccount | null>(null);
  const [actionType, setActionType] = useState<"RECEIPT" | "PAYMENT">("RECEIPT");
  const [goodsAmount, setGoodsAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CREDIT");
  const [employeeName, setEmployeeName] = useState("");
  const [notes, setNotes] = useState("");

  // Supplier Statement Modal & Filters
  const [statementSupplierId, setStatementSupplierId] = useState<number | null>(null);
  const [statement, setStatement] = useState<SupplierStatement | null>(null);
  const [statementBusy, setStatementBusy] = useState(false);
  const [statementViewMode, setStatementViewMode] = useState<"CARDS" | "TABLE">("TABLE");
  const [filterMode, setFilterMode] = useState<"ALL" | "SINGLE_DATE" | "RANGE">("ALL");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await invoke<SupplierAccount[]>("list_suppliers_with_balances", { token: session.token });
      setSuppliers(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [session.token, setError]);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    if (statementSupplierId === null) {
      setStatement(null);
      return;
    }
    let active = true;
    setStatementBusy(true);
    invoke<SupplierStatement>("get_supplier_statement", {
      token: session.token,
      supplierId: statementSupplierId,
    })
      .then((data) => { if (active) setStatement(data); })
      .catch((cause) => { if (active) setError(String(cause)); })
      .finally(() => { if (active) setStatementBusy(false); });
    return () => { active = false; };
  }, [statementSupplierId, session.token, setError]);

  async function handleAddSupplier(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || saving) return;
    setSaving(true); setError("");
    try {
      await invoke("create_supplier", { token: session.token, name: name.trim() });
      await refresh();
      await loadSuppliers();
      setName("");
      setViewMode("list");
      setNotice("تمت إضافة المورد بنجاح");
    } catch (cause) {
      setError(String(cause));
    } finally {
      setSaving(false);
    }
  }

  async function handleRecordTransaction(e: FormEvent) {
    e.preventDefault();
    if (!transSupplier || saving) return;

    const goodsPiasters = actionType === "RECEIPT" ? piastres(goodsAmount) : 0;
    const paidPiasters = piastres(paidAmount);

    if (actionType === "RECEIPT" && goodsPiasters <= 0) {
      setError("يرجى إدخال قيمة البضاعة الجديدة الموردة");
      return;
    }
    if (actionType === "PAYMENT" && paidPiasters <= 0) {
      setError("يرجى إدخال المبلغ المدفوع لسداد المورد");
      return;
    }

    const currentBal = transSupplier.outstandingPiasters;
    const newBal = currentBal + goodsPiasters - paidPiasters;
    if (newBal < 0) {
      setError("المبلغ المدفوع أكبر من إجمالي رصيد المورد المستحق");
      return;
    }
    setSaving(true); setError("");
    try {
      const formattedNotes = [
        employeeName.trim() ? `[الموظف المسؤول: ${employeeName.trim()}]` : "",
        notes.trim()
      ].filter(Boolean).join(" - ");

      await invoke("create_supplier_transaction", {
        token: session.token,
        input: {
          supplierId: transSupplier.id,
          goodsAmountPiasters: goodsPiasters,
          paidAmountPiasters: paidPiasters,
          paymentMethod: actionType === "PAYMENT" && paymentMethod === "CREDIT" ? "CASH" : paymentMethod,
          notes: formattedNotes || null,
        },
      });
      await refresh();
      await loadSuppliers();
      setTransSupplier(null);
      setGoodsAmount("");
      setPaidAmount("");
      setPaymentMethod("CREDIT");
      setEmployeeName("");
      setNotes("");
      setNotice(
        actionType === "RECEIPT"
          ? `تم تسجيل توريد بضاعة جديدة للمورد ${transSupplier.name} بنجاح`
          : `تم تسجيل سداد دفعة للمورد ${transSupplier.name} بنجاح`
      );
    } catch (cause) {
      setError(String(cause));
    } finally {
      setSaving(false);
    }
  }

  const filtered = suppliers.filter((s) => s.name.toLowerCase().includes(search.toLowerCase().trim()));

  if (viewMode === "add") {
    return (
      <div className="stack">
        <div className="breadcrumb">
          <button type="button" className="link-button" onClick={() => setViewMode("list")}>
            → الموردون
          </button>
          <span>/ إضافة مورد جديد</span>
        </div>

        <section className="panel">
          <div className="section-head">
            <div>
              <h2>إضافة مورد جديد</h2>
              <p>أدخل اسم الشركة أو المورد لربط المنتجات وعمليات الاستلام والآجل بحسابه.</p>
            </div>
          </div>
          <form onSubmit={handleAddSupplier}>
            <div className="form-grid compact" style={{ maxWidth: "500px" }}>
              <label>
                اسم المورد / الشركة
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: شركة النصر للمستوردات"
                  required
                />
              </label>
            </div>
            <div className="button-row" style={{ marginTop: "20px" }}>
              <button className="primary" disabled={saving}>حفظ المورد</button>
              <button type="button" className="secondary" onClick={() => setViewMode("list")}>إلغاء</button>
            </div>
          </form>
        </section>
      </div>
    );
  }

  if (statementSupplierId !== null) {
    const rawTransactions = statement?.transactions || [];
    const filteredTransactions = rawTransactions.filter((t) => {
      if (filterMode === "SINGLE_DATE") {
        if (!singleDate) return true;
        return getLocalDateString(t.createdAt) === singleDate;
      }
      if (filterMode === "RANGE") {
        const d = getLocalDateString(t.createdAt);
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
        return true;
      }
      return true;
    });

    const isFiltered = filterMode !== "ALL" && (singleDate !== "" || startDate !== "" || endDate !== "");

    const filteredGoodsPiasters = filteredTransactions
      .filter((t) => t.transactionType === "RECEIPT")
      .reduce((sum, t) => sum + t.goodsAmountPiasters, 0);

    const filteredPaidPiasters = filteredTransactions
      .reduce((sum, t) => sum + t.paidAmountPiasters, 0);

    const clearFilters = () => {
      setFilterMode("ALL");
      setSingleDate("");
      setStartDate("");
      setEndDate("");
    };

    return (
      <div className="stack suppliers-page">
        <div className="breadcrumb">
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setStatementSupplierId(null);
              clearFilters();
            }}
          >
            الموردون ←
          </button>
          <span>/ كشف حساب المورد: {statement?.supplier.name || "جارٍ التحميل..."}</span>
        </div>

        <section className="panel">
          <div className="section-head" style={{ borderBottom: "1px solid #f0e6dd", paddingBottom: "14px", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "22px" }}>كشف حساب المورد</h2>
              <p style={{ margin: "4px 0 0", color: "#8b7b70" }}>
                {statement ? (
                  <>المورد: <strong style={{ color: "#785038" }}>{statement.supplier.name}</strong> — تاريخ التقرير: {formatDateTime(new Date().toISOString())}</>
                ) : "جارٍ تحميل كشف الحساب..."}
              </p>
            </div>
            <button
              type="button"
              className="secondary"
              style={{ padding: "8px 16px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={() => {
                setStatementSupplierId(null);
                clearFilters();
              }}
            >
              <span>عودة لقائمة الموردين</span>
              <LuArrowLeft style={{ fontSize: "15px" }} />
            </button>
          </div>

          {statementBusy && <div className="empty"><p>جارٍ تحميل بيانات كشف الحساب...</p></div>}
          {statement && (
            <>
              {/* PREMIUM FILTERING BAR */}
              <div style={{
                background: "linear-gradient(180deg, #ffffff 0%, #faf5ef 100%)",
                border: "1px solid #eae0d5",
                borderRadius: "16px",
                padding: "18px 20px",
                marginBottom: "24px",
                boxShadow: "0 4px 16px rgba(120, 80, 56, 0.04)",
                display: "flex",
                flexDirection: "column",
                gap: "16px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#5d4037", fontWeight: "700", fontSize: "14px" }}>
                      <span>🗓️</span>
                      <span>تصفية فترة التقرير:</span>
                    </div>

                    {/* Segmented Control Pills */}
                    <div style={{
                      display: "inline-flex",
                      background: "#f0e6dc",
                      padding: "4px",
                      borderRadius: "12px",
                      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)",
                      gap: "4px"
                    }}>
                      <button
                        type="button"
                        style={{
                          padding: "8px 16px",
                          fontSize: "13px",
                          borderRadius: "9px",
                          border: filterMode === "ALL" ? "1px solid #d9c3b0" : "none",
                          cursor: "pointer",
                          background: filterMode === "ALL" ? "#ffffff" : "transparent",
                          color: filterMode === "ALL" ? "#5c3826" : "#8c786a",
                          fontWeight: filterMode === "ALL" ? "700" : "600",
                          boxShadow: filterMode === "ALL" ? "0 3px 10px rgba(92, 56, 38, 0.12)" : "none",
                          transition: "all 0.25s ease"
                        }}
                        onClick={clearFilters}
                      >
                        عرض جميع الأوقات
                      </button>
                      <button
                        type="button"
                        style={{
                          padding: "8px 16px",
                          fontSize: "13px",
                          borderRadius: "9px",
                          border: filterMode === "SINGLE_DATE" ? "1px solid #d9c3b0" : "none",
                          cursor: "pointer",
                          background: filterMode === "SINGLE_DATE" ? "#ffffff" : "transparent",
                          color: filterMode === "SINGLE_DATE" ? "#5c3826" : "#8c786a",
                          fontWeight: filterMode === "SINGLE_DATE" ? "700" : "600",
                          boxShadow: filterMode === "SINGLE_DATE" ? "0 3px 10px rgba(92, 56, 38, 0.12)" : "none",
                          transition: "all 0.25s ease"
                        }}
                        onClick={() => setFilterMode("SINGLE_DATE")}
                      >
                        تاريخ محدد
                      </button>
                      <button
                        type="button"
                        style={{
                          padding: "8px 16px",
                          fontSize: "13px",
                          borderRadius: "9px",
                          border: filterMode === "RANGE" ? "1px solid #d9c3b0" : "none",
                          cursor: "pointer",
                          background: filterMode === "RANGE" ? "#ffffff" : "transparent",
                          color: filterMode === "RANGE" ? "#5c3826" : "#8c786a",
                          fontWeight: filterMode === "RANGE" ? "700" : "600",
                          boxShadow: filterMode === "RANGE" ? "0 3px 10px rgba(92, 56, 38, 0.12)" : "none",
                          transition: "all 0.25s ease"
                        }}
                        onClick={() => setFilterMode("RANGE")}
                      >
                        من - إلى
                      </button>
                    </div>
                  </div>

                  {isFiltered && (
                    <button
                      type="button"
                      style={{
                        background: "#fdeded",
                        color: "#c62828",
                        border: "1px solid #f5c6c6",
                        padding: "6px 14px",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "700",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                      onClick={clearFilters}
                    >
                      ✕ إعادة ضبط وتصفير الفلتر
                    </button>
                  )}
                </div>

                {filterMode === "SINGLE_DATE" && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    flexWrap: "wrap",
                    paddingTop: "10px",
                    borderTop: "1px dashed #e6d8cb",
                    marginTop: "4px"
                  }}>
                    <label style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", fontWeight: "700", color: "#5d4037" }}>
                      <span>اختر اليوم:</span>
                      <input
                        type="date"
                        value={singleDate}
                        onChange={(e) => setSingleDate(e.target.value)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "10px",
                          border: "1px solid #d0bcac",
                          outline: "none",
                          background: "#ffffff",
                          fontSize: "13px",
                          color: "#333",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
                        }}
                      />
                    </label>
                    {singleDate ? (
                      <span style={{ fontSize: "12px", color: "#2e7d32", background: "#edf7ed", border: "1px solid #c8e6c9", padding: "5px 12px", borderRadius: "20px", fontWeight: "700" }}>
                        ✓ يعرض تقرير يوم: {singleDate} ({filteredTransactions.length} عملية)
                      </span>
                    ) : (
                      <span style={{ fontSize: "12px", color: "#8c786a" }}>
                        اختر تاريخاً من التقويم لعرض تفاصيل اليوم...
                      </span>
                    )}
                  </div>
                )}

                {filterMode === "RANGE" && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "18px",
                    flexWrap: "wrap",
                    paddingTop: "10px",
                    borderTop: "1px dashed #e6d8cb",
                    marginTop: "4px"
                  }}>
                    <label style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "700", color: "#5d4037" }}>
                      <span>من:</span>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "10px",
                          border: "1px solid #d0bcac",
                          outline: "none",
                          background: "#ffffff",
                          fontSize: "13px",
                          color: "#333",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
                        }}
                      />
                    </label>

                    <label style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "700", color: "#5d4037" }}>
                      <span>إلى:</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: "10px",
                          border: "1px solid #d0bcac",
                          outline: "none",
                          background: "#ffffff",
                          fontSize: "13px",
                          color: "#333",
                          boxShadow: "0 1px 4px rgba(0,0,0,0.04)"
                        }}
                      />
                    </label>

                    {(startDate || endDate) ? (
                      <span style={{ fontSize: "12px", color: "#2e7d32", background: "#edf7ed", border: "1px solid #c8e6c9", padding: "5px 12px", borderRadius: "20px", fontWeight: "700" }}>
                        ✓ نطاق التقرير: {startDate || "البداية"} ⬅️ {endDate || "اليوم"} ({filteredTransactions.length} عملية)
                      </span>
                    ) : (
                      <span style={{ fontSize: "12px", color: "#8c786a" }}>
                        اختر تاريخ البداية والنهاية لتحديد الفترة...
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* STAT CARDS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px", marginBottom: "24px" }}>
                <div className="stat" style={{ padding: "16px" }}>
                  <span>{isFiltered ? "بضائع الفترة المحددة" : "إجمالي البضائع الموردة"}</span>
                  <strong style={{ fontSize: "20px" }}>{money(isFiltered ? filteredGoodsPiasters : statement.supplier.totalGoodsPiasters)}</strong>
                </div>
                <div className="stat" style={{ padding: "16px" }}>
                  <span>{isFiltered ? "مدفوعات الفترة المحددة" : "إجمالي المدفوع للمورد"}</span>
                  <strong style={{ fontSize: "20px", color: "#24742c" }}>{money(isFiltered ? filteredPaidPiasters : statement.supplier.totalPaidPiasters)}</strong>
                </div>
                {isFiltered && (
                  <div className="stat" style={{ padding: "16px" }}>
                    <span>عمليات الفترة</span>
                    <strong style={{ fontSize: "20px", color: "#785038" }}>{filteredTransactions.length} عملية</strong>
                  </div>
                )}
                <div className="stat" style={{ padding: "16px", background: statement.supplier.outstandingPiasters > 0 ? "#fff8f6" : "#f4fef4" }}>
                  <span>المتبقي المستحق كلياً (دين)</span>
                  <strong style={{ fontSize: "20px", color: statement.supplier.outstandingPiasters > 0 ? "#b64e17" : "#24742c" }}>
                    {money(statement.supplier.outstandingPiasters)}
                  </strong>
                </div>
              </div>

              <div className="section-head" style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h3>سجل عمليات التوريد والسداد التفصيلي</h3>
                  <p>
                    {isFiltered
                      ? `عرض ${filteredTransactions.length} عملية وفق الفلتر المحدد`
                      : "مرتب من الأحدث إلى الأقدم باليوم والساعة والموظف المسؤول"}
                  </p>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span className="pill">{filteredTransactions.length} عملية</span>

                  {/* View Switcher Toggle */}
                  <div style={{ display: "flex", gap: "4px", background: "#efe9e3", padding: "4px", borderRadius: "10px" }}>
                    <button
                      type="button"
                      style={{
                        padding: "6px 12px",
                        fontSize: "12px",
                        borderRadius: "7px",
                        border: "none",
                        cursor: "pointer",
                        background: statementViewMode === "CARDS" ? "#ffffff" : "transparent",
                        color: statementViewMode === "CARDS" ? "#785038" : "#8b7b70",
                        fontWeight: statementViewMode === "CARDS" ? "bold" : "500",
                        boxShadow: statementViewMode === "CARDS" ? "0 2px 5px rgba(0,0,0,0.08)" : "none",
                        transition: "all 0.2s ease"
                      }}
                      onClick={() => setStatementViewMode("CARDS")}
                    >
                      🪪 كارد
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: "6px 12px",
                        fontSize: "12px",
                        borderRadius: "7px",
                        border: "none",
                        cursor: "pointer",
                        background: statementViewMode === "TABLE" ? "#ffffff" : "transparent",
                        color: statementViewMode === "TABLE" ? "#785038" : "#8b7b70",
                        fontWeight: statementViewMode === "TABLE" ? "bold" : "500",
                        boxShadow: statementViewMode === "TABLE" ? "0 2px 5px rgba(0,0,0,0.08)" : "none",
                        transition: "all 0.2s ease"
                      }}
                      onClick={() => setStatementViewMode("TABLE")}
                    >
                      📊 جدول كلاسيكي
                    </button>
                  </div>
                </div>
              </div>

              {statementViewMode === "CARDS" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {filteredTransactions.map((t) => {
                    let empName = t.employeeName;
                    let displayNotes = t.notes || "";
                    if (t.notes) {
                      const match = t.notes.match(/^\[الموظف المسؤول:\s*([^\]]+)\](?:\s*-\s*(.*))?$/);
                      if (match) {
                        empName = match[1].trim();
                        displayNotes = match[2] ? match[2].trim() : "";
                      }
                    }
                    const isReceipt = t.transactionType === "RECEIPT";

                    return (
                      <div
                        key={t.id}
                        style={{
                          background: "#ffffff",
                          border: `1px solid ${isReceipt ? "#ebdcd0" : "#cce4cd"}`,
                          borderRadius: "14px",
                          padding: "16px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px"
                        }}
                      >
                        {/* Card Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span style={{
                              background: isReceipt ? "#fff3e0" : "#e8f5e9",
                              color: isReceipt ? "#e65100" : "#2e7d32",
                              padding: "5px 12px",
                              borderRadius: "20px",
                              fontSize: "13px",
                              fontWeight: "700",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}>
                              {isReceipt ? "📦 توريد بضاعة جديدة" : "💵 سداد دفعة للمورد"}
                            </span>

                            <span style={{
                              background: "#f4efe9",
                              color: "#6b584c",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600"
                            }}>
                              طريقة السداد: {
                                t.paymentMethod === "CREDIT" ? "آجل (إضافة للحساب)" :
                                t.paymentMethod === "CASH" ? "نقدي (كاش)" :
                                t.paymentMethod === "INSTAPAY" ? "إنستا باي (InstaPay)" : "محفظة إلكترونية"
                              }
                            </span>
                          </div>

                          <span style={{ color: "#8b7b70", fontSize: "12px", background: "#faf8f5", padding: "4px 8px", borderRadius: "6px", border: "1px solid #eee" }}>
                            🕒 {formatDateTime(t.createdAt)}
                          </span>
                        </div>

                        {/* Card Body - Numerical Metrics */}
                        <div style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                          gap: "10px",
                          background: "#faf8f5",
                          padding: "12px 14px",
                          borderRadius: "10px",
                          border: "1px solid #f0e6dd"
                        }}>
                          {isReceipt && (
                            <div>
                              <small style={{ color: "#8b7b70", display: "block", fontSize: "11px", marginBottom: "3px" }}>قيمة البضاعة الموردة</small>
                              <strong style={{ fontSize: "16px", color: "#b64e17" }}>{money(t.goodsAmountPiasters)}</strong>
                            </div>
                          )}

                          <div>
                            <small style={{ color: "#8b7b70", display: "block", fontSize: "11px", marginBottom: "3px" }}>المبلغ المدفوع كاش/محفظة</small>
                            <strong style={{ fontSize: "16px", color: t.paidAmountPiasters > 0 ? "#24742c" : "#8b7b70" }}>
                              {t.paidAmountPiasters > 0 ? money(t.paidAmountPiasters) : "0.00 ج.م (آجل)"}
                            </strong>
                          </div>

                          <div>
                            <small style={{ color: "#8b7b70", display: "block", fontSize: "11px", marginBottom: "3px" }}>حركة الرصيد المستحق</small>
                            <span style={{ fontSize: "13px", fontWeight: "600", color: "#555" }}>
                              {money(t.previousBalancePiasters)} <LuArrowLeft style={{ margin: "0 3px", verticalAlign: "middle", color: "#8b7b70", fontSize: "14px" }} /> <strong style={{ color: t.newBalancePiasters > 0 ? "#b64e17" : "#24742c", fontSize: "15px" }}>{money(t.newBalancePiasters)}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Card Footer - Employee & Statement */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", fontSize: "12px", color: "#666", paddingTop: "2px" }}>
                          <div>
                            👤 <strong>الموظف المنفذ:</strong> <span style={{ color: "#333", fontWeight: "700" }}>{empName}</span>
                          </div>

                          {displayNotes && (
                            <div style={{ background: "#f5f0eb", padding: "4px 10px", borderRadius: "6px", color: "#5d4037", border: "1px solid #e8dfd8" }}>
                              📝 <strong>الملاحظات:</strong> {displayNotes}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {!filteredTransactions.length && <Empty text="لا توجد عمليات توريد أو سداد مطابقة للفلتر المحدد." />}
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>تاريخ ووقت العملية</th>
                        <th>نوع العملية</th>
                        <th>قيمة البضاعة الموردة</th>
                        <th>المبلغ المدفوع</th>
                        <th>طريقة السداد</th>
                        <th>الرصيد السابق</th>
                        <th>الرصيد الجديد المستحق</th>
                        <th>الموظف المنفذ</th>
                        <th>الملاحظات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((t) => {
                        let empName = t.employeeName;
                        let displayNotes = t.notes || "—";
                        if (t.notes) {
                          const match = t.notes.match(/^\[الموظف المسؤول:\s*([^\]]+)\](?:\s*-\s*(.*))?$/);
                          if (match) {
                            empName = match[1].trim();
                            displayNotes = match[2] ? match[2].trim() : "—";
                          }
                        }
                        return (
                          <tr key={t.id}>
                            <td><code>{formatDateTime(t.createdAt)}</code></td>
                            <td>
                              <span className={t.transactionType === "RECEIPT" ? "pill" : "pill good"}>
                                {t.transactionType === "RECEIPT" ? "📦 توريد بضاعة" : "💵 سداد نقدية"}
                              </span>
                            </td>
                            <td>{t.goodsAmountPiasters > 0 ? <strong>{money(t.goodsAmountPiasters)}</strong> : "—"}</td>
                            <td>{t.paidAmountPiasters > 0 ? <strong style={{ color: "#24742c" }}>{money(t.paidAmountPiasters)}</strong> : "—"}</td>
                            <td>
                              {t.paymentMethod === "CREDIT" && "آجل"}
                              {t.paymentMethod === "CASH" && "كاش"}
                              {t.paymentMethod === "INSTAPAY" && "إنستا باي"}
                              {t.paymentMethod === "WALLET" && "محفظة"}
                            </td>
                            <td>{money(t.previousBalancePiasters)}</td>
                            <td>
                              <strong style={{ color: t.newBalancePiasters > 0 ? "#b64e17" : "#24742c" }}>
                                {money(t.newBalancePiasters)}
                              </strong>
                            </td>
                            <td><strong>{empName}</strong></td>
                            <td>{displayNotes}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {!filteredTransactions.length && <Empty text="لا توجد عمليات توريد أو سداد مطابقة للفلتر المحدد." />}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="stack">
      <section className="panel">
        <div className="section-head">
          <div>
            <h2>الموردون وحسابات التوريد</h2>
            <p>إدارة الموردين، استلام البضائع والمنتجات، ومتابعة الديون والمدفوعات الآجلة</p>
          </div>
          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            <span className="pill">{suppliers.length} مورد</span>
            <button className="primary" onClick={() => setViewMode("add")}>
              + إضافة مورد جديد
            </button>
          </div>
        </div>

        <div style={{ marginBottom: "16px" }}>
          <input
            className="search large-search"
            placeholder="⌕ ابحث باسم المورد..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>اسم المورد</th>
                <th>إجمالي قيمة البضائع الموردة</th>
                <th>إجمالي المدفوعات للمورد</th>
                <th>المتبقي المستحق للمورد (دين)</th>
                <th>تاريخ آخر معاملة</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((supplier) => (
                <tr key={supplier.id}>
                  <td><strong>{supplier.name}</strong></td>
                  <td>{money(supplier.totalGoodsPiasters)}</td>
                  <td>{money(supplier.totalPaidPiasters)}</td>
                  <td>
                    <span className={supplier.outstandingPiasters > 0 ? "low" : "good"}>
                      {money(supplier.outstandingPiasters)}
                    </span>
                  </td>
                  <td>
                    {formatDateTime(supplier.lastTransactionAt)}
                  </td>
                  <td>
                    <div className="action-cell">
                      <button
                        className="primary"
                        style={{ padding: "5px 12px", fontSize: "12px" }}
                        onClick={() => {
                          setTransSupplier(supplier);
                          setActionType("RECEIPT");
                          setGoodsAmount("");
                          setPaidAmount("");
                          setPaymentMethod("CREDIT");
                          setEmployeeName(session.full_name || "");
                          setNotes("");
                        }}
                      >
                        + بدء عملية استلام / سداد
                      </button>
                      <button
                        className="edit-button"
                        onClick={() => setStatementSupplierId(supplier.id)}
                      >
                        كشف حساب المورد
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <Empty text={loading ? "جارٍ التحميل..." : "لا يوجد موردون مطابقون."} />}
        </div>
      </section>

      {/* MODAL 1: Goods Receiving & Payment */}
      {transSupplier && (
        <div className="sheet-overlay">
          <div className="invoice-sheet" style={{ width: "min(680px, 95vw)" }}>
            <div className="sheet-header">
              <div>
                <h2>عملية للمورد: {transSupplier.name}</h2>
                <p>اختر إما توريد بضاعة جديدة (زيادة الحساب) أو سداد دفعة للمورد (تصفية الدين)</p>
              </div>
              <button className="sheet-close" onClick={() => setTransSupplier(null)}>×</button>
            </div>
            <form onSubmit={handleRecordTransaction} style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <div className="sheet-body">
                {/* 2 Main Action Modes */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "18px" }}>
                  <button
                    type="button"
                    className={actionType === "RECEIPT" ? "primary" : "secondary"}
                    style={{ padding: "12px 10px", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                    onClick={() => {
                      setActionType("RECEIPT");
                      setPaymentMethod("CREDIT");
                    }}
                  >
                    📦 توريد / استلام بضاعة جديدة
                  </button>
                  <button
                    type="button"
                    className={actionType === "PAYMENT" ? "primary" : "secondary"}
                    style={{ padding: "12px 10px", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                    onClick={() => {
                      setActionType("PAYMENT");
                      setGoodsAmount("");
                      setPaymentMethod("CASH");
                    }}
                  >
                    💵 سداد دفعة للمورد
                  </button>
                </div>

                {(() => {
                  const prevPiasters = transSupplier.outstandingPiasters;
                  const gPiasters = actionType === "RECEIPT" ? piastres(goodsAmount) : 0;
                  const pPiasters = piastres(paidAmount);
                  const netChangePiasters = gPiasters - pPiasters;
                  const newPiasters = prevPiasters + netChangePiasters;

                  return (
                    <div style={{
                      background: "#fff9f2",
                      border: "1px solid #ebd9c8",
                      borderRadius: "14px",
                      padding: "16px",
                      marginBottom: "20px",
                      boxShadow: "0 2px 8px rgba(120, 80, 56, 0.05)"
                    }}>
                      <div style={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#8b7b70",
                        marginBottom: "12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <span>حسبة رصيد المورد:</span>
                        <span style={{
                          background: netChangePiasters > 0 ? "#fdeded" : netChangePiasters < 0 ? "#edf7ed" : "#f5ece5",
                          color: netChangePiasters > 0 ? "#c62828" : netChangePiasters < 0 ? "#2e7d32" : "#8b7b70",
                          padding: "4px 10px",
                          borderRadius: "20px",
                          fontSize: "11px",
                          fontWeight: "700"
                        }}>
                          {netChangePiasters > 0 
                            ? `+ زيادة دَيْن (+${money(netChangePiasters)})` 
                            : netChangePiasters < 0 
                            ? `- خَفْض دَيْن (-${money(Math.abs(netChangePiasters))})` 
                            : "أدخل المبلغ بالأسفل لرؤية النتيجة"}
                        </span>
                      </div>

                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "1fr auto 1fr",
                        alignItems: "center",
                        gap: "10px",
                        background: "#ffffff",
                        padding: "12px",
                        borderRadius: "10px",
                        border: "1px solid #f0e6dd"
                      }}>
                        {/* Previous Balance */}
                        <div style={{ textAlign: "center" }}>
                          <small style={{ color: "#8b7b70", display: "block", fontSize: "11px", marginBottom: "4px" }}>
                            الرصيد السابق
                          </small>
                          <strong style={{ fontSize: "16px", color: prevPiasters > 0 ? "#b64e17" : "#24742c" }}>
                            {money(prevPiasters)}
                          </strong>
                        </div>

                        {/* Flow Arrow */}
                        <div style={{
                          fontSize: "18px",
                          color: "#b09e91",
                          fontWeight: "bold",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          <LuArrowLeft style={{ fontSize: "20px", color: "#785038" }} />
                        </div>

                        {/* Expected New Balance */}
                        <div style={{
                          textAlign: "center",
                          background: newPiasters !== prevPiasters ? (newPiasters < prevPiasters ? "#f0f9f0" : "#fff5f5") : "#faf4ee",
                          padding: "8px",
                          borderRadius: "8px",
                          border: newPiasters !== prevPiasters ? (newPiasters < prevPiasters ? "1px solid #a5d6a7" : "1px solid #ef9a9a") : "1px dashed #d9c3b0",
                          transition: "all 0.3s ease"
                        }}>
                          <small style={{ color: "#785038", display: "block", fontSize: "11px", marginBottom: "4px", fontWeight: "600" }}>
                            الرصيد الجديد المتوقع
                          </small>
                          <strong style={{ fontSize: "17px", color: newPiasters > 0 ? "#b64e17" : "#24742c" }}>
                            {money(newPiasters)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="form-grid compact" style={{ gridTemplateColumns: "1fr", gap: "14px" }}>
                  {actionType === "RECEIPT" ? (
                    <>
                      <label>
                        قيمة البضاعة الجديدة الموردة (إضافة للحساب) بالجنيه
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="مثال: 5000"
                          value={goodsAmount}
                          onChange={(e) => setGoodsAmount(e.target.value)}
                          required
                        />
                      </label>

                      <div className="field">
                        <span className="field-label">طريقة / نوع السداد</span>
                        <BrandSelect
                          label="طريقة / نوع السداد"
                          value={paymentMethod}
                          onValueChange={setPaymentMethod}
                          placeholder="اختر طريقة السداد"
                          options={[
                            { value: "CREDIT", label: "آجل (إضافة على الحساب)" },
                            { value: "CASH", label: "نقدي (كاش)" },
                            { value: "INSTAPAY", label: "إنستا باي (InstaPay)" },
                            { value: "WALLET", label: "محفظة إلكترونية" },
                          ]}
                        />
                      </div>

                      <label>
                        المبلغ المدفوع حالياً للمورد بالجنيه <small>(اكتب 0 إذا كانت الشحنة آجل بالكامل)</small>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(e.target.value)}
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <label>
                        المبلغ المراد سداده للمورد بالجنيه
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="مثال: 1000"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(e.target.value)}
                          required
                        />
                      </label>

                      <div className="field">
                        <span className="field-label">طريقة السداد</span>
                        <BrandSelect
                          label="طريقة السداد"
                          value={paymentMethod === "CREDIT" ? "CASH" : paymentMethod}
                          onValueChange={setPaymentMethod}
                          placeholder="اختر طريقة السداد"
                          options={[
                            { value: "CASH", label: "نقدي (كاش)" },
                            { value: "INSTAPAY", label: "إنستا باي (InstaPay)" },
                            { value: "WALLET", label: "محفظة إلكترونية" },
                          ]}
                        />
                      </div>
                    </>
                  )}

                  <label>
                    الموظف المسؤول عن العملية (توقيع)
                    <input
                      value={employeeName}
                      onChange={(e) => setEmployeeName(e.target.value)}
                      placeholder="اكتب اسم الموظف المسؤول..."
                      required
                    />
                  </label>

                  <label>
                    الملاحظات <small>(اختياري)</small>
                    <input
                      placeholder={actionType === "RECEIPT" ? "مثال: فاتورة توريد رقم 904 - حزام جلد وأحذية" : "مثال: وصل سداد دفعة كاش"}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="sheet-footer">
                <div>
                  <small>المتبقي المستحق للمورد بعد هذه العملية:</small>
                  <strong>
                    {money(
                      Math.max(
                        0,
                        actionType === "RECEIPT"
                          ? transSupplier.outstandingPiasters + piastres(goodsAmount) - piastres(paidAmount)
                          : transSupplier.outstandingPiasters - piastres(paidAmount)
                      )
                    )}
                  </strong>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button className="primary" disabled={saving}>
                    {actionType === "RECEIPT" ? "حفظ وتأكيد توريد البضاعة" : "حفظ وتأكيد سداد الدفعة"}
                  </button>
                  <button type="button" className="secondary" onClick={() => setTransSupplier(null)}>إلغاء</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function RefundModal({
  invoiceDetail,
  session,
  onClose,
  onSuccess,
}: {
  invoiceDetail: InvoiceDetailView;
  session: Session;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [refundSummary, setRefundSummary] = useState<ReturnedItemQty[]>([]);
  const [refundMethod, setRefundMethod] = useState<string>(
    invoiceDetail.remainingPiasters > 0 ? "DEBT_DEDUCTION" : "CASH"
  );
  const [notes, setNotes] = useState("");
  const [selectedQtyMap, setSelectedQtyMap] = useState<Record<number, number>>({});
  const [customUnitPriceMap, setCustomUnitPriceMap] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSummary() {
      try {
        const summary = await invoke<ReturnedItemQty[]>("get_invoice_refund_summary", {
          token: session.token,
          invoiceId: invoiceDetail.id,
        });
        setRefundSummary(summary);
      } catch (err: unknown) {
        console.error(err);
      }
    }
    void loadSummary();
  }, [invoiceDetail.id, session.token]);

  const returnedQtyMap = new Map<number, number>(
    refundSummary.map((s) => [s.invoiceItemId, s.returnedQuantity])
  );

  const getItemRefundUnitPricePiasters = (item: InvoiceItemDetail): number => {
    const customStr = customUnitPriceMap[item.id];
    if (customStr !== undefined && customStr.trim() !== "") {
      const val = Number(customStr);
      if (!isNaN(val) && val >= 0) {
        return Math.round(val * 100);
      }
    }
    return item.sellPricePiasters - item.discountEachPiasters;
  };

  const calculateLineRefund = (item: InvoiceItemDetail, returnQty: number) => {
    const unitPricePiasters = getItemRefundUnitPricePiasters(item);
    return Math.max(0, unitPricePiasters * returnQty);
  };

  const totalRefundAmount = invoiceDetail.items.reduce((sum, item) => {
    const returnQty = selectedQtyMap[item.id] || 0;
    return sum + calculateLineRefund(item, returnQty);
  }, 0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const itemsToRefund = invoiceDetail.items
      .filter((item) => (selectedQtyMap[item.id] || 0) > 0)
      .map((item) => ({
        invoiceItemId: item.id,
        productId: item.productId,
        variantId: item.variantId,
        warehouseId: item.warehouseId,
        nameSnapshot: item.nameSnapshot,
        unitPricePiasters: getItemRefundUnitPricePiasters(item),
        quantity: selectedQtyMap[item.id],
      }));

    if (!itemsToRefund.length) {
      setError("يرجى تحديد كمية إرجاع لمنتج واحد على الأقل");
      return;
    }

    setBusy(true);
    try {
      await invoke("process_refund", {
        token: session.token,
        input: {
          invoiceId: invoiceDetail.id,
          refundMethod,
          notes: notes || null,
          items: itemsToRefund,
        },
      });
      onSuccess();
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="variant-picker-overlay print-hide"
      style={{ zIndex: 3500 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="invoice-details-dialog"
        style={{
          width: "96vw",
          maxWidth: "1280px",
          maxHeight: "92vh",
          padding: "32px",
          zIndex: 3501,
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        <div className="invoice-details-header" style={{ paddingBottom: "16px", marginBottom: "0" }}>
          <div>
            <h2 style={{ fontSize: "22px", margin: 0 }}>↩️ تعديل وإجراء مرتجع للفاتورة #{invoiceDetail.invoiceNumber}</h2>
            <p style={{ margin: "4px 0 0", fontSize: "14px", color: "#785038" }}>
              يمكنك تعديل الكمية المرتجعة وتعديل سعر الإرجاع للقطعة قبل حفظ الفاتورة
            </p>
          </div>
          <button type="button" className="sheet-close" onClick={onClose} style={{ fontSize: "20px", padding: "8px 14px" }}>
            ✕
          </button>
        </div>

        {error && <div className="message error" style={{ marginBottom: "14px" }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <h3 style={{ fontSize: "16px", marginBottom: "12px", color: "#34231c", fontWeight: "bold" }}>
              1. حدد الكميات وتعديل أسعار الإرجاع للقطع:
            </h3>
            <div className="table-wrap" style={{ maxHeight: "420px", overflowY: "auto", border: "1px solid #e2d4c5", borderRadius: "10px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f5ece3" }}>
                    <th style={{ padding: "12px", fontSize: "14px" }}>المنتج / المتغير</th>
                    <th style={{ padding: "12px", fontSize: "14px" }}>الكمية المباعة</th>
                    <th style={{ padding: "12px", fontSize: "14px" }}>مرجع سابقاً</th>
                    <th style={{ padding: "12px", fontSize: "14px" }}>المتاح للإرجاع</th>
                    <th style={{ padding: "12px", fontSize: "14px", width: "120px" }}>الكمية المرجعة</th>
                    <th style={{ padding: "12px", fontSize: "14px" }}>السعر الأصلي الصافي</th>
                    <th style={{ padding: "12px", fontSize: "14px", width: "160px" }}>سعر الإرجاع للقطعة (ج.م) ✏️</th>
                    <th style={{ padding: "12px", fontSize: "14px" }}>إجمالي مرتجع الصنف</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceDetail.items.map((item) => {
                    const alreadyReturned = returnedQtyMap.get(item.id) || 0;
                    const availableQty = Math.max(0, item.quantity - alreadyReturned);
                    const selectedQty = selectedQtyMap[item.id] || 0;
                    const originalNetUnitPrice = item.sellPricePiasters - item.discountEachPiasters;
                    const variantText = [item.color, item.size ? `مقاس ${item.size}` : ""].filter(Boolean).join(" · ");

                    return (
                      <tr key={item.id} style={availableQty === 0 ? { opacity: 0.5, background: "#f9f9f9" } : { borderBottom: "1px solid #efe8e1" }}>
                        <td style={{ padding: "12px" }}>
                          <strong style={{ fontSize: "14px" }}>{item.nameSnapshot}</strong>
                          {variantText && <small style={{ display: "block", color: "#785038", fontSize: "12px", marginTop: "2px" }}>{variantText}</small>}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center", fontSize: "14px" }}>{item.quantity}</td>
                        <td style={{ padding: "12px", textAlign: "center", fontSize: "14px" }}>
                          {alreadyReturned > 0 ? <strong style={{ color: "#b94d3f" }}>{alreadyReturned}</strong> : "0"}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center", fontSize: "14px" }}>
                          <strong style={{ color: availableQty > 0 ? "#24742c" : "#8b7b70" }}>{availableQty}</strong>
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <input
                            type="number"
                            min={0}
                            max={availableQty}
                            disabled={availableQty === 0}
                            value={selectedQty || ""}
                            placeholder="0"
                            onChange={(e) => {
                              const val = Math.min(availableQty, Math.max(0, Number(e.target.value)));
                              setSelectedQtyMap({ ...selectedQtyMap, [item.id]: val });
                            }}
                            style={{
                              width: "90px",
                              padding: "8px",
                              textAlign: "center",
                              fontWeight: "bold",
                              fontSize: "14px",
                              borderRadius: "8px",
                              border: "1px solid #d0c2b4",
                            }}
                          />
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <small style={{ color: "#8b7b70", fontSize: "13px" }}>{money(originalNetUnitPrice)}</small>
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <input
                            type="number"
                            step="0.01"
                            min={0}
                            disabled={availableQty === 0}
                            value={
                              customUnitPriceMap[item.id] !== undefined
                                ? customUnitPriceMap[item.id]
                                : (originalNetUnitPrice / 100).toString()
                            }
                            onChange={(e) =>
                              setCustomUnitPriceMap({
                                ...customUnitPriceMap,
                                [item.id]: e.target.value,
                              })
                            }
                            style={{
                              width: "120px",
                              padding: "8px 10px",
                              textAlign: "center",
                              fontWeight: "bold",
                              fontSize: "14px",
                              borderRadius: "8px",
                              border: "1.5px solid #c99a59",
                              background: "#fffdf9",
                            }}
                          />
                        </td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <strong style={{ color: "#b94d3f", fontSize: "15px" }}>{money(calculateLineRefund(item, selectedQty))}</strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ background: "#faf6f0", border: "1px solid #e2d4c5", borderRadius: "14px", padding: "20px" }}>
            <h3 style={{ fontSize: "15px", marginBottom: "12px", color: "#34231c", fontWeight: "bold" }}>
              2. طريقة الاسترداد والملاحظات:
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
              <div>
                <label style={{ marginBottom: "6px", display: "block", fontSize: "14px", fontWeight: 600 }}>وسيلة الاسترداد:</label>
                <BrandSelect
                  label="وسيلة الاسترداد"
                  value={refundMethod}
                  onValueChange={setRefundMethod}
                  placeholder="اختر وسيلة الاسترداد"
                  options={[
                    { value: "CASH", label: "💵 نقدياً (كاش)" },
                    { value: "INSTAPAY", label: "📲 إنستا باي" },
                    { value: "WALLET", label: "💳 محفظة إلكترونية" },
                    { value: "DEBT_DEDUCTION", label: "⏳ تخصيم من الآجل / حساب العميل" },
                  ]}
                />
              </div>

              <div>
                <label style={{ marginBottom: "6px", display: "block", fontSize: "14px", fontWeight: 600 }}>ملاحظات / سبب المرتجع:</label>
                <input
                  placeholder="سبب المرتجع أو حالة البضاعة..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ padding: "10px 12px", fontSize: "14px" }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e9e1d9", paddingTop: "18px", marginTop: "4px" }}>
            <div>
              <span style={{ fontSize: "14px", color: "#785038" }}>إجمالي مبلغ المرتجع المسترد:</span>
              <strong style={{ fontSize: "26px", color: "#b94d3f", marginRight: "12px", verticalAlign: "middle" }}>
                {money(totalRefundAmount)}
              </strong>
            </div>

            <div style={{ display: "flex", gap: "12px" }}>
              <button type="button" className="secondary" onClick={onClose} disabled={busy} style={{ padding: "10px 20px", fontSize: "14px" }}>
                إلغاء
              </button>
              <button
                type="submit"
                className="primary"
                style={{ background: "#b94d3f", borderColor: "#b94d3f", padding: "10px 24px", fontSize: "15px", fontWeight: "bold" }}
                disabled={busy || totalRefundAmount === 0}
              >
                {busy ? "جارٍ حفظ المرتجع…" : "تأكيد وإجراء المرتجع ↩️"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

function ReturnsPage({
  invoices,
  session,
  onRefreshData,
  onGoToReport,
}: {
  invoices: Invoice[];
  session: Session;
  onRefreshData?: () => void;
  onGoToReport?: () => void;
}) {
  const [invoiceNumberInput, setInvoiceNumberInput] = useState("");
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState<number | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetailView | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [refundModalOpen, setRefundModalOpen] = useState(false);

  async function searchInvoice(num: number) {
    setSelectedInvoiceNumber(num);
    setLoadingDetail(true);
    setDetailError("");
    setInvoiceDetail(null);
    try {
      const data = await invoke<InvoiceDetailView>("get_invoice_details", {
        token: session.token,
        invoiceNumber: num,
      });
      setInvoiceDetail(data);
    } catch (err: unknown) {
      setDetailError(String(err));
    } finally {
      setLoadingDetail(false);
    }
  }

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const num = Number(invoiceNumberInput.trim());
    if (num > 0) {
      void searchInvoice(num);
    }
  };

  const completedInvoices = invoices.filter((i) => i.status === "COMPLETED");

  return (
    <div className="stack">
      <section className="panel print-hide">
        <div className="section-head">
          <div>
            <h2>↩️ المرتجعات (عملية إرجاع)</h2>
            <p>ابحث برقم الفاتورة أو اختر فاتورة من القائمة لإجراء مرتجع وسحب الأصناف للمخزن</p>
          </div>
          {onGoToReport && (
            <button
              type="button"
              className="secondary"
              onClick={onGoToReport}
            >
              عرض تقرير المرتجعات ←
            </button>
          )}
        </div>

        <form onSubmit={handleSearchSubmit} className="inline" style={{ maxWidth: "600px" }}>
          <input
            type="number"
            min={1}
            className="search"
            placeholder="أدخل رقم الفاتورة المراد إرجاعها (مثال: 1001)..."
            value={invoiceNumberInput}
            onChange={(e) => setInvoiceNumberInput(e.target.value)}
            style={{ flex: 1, height: "46px" }}
          />
          <button type="submit" className="primary" style={{ padding: "0 22px" }}>
            بحث عن الفاتورة 🔍
          </button>
        </form>
      </section>

      {selectedInvoiceNumber !== null && (
        <section className="panel">
          <div className="section-head">
            <h3>نتيجة الفحص للفاتورة #{selectedInvoiceNumber}</h3>
            <button type="button" className="secondary" onClick={() => setSelectedInvoiceNumber(null)}>
              إغلاق البحث
            </button>
          </div>

          {loadingDetail && <div className="empty"><p>جارٍ تحميل بيانات الفاتورة…</p></div>}
          {detailError && <div className="message error">{detailError}</div>}

          {invoiceDetail && (
            <div>
              <div className="invoice-details-grid" style={{ marginBottom: "16px" }}>
                <div><small>رقم الفاتورة</small><strong>#{invoiceDetail.invoiceNumber}</strong></div>
                <div><small>الحالة</small><strong>{invoiceDetail.status === "COMPLETED" ? "مكتملة" : "مرتجعة/ملغاة بالكامل"}</strong></div>
                <div><small>البائع</small><strong>{invoiceDetail.sellerName}</strong></div>
                <div><small>العميل</small><strong>{invoiceDetail.customerName || "عميل نقدي"}</strong></div>
                <div><small>إجمالي الفاتورة</small><strong>{money(invoiceDetail.totalPiasters)}</strong></div>
                <div><small>المتبقي (الديون)</small><strong>{money(invoiceDetail.remainingPiasters)}</strong></div>
              </div>

              {invoiceDetail.status === "COMPLETED" ? (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className="primary"
                    style={{ background: "#b94d3f", borderColor: "#b94d3f", padding: "12px 24px", fontSize: "15px" }}
                    onClick={() => setRefundModalOpen(true)}
                  >
                    بدء إجراء المرتجع ↩️
                  </button>
                </div>
              ) : (
                <div className="message error">هذه الفاتورة مرتجعة/ملغاة بالكامل بالفعل ولا يمكن إجراء مرتجع آخر عليها.</div>
              )}
            </div>
          )}
        </section>
      )}

      <section className="panel">
        <div className="section-head">
          <h3>📋 الفواتير المتاحة للإرجاع ({completedInvoices.length})</h3>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>رقم الفاتورة</th>
                <th>التاريخ والوقت</th>
                <th>العميل</th>
                <th>البائع</th>
                <th>إجمالي الفاتورة</th>
                <th>المتبقي (الآجل)</th>
                <th>إجراء مرتجع</th>
              </tr>
            </thead>
            <tbody>
              {completedInvoices.slice(0, 30).map((inv) => (
                <tr key={inv.invoiceNumber}>
                  <td><strong style={{ color: "#785038" }}>#{inv.invoiceNumber}</strong></td>
                  <td><code>{formatDateTime(inv.createdAt)}</code></td>
                  <td>{inv.customerName || "عميل نقدي"}</td>
                  <td>{inv.sellerName}</td>
                  <td><strong>{money(inv.totalPiasters)}</strong></td>
                  <td>{inv.remainingPiasters > 0 ? <strong style={{ color: "#b64e17" }}>{money(inv.remainingPiasters)}</strong> : "0.00 ج.م"}</td>
                  <td>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => {
                        setInvoiceNumberInput(String(inv.invoiceNumber));
                        void searchInvoice(inv.invoiceNumber);
                      }}
                    >
                      عمل مرتجع ↩️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!completedInvoices.length && <Empty text="لا توجد فواتير مبيعات مكتملة للإرجاع بعد." />}
        </div>
      </section>

      {refundModalOpen && invoiceDetail && (
        <RefundModal
          invoiceDetail={invoiceDetail}
          session={session}
          onClose={() => setRefundModalOpen(false)}
          onSuccess={() => {
            setRefundModalOpen(false);
            setSelectedInvoiceNumber(null);
            if (onRefreshData) onRefreshData();
          }}
        />
      )}
    </div>
  );
}

function SalesReturnsReport({
  session,
  onRefreshData,
}: {
  session: Session;
  onRefreshData?: () => void;
}) {
  const [refunds, setRefunds] = useState<RefundView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"ALL" | "SINGLE" | "RANGE">("ALL");
  const [singleDate, setSingleDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [selectedRefundId, setSelectedRefundId] = useState<number | null>(null);
  const [refundDetail, setRefundDetail] = useState<RefundDetailView | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");

  const loadRefunds = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await invoke<RefundView[]>("list_refunds", { token: session.token });
      setRefunds(data);
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [session.token]);

  useEffect(() => {
    void loadRefunds();
  }, [loadRefunds]);

  async function openRefundDetails(refundId: number) {
    setSelectedRefundId(refundId);
    setLoadingDetail(true);
    setDetailError("");
    setRefundDetail(null);
    try {
      const data = await invoke<RefundDetailView>("get_refund_details", {
        token: session.token,
        refundId,
      });
      setRefundDetail(data);
    } catch (err: unknown) {
      setDetailError(String(err));
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleDeleteRefund(refundId: number, refundNumber: number) {
    if (!window.confirm(`هل أنت على وشك حذف وإلغاء عملية المرتجع #${refundNumber}؟ سيتم خصم البضاعة من المخزن مجدداً واستعادة حالة الفاتورة.`)) {
      return;
    }
    try {
      await invoke("delete_refund", { token: session.token, refundId });
      void loadRefunds();
      if (onRefreshData) onRefreshData();
    } catch (err: unknown) {
      alert(`خطأ في حذف المرتجع: ${String(err)}`);
    }
  }

  const filteredRefunds = refunds.filter((ref) => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const refNumStr = String(ref.refundNumber);
      const invNumStr = String(ref.invoiceNumber);
      const custName = (ref.customerName || "").toLowerCase();
      const sellerName = (ref.sellerName || "").toLowerCase();
      const perfName = (ref.performedByName || "").toLowerCase();
      if (
        !refNumStr.includes(q) &&
        !invNumStr.includes(q) &&
        !custName.includes(q) &&
        !sellerName.includes(q) &&
        !perfName.includes(q)
      ) {
        return false;
      }
    }

    const refDateStr = getLocalDateString(ref.createdAt);

    if (dateFilterType === "SINGLE") {
      if (singleDate && refDateStr !== singleDate) {
        return false;
      }
    } else if (dateFilterType === "RANGE") {
      if (fromDate && refDateStr < fromDate) {
        return false;
      }
      if (toDate && refDateStr > toDate) {
        return false;
      }
    }

    return true;
  });

  const totalRefundAmount = filteredRefunds.reduce((acc, r) => acc + r.totalRefundPiasters, 0);
  const totalCashRefund = filteredRefunds.filter((r) => r.refundMethod === "CASH").reduce((acc, r) => acc + r.totalRefundPiasters, 0);
  const totalInstapayRefund = filteredRefunds.filter((r) => r.refundMethod === "INSTAPAY").reduce((acc, r) => acc + r.totalRefundPiasters, 0);
  const totalWalletRefund = filteredRefunds.filter((r) => r.refundMethod === "WALLET").reduce((acc, r) => acc + r.totalRefundPiasters, 0);
  const totalDebtRefund = filteredRefunds.filter((r) => r.refundMethod === "DEBT_DEDUCTION").reduce((acc, r) => acc + r.totalRefundPiasters, 0);

  return (
    <div className="stack" data-print-document="returns-report">
      <section className="panel print-hide">
        <div className="section-head">
          <div>
            <h2>↩️ المرتجعات</h2>
            <p>سجل ورصد كافه عمليات إرجاع الأصناف، الفواتير المرتجعة، ووسائل الاسترداد المالية</p>
          </div>
          <button
            type="button"
            className="primary"
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
            onClick={() => void printDocumentFromPage("returns-report", "تقرير المرتجعات")}
          >
            <LuPrinter style={{ fontSize: "18px" }} /> طباعة تقرير المرتجعات
          </button>
        </div>

        <div style={{ background: "#faf8f5", padding: "16px", borderRadius: "12px", border: "1px solid #e9e1d9", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center" }}>
            <div style={{ flex: "1 1 280px" }}>
              <label style={{ marginBottom: "6px" }}>🔍 بحث برقم المرتجع/الفاتورة أو اسم العميل / البائع</label>
              <input
                className="search full"
                placeholder="أدخل رقم المرتجع أو رقم الفاتورة أو العميل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ height: "42px", fontSize: "14px" }}
              />
            </div>

            <div style={{ flex: "0 0 auto" }}>
              <label style={{ marginBottom: "6px" }}>📅 تصفية حسب التاريخ</label>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  className="preset-btn"
                  style={dateFilterType === "ALL" ? { background: "#785038", color: "#fff", borderColor: "#785038" } : {}}
                  onClick={() => setDateFilterType("ALL")}
                >
                  الكل
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  style={dateFilterType === "SINGLE" ? { background: "#785038", color: "#fff", borderColor: "#785038" } : {}}
                  onClick={() => setDateFilterType("SINGLE")}
                >
                  تاريخ محدد
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  style={dateFilterType === "RANGE" ? { background: "#785038", color: "#fff", borderColor: "#785038" } : {}}
                  onClick={() => setDateFilterType("RANGE")}
                >
                  من - إلى
                </button>
              </div>
            </div>
          </div>

          {dateFilterType === "SINGLE" && (
            <div style={{ display: "flex", gap: "12px", alignItems: "center", maxWidth: "320px" }}>
              <label style={{ margin: 0, whiteSpace: "nowrap" }}>اختر التاريخ:</label>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #dfd5ca" }}
              />
              {singleDate && (
                <button type="button" className="link-button" onClick={() => setSingleDate("")}>
                  مسح
                </button>
              )}
            </div>
          )}

          {dateFilterType === "RANGE" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <label style={{ margin: 0, whiteSpace: "nowrap" }}>من تاريخ:</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #dfd5ca" }}
                />
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <label style={{ margin: 0, whiteSpace: "nowrap" }}>إلى تاريخ:</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #dfd5ca" }}
                />
              </div>
              {(fromDate || toDate) && (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                  }}
                >
                  إعادة ضبط النطاق
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="print-only-header" style={{ display: "none" }}>
        <h1 style={{ textAlign: "center", marginBottom: "4px" }}>مؤسسة المرسي - تقرير مرتجعات المبيعات</h1>
        <p style={{ textAlign: "center", color: "#666", fontSize: "12px", marginBottom: "16px" }}>
          {dateFilterType === "SINGLE" && singleDate ? `بتاريخ: ${singleDate}` : ""}
          {dateFilterType === "RANGE" && (fromDate || toDate) ? `الفترة من: ${fromDate || "بداية التسجيل"} إلى: ${toDate || "اليوم"}` : ""}
          {dateFilterType === "ALL" ? "تقرير المرتجعات الشامل" : ""}
        </p>
      </div>

      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h3 style={{ margin: 0 }}>↩️ قائمة المرتجعات ({filteredRefunds.length})</h3>
        </div>

        {loading && <div className="empty"><p>جارٍ تحميل تقرير المرتجعات…</p></div>}
        {error && <div className="message error">{error}</div>}

        {!loading && !error && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>رقم المرتجع</th>
                  <th>الفاتورة الأصلية</th>
                  <th>التاريخ والوقت</th>
                  <th>العميل</th>
                  <th>البائع</th>
                  <th>تم بواسطة</th>
                  <th>طريقة الاسترداد</th>
                  <th>إجمالي المسترد</th>
                  <th>ملاحظات</th>
                  <th className="print-hide">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRefunds.map((ref) => (
                  <tr key={ref.id}>
                    <td><strong style={{ color: "#b94d3f" }}>#{ref.refundNumber}</strong></td>
                    <td><strong>#{ref.invoiceNumber}</strong></td>
                    <td><code>{formatDateTime(ref.createdAt)}</code></td>
                    <td>{ref.customerName || "عميل نقدي"}</td>
                    <td>{ref.sellerName}</td>
                    <td><small>{ref.performedByName}</small></td>
                    <td>{getMethodBadge(ref.refundMethod)}</td>
                    <td><strong style={{ color: "#b94d3f" }}>{money(ref.totalRefundPiasters)}</strong></td>
                    <td><small style={{ color: "#785038" }}>{ref.notes || "—"}</small></td>
                    <td className="print-hide">
                      <div className="action-cell">
                        <button
                          type="button"
                          className="edit-button"
                          onClick={() => openRefundDetails(ref.id)}
                        >
                          عرض 🔍
                        </button>
                        {session.role === "ADMIN" && (
                          <button
                            type="button"
                            className="danger-button"
                            onClick={() => handleDeleteRefund(ref.id, ref.refundNumber)}
                          >
                            حذف 🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredRefunds.length && <Empty text="لا توجد عمليات إرجاع مطابقة لمعايير البحث والمحيط المحدد." />}
          </div>
        )}
      </section>

      <section className="panel sales-report-summary-card" style={{ background: "linear-gradient(135deg, #ffffff, #fff5f5)", border: "2px solid #f5c6cb", borderRadius: "16px", padding: "24px" }}>
        <h3 style={{ borderBottom: "1px solid #f5c6cb", paddingBottom: "12px", marginBottom: "18px", color: "#9f352a", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📉</span> ملخص المرتجعات للفترة المحددة
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "14px", marginBottom: "20px" }}>
          <div style={{ background: "#fff", padding: "14px", borderRadius: "12px", border: "1px solid #f5c6cb" }}>
            <span style={{ fontSize: "12px", color: "#9f352a", display: "block" }}>إجمالي مبالغ المرتجعات</span>
            <strong style={{ fontSize: "22px", color: "#9f352a", marginTop: "4px", display: "block" }}>{money(totalRefundAmount)}</strong>
          </div>

          <div style={{ background: "#fff", padding: "14px", borderRadius: "12px", border: "1px solid #e9e1d9" }}>
            <span style={{ fontSize: "12px", color: "#8b7b70", display: "block" }}>عدد عمليات الإرجاع</span>
            <strong style={{ fontSize: "22px", color: "#785038", marginTop: "4px", display: "block" }}>{filteredRefunds.length} عملية</strong>
          </div>

          <div style={{ background: "#fff", padding: "14px", borderRadius: "12px", border: "1px solid #e9e1d9" }}>
            <span style={{ fontSize: "12px", color: "#8b7b70", display: "block" }}>استرداد نقدي (كاش)</span>
            <strong style={{ fontSize: "18px", color: "#24742c", marginTop: "4px", display: "block" }}>{money(totalCashRefund)}</strong>
          </div>

          <div style={{ background: "#fff", padding: "14px", borderRadius: "12px", border: "1px solid #e9e1d9" }}>
            <span style={{ fontSize: "12px", color: "#8b7b70", display: "block" }}>استرداد إنستا باي / محفظة</span>
            <strong style={{ fontSize: "18px", color: "#2b569a", marginTop: "4px", display: "block" }}>{money(totalInstapayRefund + totalWalletRefund)}</strong>
          </div>

          <div style={{ background: "#fff", padding: "14px", borderRadius: "12px", border: "1px solid #e9e1d9" }}>
            <span style={{ fontSize: "12px", color: "#8b7b70", display: "block" }}>خصم من الآجل / الديون</span>
            <strong style={{ fontSize: "18px", color: "#b64e17", marginTop: "4px", display: "block" }}>{money(totalDebtRefund)}</strong>
          </div>
        </div>
      </section>

      {selectedRefundId !== null && (
        <div
          className="variant-picker-overlay print-hide"
          style={{ zIndex: 3200 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedRefundId(null);
          }}
        >
          <section className="invoice-details-dialog" data-print-document="refund-slip" style={{ maxWidth: "780px", zIndex: 3201, position: "relative" }}>
            <div className="invoice-details-header">
              <div>
                <h2>↩️ تفاصيل المرتجع #{refundDetail?.refund.refundNumber}</h2>
                {refundDetail && (
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#8b7b70" }}>
                    للفاتورة الأصلية #{refundDetail.refund.invoiceNumber} · تم الإجراء في {formatDateTime(refundDetail.refund.createdAt)}
                  </p>
                )}
              </div>
              <button type="button" className="sheet-close" onClick={() => setSelectedRefundId(null)}>
                ✕
              </button>
            </div>

            {loadingDetail && <div className="empty"><p>جارٍ تحميل تفاصيل المرتجع…</p></div>}
            {detailError && <div className="message error">{detailError}</div>}

            {refundDetail && (
              <div>
                <div className="invoice-details-grid" style={{ marginBottom: "16px" }}>
                  <div><small>رقم المرتجع</small><strong>#{refundDetail.refund.refundNumber}</strong></div>
                  <div><small>رقم الفاتورة الأصلي</small><strong>#{refundDetail.refund.invoiceNumber}</strong></div>
                  <div><small>العميل</small><strong>{refundDetail.refund.customerName || "عميل نقدي"}</strong></div>
                  <div><small>البائع الأصلي</small><strong>{refundDetail.refund.sellerName}</strong></div>
                  <div><small>من قام بالإرجاع</small><strong>{refundDetail.refund.performedByName}</strong></div>
                  <div><small>طريقة الاسترداد</small><strong>{getMethodBadge(refundDetail.refund.refundMethod)}</strong></div>
                  {refundDetail.refund.notes && <div style={{ gridColumn: "1 / -1" }}><small>ملاحظات المرتجع</small><strong>{refundDetail.refund.notes}</strong></div>}
                </div>

                <h3 style={{ fontSize: "15px", marginBottom: "10px", color: "#34231c" }}>📦 المنتجات البضاعة المرتجعة للمخزن:</h3>
                <div className="table-wrap" style={{ marginBottom: "16px" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>المنتج / المتغير</th>
                        <th>الكمية المرجعة</th>
                        <th>سعر الوحدة</th>
                        <th>إجمالي المسترد</th>
                      </tr>
                    </thead>
                    <tbody>
                      {refundDetail.items.map((item, idx) => {
                        const variantText = [item.color, item.size ? `مقاس ${item.size}` : ""].filter(Boolean).join(" · ");
                        return (
                          <tr key={idx}>
                            <td>
                              <strong>{item.nameSnapshot}</strong>
                              {variantText && <small style={{ display: "block", color: "#785038" }}>{variantText}</small>}
                            </td>
                            <td><strong style={{ color: "#24742c" }}>{item.quantity} قطعة</strong></td>
                            <td>{money(item.unitPricePiasters)}</td>
                            <td><strong style={{ color: "#b94d3f" }}>{money(item.lineTotalPiasters)}</strong></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="sheet-totals" style={{ marginTop: "0" }}>
                  <div className="total grand" style={{ color: "#b94d3f" }}>
                    <span>إجمالي المرتجع المسترد</span>
                    <strong>{money(refundDetail.refund.totalRefundPiasters)}</strong>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
                  <button type="button" className="secondary" onClick={() => void printDocumentFromPage("refund-slip", "سند المرتجع")}>طباعة سند المرتجع 🖨️</button>
                  <button type="button" className="primary" onClick={() => setSelectedRefundId(null)}>إغلاق</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Invoices({
  active = true,
  invoices,
  session,
  targetInvoiceNumber,
  onClearTargetInvoice,
  onRefreshData,
}: {
  active?: boolean;
  invoices: Invoice[];
  session: Session;
  targetInvoiceNumber?: number | null;
  onClearTargetInvoice?: () => void;
  onRefreshData?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "custom">("all");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState<number | null>(null);
  const [refundInvoiceDetail, setRefundInvoiceDetail] = useState<InvoiceDetailView | null>(null);
  const [thermalReceiptDetail, setThermalReceiptDetail] = useState<InvoiceDetailView | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetailView | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");

  async function openInvoiceDetails(num: number) {
    setSelectedInvoiceNumber(num);
    setLoadingDetail(true);
    setDetailError("");
    setInvoiceDetail(null);
    try {
      const data = await invoke<InvoiceDetailView>("get_invoice_details", {
        token: session.token,
        invoiceNumber: num,
      });
      setInvoiceDetail(data);
    } catch (err: unknown) {
      setDetailError(String(err));
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    if (targetInvoiceNumber) {
      setDateFilter("all");
      void openInvoiceDetails(targetInvoiceNumber);
      if (onClearTargetInvoice) onClearTargetInvoice();
    }
  }, [targetInvoiceNumber]);

  // Dates for period filters
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const weekStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  weekStartDate.setDate(weekStartDate.getDate() - 6);
  const weekStartStr = `${weekStartDate.getFullYear()}-${String(weekStartDate.getMonth() + 1).padStart(2, "0")}-${String(weekStartDate.getDate()).padStart(2, "0")}`;

  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Counts of invoices for each period tab
  const counts = useMemo(() => {
    let todayCount = 0;
    let weekCount = 0;
    let monthCount = 0;

    for (const inv of invoices) {
      const d = getLocalDateString(inv.createdAt);
      if (d === todayStr) todayCount++;
      if (d >= weekStartStr) weekCount++;
      if (d.startsWith(monthPrefix)) monthCount++;
    }

    return {
      all: invoices.length,
      today: todayCount,
      week: weekCount,
      month: monthCount,
    };
  }, [invoices, todayStr, weekStartStr, monthPrefix]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((x) => {
      // 1. Text search filter
      if (search.trim()) {
        const q = normalizeArabic(search.trim());
        const numStr = String(x.invoiceNumber);
        const seller = normalizeArabic(x.sellerName || "");
        const cust = normalizeArabic(x.customerName || "عميل نقدي");
        if (!numStr.includes(q) && !seller.includes(q) && !cust.includes(q)) {
          return false;
        }
      }

      // 2. Date filter
      const invDate = getLocalDateString(x.createdAt);
      if (dateFilter === "today") {
        if (invDate !== todayStr) return false;
      } else if (dateFilter === "week") {
        if (invDate < weekStartStr) return false;
      } else if (dateFilter === "month") {
        if (!invDate.startsWith(monthPrefix)) return false;
      } else if (dateFilter === "custom") {
        if (customFromDate && invDate < customFromDate) return false;
        if (customToDate && invDate > customToDate) return false;
      }

      return true;
    });
  }, [invoices, search, dateFilter, customFromDate, customToDate, todayStr, weekStartStr, monthPrefix]);

  const summary = useMemo(() => {
    const completed = filteredInvoices.filter((i) => i.status === "COMPLETED");
    const cancelled = filteredInvoices.filter((i) => i.status === "CANCELLED");
    const totalSales = completed.reduce((acc, i) => acc + (i.totalPiasters || 0), 0);
    const totalRemaining = completed.reduce((acc, i) => acc + (i.remainingPiasters || 0), 0);
    const totalPaidCash = completed.reduce((acc, i) => acc + (i.paidCashPiasters || 0), 0);
    const totalPaidInstapay = completed.reduce((acc, i) => acc + (i.paidInstapayPiasters || 0), 0);
    const totalPaidWallet = completed.reduce((acc, i) => acc + (i.paidWalletPiasters || 0), 0);
    const totalCollected = totalPaidCash + totalPaidInstapay + totalPaidWallet;

    return {
      totalCount: filteredInvoices.length,
      completedCount: completed.length,
      cancelledCount: cancelled.length,
      totalSales,
      totalRemaining,
      totalCollected,
    };
  }, [filteredInvoices]);

  useEffect(() => {
    if (!active) return;
    function handleInvoiceKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (refundInvoiceDetail !== null) {
          e.preventDefault();
          setRefundInvoiceDetail(null);
        } else if (thermalReceiptDetail !== null) {
          e.preventDefault();
          setThermalReceiptDetail(null);
        } else if (selectedInvoiceNumber !== null) {
          e.preventDefault();
          setSelectedInvoiceNumber(null);
          setInvoiceDetail(null);
        }
      } else if (selectedInvoiceNumber !== null && refundInvoiceDetail === null && thermalReceiptDetail === null) {
        const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea") return;

        const activeList = filteredInvoices.some((x) => x.invoiceNumber === selectedInvoiceNumber)
          ? filteredInvoices
          : invoices;
        const currentIndex = activeList.findIndex((x) => x.invoiceNumber === selectedInvoiceNumber);

        if (e.key === "ArrowRight") {
          // In RTL, ArrowRight moves to previous invoice in list
          if (currentIndex > 0) {
            e.preventDefault();
            void openInvoiceDetails(activeList[currentIndex - 1].invoiceNumber);
          }
        } else if (e.key === "ArrowLeft") {
          // In RTL, ArrowLeft moves to next invoice in list
          if (currentIndex !== -1 && currentIndex < activeList.length - 1) {
            e.preventDefault();
            void openInvoiceDetails(activeList[currentIndex + 1].invoiceNumber);
          }
        }
      }
    }
    window.addEventListener("keydown", handleInvoiceKeyDown);
    return () => window.removeEventListener("keydown", handleInvoiceKeyDown);
  }, [active, selectedInvoiceNumber, refundInvoiceDetail, thermalReceiptDetail, filteredInvoices, invoices]);

  // If an invoice is selected, display its full details in breadcrumb mode instead of a dialog overlay
  if (selectedInvoiceNumber !== null) {
    const activeList = filteredInvoices.some((x) => x.invoiceNumber === selectedInvoiceNumber)
      ? filteredInvoices
      : invoices;
    const currentIndex = activeList.findIndex((x) => x.invoiceNumber === selectedInvoiceNumber);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex !== -1 && currentIndex < activeList.length - 1;

    const goToPrev = () => {
      if (hasPrev) {
        void openInvoiceDetails(activeList[currentIndex - 1].invoiceNumber);
      }
    };

    const goToNext = () => {
      if (hasNext) {
        void openInvoiceDetails(activeList[currentIndex + 1].invoiceNumber);
      }
    };

    return (
      <div className="stack print-hide">
        {/* Breadcrumb & Navigation Controls */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "4px",
        }}>
          <div className="breadcrumb" style={{ margin: 0 }}>
            <button
              type="button"
              className="link-button"
              onClick={() => {
                setSelectedInvoiceNumber(null);
                setInvoiceDetail(null);
              }}
            >
              → سجل الفواتير
            </button>
            <span>/ تفاصيل الفاتورة #{selectedInvoiceNumber}</span>
          </div>

          {/* Quick Pagination between invoices */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {currentIndex !== -1 && (
              <span style={{ fontSize: "13px", color: "#8b7b70", marginLeft: "4px", fontWeight: 700 }}>
                فاتورة {currentIndex + 1} من {activeList.length}
              </span>
            )}

            <button
              type="button"
              className="secondary"
              disabled={!hasPrev}
              onClick={goToPrev}
              title={hasPrev ? `الانتقال للفاتورة السابقة #${activeList[currentIndex - 1]?.invoiceNumber}` : "لا توجد فاتورة سابقة"}
              style={{
                padding: "7px 14px",
                fontSize: "13px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                opacity: hasPrev ? 1 : 0.45,
                fontWeight: 700,
              }}
            >
              <span>▶</span> الفاتورة السابقة
            </button>

            <button
              type="button"
              className="secondary"
              disabled={!hasNext}
              onClick={goToNext}
              title={hasNext ? `الانتقال للفاتورة التالية #${activeList[currentIndex + 1]?.invoiceNumber}` : "لا توجد فاتورة تالية"}
              style={{
                padding: "7px 14px",
                fontSize: "13px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                opacity: hasNext ? 1 : 0.45,
                fontWeight: 700,
              }}
            >
              الفاتورة التالية <span>◀</span>
            </button>

            <button
              type="button"
              className="primary"
              onClick={() => {
                setSelectedInvoiceNumber(null);
                setInvoiceDetail(null);
              }}
              style={{ padding: "7px 16px", fontSize: "13px" }}
            >
              ✕ العودة لقائمة الفواتير
            </button>
          </div>
        </div>

        {/* Invoice Detail Card Panel */}
        <section className="panel" style={{ padding: "26px" }}>
          <div className="section-head" style={{ marginBottom: "20px", borderBottom: "1px solid #f0eae4", paddingBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <h2 style={{ fontSize: "22px", margin: 0 }}>تفاصيل الفاتورة #{selectedInvoiceNumber}</h2>
                {invoiceDetail && (
                  <span className="pill" style={{
                    background: invoiceDetail.status === "COMPLETED" ? "#e8f5e9" : "#ffebee",
                    color: invoiceDetail.status === "COMPLETED" ? "#2e7d32" : "#c62828",
                    fontWeight: 800,
                    fontSize: "13px",
                    padding: "4px 12px",
                  }}>
                    {invoiceDetail.status === "COMPLETED" ? "✓ مكتملة" : "✕ ملغاة"}
                  </span>
                )}
              </div>
              {invoiceDetail && (
                <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#8b7b70" }}>
                  تم إصدارها في <strong>{formatDateTime(invoiceDetail.createdAt)}</strong> · الموظف البائع: <strong>{invoiceDetail.sellerName}</strong>
                </p>
              )}
            </div>

            {invoiceDetail && (
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                {invoiceDetail.status === "COMPLETED" && (
                  <button
                    type="button"
                    className="danger-button"
                    style={{ padding: "8px 16px", fontSize: "13px" }}
                    onClick={() => setRefundInvoiceDetail(invoiceDetail)}
                  >
                    إجراء مرتجع ↩️
                  </button>
                )}
                <button
                  type="button"
                  className="secondary"
                  style={{ padding: "8px 16px", fontSize: "13px" }}
                  onClick={() => setThermalReceiptDetail(invoiceDetail)}
                >
                  طباعة الفاتورة 🖨️
                </button>
              </div>
            )}
          </div>

          {loadingDetail && (
            <div className="empty"><p>جارٍ تحميل تفاصيل الفاتورة…</p></div>
          )}

          {detailError && (
            <div className="message error">{detailError}</div>
          )}

          {invoiceDetail && (
            <div>
              <div className="invoice-details-grid">
                <div><small>رقم الفاتورة</small><strong>#{invoiceDetail.invoiceNumber}</strong></div>
                <div><small>الحالة</small><strong>{invoiceDetail.status === "COMPLETED" ? "مكتملة" : "ملغاة"}</strong></div>
                {invoiceDetail.onlineOrderNumber && (
                  <div><small>نوع الفاتورة</small><strong style={{ color: "#854d0e" }}>📦 طلب أونلاين #{invoiceDetail.onlineOrderNumber}</strong></div>
                )}
                <div><small>الموظف البائع</small><strong>{invoiceDetail.sellerName}</strong></div>
                <div><small>العميل</small><strong>{invoiceDetail.customerName || "عميل نقدي"}</strong></div>
                {invoiceDetail.customerPhone && <div><small>رقم هاتف العميل</small><strong>{invoiceDetail.customerPhone}</strong></div>}
                {invoiceDetail.notes && <div style={{ gridColumn: "1 / -1" }}><small>ملاحظات</small><strong>{invoiceDetail.notes}</strong></div>}
              </div>

              <h3 style={{ fontSize: "16px", margin: "20px 0 10px", color: "#34231c" }}>المنتجات والأصناف ({invoiceDetail.items.length} صنف)</h3>
              <div className="table-wrap" style={{ marginBottom: "20px" }}>
                <table>
                  <thead>
                    <tr>
                      <th>المنتج / المتغير</th>
                      <th>المخزن</th>
                      <th>الكمية</th>
                      <th>السعر</th>
                      <th>الخصم</th>
                      <th>المجموع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceDetail.items.map((item, index) => {
                      const variantText = [item.color, item.size ? `مقاس ${item.size}` : ""].filter(Boolean).join(" · ");
                      return (
                        <tr key={index}>
                          <td>
                            <strong>{item.nameSnapshot}</strong>
                            {variantText && <small style={{ display: "block", color: "#785038" }}>{variantText}</small>}
                          </td>
                          <td>{item.warehouseName}</td>
                          <td><strong>{item.quantity}</strong></td>
                          <td>{money(item.sellPricePiasters)}</td>
                          <td>{money(item.discountEachPiasters * item.quantity)}</td>
                          <td><strong>{money(item.lineTotalPiasters)}</strong></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="sheet-totals" style={{ marginTop: "0" }}>
                {(invoiceDetail.shippingFeePiasters || 0) > 0 ? (
                  <>
                    <div className="total"><span>إجمالي المنتجات</span><strong>{money(invoiceDetail.subtotalPiasters - (invoiceDetail.shippingFeePiasters || 0))}</strong></div>
                    <div className="total"><span>مصاريف الشحن</span><strong>+{money(invoiceDetail.shippingFeePiasters || 0)}</strong></div>
                  </>
                ) : (
                  <div className="total"><span>المجموع الفرعي</span><strong>{money(invoiceDetail.subtotalPiasters)}</strong></div>
                )}
                {(invoiceDetail.extraDiscountPiasters || 0) > 0 ? (
                  <>
                    {invoiceDetail.discountPiasters - (invoiceDetail.extraDiscountPiasters || 0) > 0 && (
                      <div className="total"><span>خصم القطع</span><strong>{money(invoiceDetail.discountPiasters - (invoiceDetail.extraDiscountPiasters || 0))}</strong></div>
                    )}
                    <div className="total"><span>خصم الفاتورة</span><strong>{money(invoiceDetail.extraDiscountPiasters || 0)}</strong></div>
                    <div className="total"><span>إجمالي الخصم</span><strong>{money(invoiceDetail.discountPiasters)}</strong></div>
                  </>
                ) : (
                  <div className="total"><span>الخصم</span><strong>{money(invoiceDetail.discountPiasters)}</strong></div>
                )}
                <div className="total grand"><span>إجمالي الفاتورة</span><strong>{money(invoiceDetail.totalPiasters)}</strong></div>
                <div className="divider" style={{ margin: "10px 0" }} />
                {(invoiceDetail.depositPiasters || 0) > 0 ? (
                  <>
                    <div className="total" style={{ color: "#1b5e20" }}><span>العربون المدفوع</span><strong>{money(invoiceDetail.depositPiasters || 0)}</strong></div>
                    <div className="total" style={{ color: "#b94d3f", fontWeight: "bold" }}><span>المطلوب عند الاستلام</span><strong>{money(Math.max(0, invoiceDetail.totalPiasters - (invoiceDetail.depositPiasters || 0)))}</strong></div>
                  </>
                ) : invoiceDetail.onlineOrderNumber ? (
                  <div className="total" style={{ color: "#b94d3f", fontWeight: "bold" }}><span>المطلوب عند الاستلام</span><strong>{money(invoiceDetail.totalPiasters)}</strong></div>
                ) : (
                  <>
                    {invoiceDetail.paidCashPiasters > 0 && <div className="total"><span>المدفوع نقدي</span><strong>{money(invoiceDetail.paidCashPiasters)}</strong></div>}
                    {invoiceDetail.paidInstapayPiasters > 0 && <div className="total"><span>المدفوع إنستاباي</span><strong>{money(invoiceDetail.paidInstapayPiasters)}</strong></div>}
                    {invoiceDetail.paidWalletPiasters > 0 && <div className="total"><span>المدفوع محفظة</span><strong>{money(invoiceDetail.paidWalletPiasters)}</strong></div>}
                    {invoiceDetail.remainingPiasters > 0 && <div className="total" style={{ color: "#b94d3f" }}><span>المتبقي (آجل)</span><strong>{money(invoiceDetail.remainingPiasters)}</strong></div>}
                  </>
                )}
                {session.role === "ADMIN" && (
                  <div className="metrics" style={{ marginTop: "12px" }}>
                    <span title="إجمالي التكلفة">{money(invoiceDetail.items.reduce((s, i) => s + i.buyPricePiasters * i.quantity, 0))}</span>
                    <span title="صافي ربح الفاتورة">{money(invoiceDetail.totalPiasters - (invoiceDetail.shippingFeePiasters || 0) - invoiceDetail.items.reduce((s, i) => s + i.buyPricePiasters * i.quantity, 0))}</span>
                  </div>
                )}
              </div>

              {/* Bottom Navigation & Actions Bar */}
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                marginTop: "24px",
                paddingTop: "16px",
                borderTop: "1px solid #f0eae4",
              }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button
                    type="button"
                    className="secondary"
                    disabled={!hasPrev}
                    onClick={goToPrev}
                    style={{ padding: "8px 16px", fontSize: "13px", opacity: hasPrev ? 1 : 0.45, fontWeight: 700 }}
                  >
                    <span>▶</span> الفاتورة السابقة
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    disabled={!hasNext}
                    onClick={goToNext}
                    style={{ padding: "8px 16px", fontSize: "13px", opacity: hasNext ? 1 : 0.45, fontWeight: 700 }}
                  >
                    الفاتورة التالية <span>◀</span>
                  </button>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  {invoiceDetail.status === "COMPLETED" && (
                    <button
                      type="button"
                      className="danger-button"
                      style={{ padding: "8px 16px", fontSize: "13px" }}
                      onClick={() => setRefundInvoiceDetail(invoiceDetail)}
                    >
                      إجراء مرتجع ↩️
                    </button>
                  )}
                  <button type="button" className="secondary" onClick={() => setThermalReceiptDetail(invoiceDetail)}>طباعة الفاتورة 🖨️</button>
                  <button type="button" className="primary" onClick={() => { setSelectedInvoiceNumber(null); setInvoiceDetail(null); }}>
                    العودة لقائمة الفواتير
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {refundInvoiceDetail !== null && (
          <RefundModal
            invoiceDetail={refundInvoiceDetail}
            session={session}
            onClose={() => setRefundInvoiceDetail(null)}
            onSuccess={() => {
              setRefundInvoiceDetail(null);
              if (selectedInvoiceNumber !== null) {
                void openInvoiceDetails(selectedInvoiceNumber);
              }
              if (onRefreshData) onRefreshData();
            }}
          />
        )}

        {thermalReceiptDetail !== null && (
          <ThermalReceiptModal
            invoiceDetail={thermalReceiptDetail}
            onClose={() => setThermalReceiptDetail(null)}
          />
        )}
      </div>
    );
  }

  return (
    <section className="panel">
      <div className="section-head" style={{ marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h2>سجل الفواتير</h2>
          <p>عرض وإدارة وتصفية الفواتير المحفوظة في النظام</p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flex: "1 1 320px", maxWidth: "480px" }}>
          <input
            className="search full"
            placeholder="🔍 بحث برقم الفاتورة أو اسم البائع أو العميل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ height: "44px", fontSize: "14px" }}
          />
          {search && (
            <button
              type="button"
              className="link-button"
              style={{ fontSize: "12px", color: "#b94d3f", whiteSpace: "nowrap" }}
              onClick={() => setSearch("")}
            >
              مسح
            </button>
          )}
        </div>
      </div>

      {/* Date Filter Bar */}
      <div style={{
        background: "#faf8f5",
        padding: "14px 16px",
        borderRadius: "12px",
        border: "1px solid #e9e1d9",
        marginBottom: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 800, fontSize: "13px", color: "#5d3a28" }}>📅 تصفية حسب الفترة:</span>
          </div>

          {/* Preset Filter Tabs */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            background: "#f4ede4",
            padding: "4px",
            borderRadius: "10px",
            border: "1px solid #e0d0c0",
            flexWrap: "wrap",
          }}>
            {[
              { id: "all", label: "الكل", count: counts.all, icon: "📋" },
              { id: "today", label: "اليوم", count: counts.today, icon: "📅" },
              { id: "week", label: "الأسبوع", count: counts.week, icon: "🗓️", title: "آخر ٧ أيام" },
              { id: "month", label: "الشهر", count: counts.month, icon: "📆", title: "الشهر الحالي" },
              { id: "custom", label: "مخصص", icon: "⚙️", title: "تحديد نطاق تواريخ مخصص" },
            ].map((tab) => {
              const active = dateFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  title={tab.title}
                  onClick={() => setDateFilter(tab.id as any)}
                  style={{
                    border: "none",
                    background: active ? "#785038" : "transparent",
                    color: active ? "#fff" : "#5d3a28",
                    padding: "7px 15px",
                    borderRadius: "8px",
                    fontWeight: active ? 800 : 600,
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.15s ease",
                    boxShadow: active ? "0 2px 6px rgba(120, 80, 56, 0.25)" : "none",
                  }}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      style={{
                        background: active ? "rgba(255, 255, 255, 0.25)" : "#e8ded2",
                        color: active ? "#fff" : "#5d3a28",
                        padding: "2px 7px",
                        borderRadius: "12px",
                        fontSize: "11px",
                        fontWeight: 800,
                      }}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Date Range Controls */}
        {dateFilter === "custom" && (
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
            padding: "12px 14px",
            background: "#ffffff",
            borderRadius: "9px",
            border: "1px solid #ebdcd0",
          }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <label style={{ margin: 0, whiteSpace: "nowrap", fontSize: "13px", fontWeight: 700, color: "#5d3a28" }}>
                من تاريخ:
              </label>
              <input
                type="date"
                value={customFromDate}
                onChange={(e) => setCustomFromDate(e.target.value)}
                style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #dfd5ca", fontSize: "13px", width: "auto" }}
              />
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <label style={{ margin: 0, whiteSpace: "nowrap", fontSize: "13px", fontWeight: 700, color: "#5d3a28" }}>
                إلى تاريخ:
              </label>
              <input
                type="date"
                value={customToDate}
                onChange={(e) => setCustomToDate(e.target.value)}
                style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid #dfd5ca", fontSize: "13px", width: "auto" }}
              />
            </div>

            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <button
                type="button"
                className="preset-btn"
                style={{ padding: "5px 10px", fontSize: "12px" }}
                onClick={() => {
                  setCustomFromDate(todayStr);
                  setCustomToDate(todayStr);
                }}
              >
                اليوم فقط
              </button>
              <button
                type="button"
                className="preset-btn"
                style={{ padding: "5px 10px", fontSize: "12px" }}
                onClick={() => {
                  const y = new Date();
                  y.setDate(y.getDate() - 1);
                  const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
                  setCustomFromDate(yStr);
                  setCustomToDate(yStr);
                }}
              >
                أمس فقط
              </button>
              {(customFromDate || customToDate) && (
                <button
                  type="button"
                  className="link-button"
                  style={{ fontSize: "12px", color: "#b94d3f" }}
                  onClick={() => {
                    setCustomFromDate("");
                    setCustomToDate("");
                  }}
                >
                  مسح التحديد ✕
                </button>
              )}
            </div>

            <div style={{ fontSize: "12px", color: "#8b7b70", marginRight: "auto" }}>
              {customFromDate && customToDate
                ? `الفترة من ${customFromDate} إلى ${customToDate}`
                : customFromDate
                ? `من ${customFromDate} حتى الآن`
                : customToDate
                ? `حتى تاريخ ${customToDate}`
                : "حدد تاريخ البداية والنهاية"}
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards for Selected Filter */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "10px",
        marginBottom: "16px",
      }}>
        <div style={{
          background: "#fff",
          border: "1px solid #e9e1d9",
          borderRadius: "10px",
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "3px",
        }}>
          <span style={{ fontSize: "12px", color: "#8b7b70" }}>عدد الفواتير المعروضة</span>
          <strong style={{ fontSize: "17px", color: "#34231c" }}>
            {filteredInvoices.length}{" "}
            <small style={{ fontSize: "11px", fontWeight: 400, color: "#8b7b70" }}>
              ({summary.completedCount} مكتملة{summary.cancelledCount > 0 ? ` · ${summary.cancelledCount} ملغاة` : ""})
            </small>
          </strong>
        </div>

        <div style={{
          background: "#fff",
          border: "1px solid #e9e1d9",
          borderRadius: "10px",
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "3px",
        }}>
          <span style={{ fontSize: "12px", color: "#8b7b70" }}>إجمالي المبيعات المكتملة</span>
          <strong style={{ fontSize: "17px", color: "#2e7d32" }}>
            {money(summary.totalSales)}
          </strong>
        </div>

        <div style={{
          background: "#fff",
          border: "1px solid #e9e1d9",
          borderRadius: "10px",
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: "3px",
        }}>
          <span style={{ fontSize: "12px", color: "#8b7b70" }}>المحصّل الفعلي</span>
          <strong style={{ fontSize: "17px", color: "#1565c0" }}>
            {money(summary.totalCollected)}
          </strong>
        </div>

        {summary.totalRemaining > 0 && (
          <div style={{
            background: "#fff",
            border: "1px solid #f0d6d3",
            borderRadius: "10px",
            padding: "10px 14px",
            display: "flex",
            flexDirection: "column",
            gap: "3px",
          }}>
            <span style={{ fontSize: "12px", color: "#b94d3f" }}>المتبقي (آجل)</span>
            <strong style={{ fontSize: "17px", color: "#c62828" }}>
              {money(summary.totalRemaining)}
            </strong>
          </div>
        )}
      </div>

      <InvoiceTable invoices={filteredInvoices} onViewDetails={openInvoiceDetails} />

      {refundInvoiceDetail !== null && (
        <RefundModal
          invoiceDetail={refundInvoiceDetail}
          session={session}
          onClose={() => setRefundInvoiceDetail(null)}
          onSuccess={() => {
            setRefundInvoiceDetail(null);
            if (onRefreshData) onRefreshData();
          }}
        />
      )}

      {thermalReceiptDetail !== null && (
        <ThermalReceiptModal
          invoiceDetail={thermalReceiptDetail}
          onClose={() => setThermalReceiptDetail(null)}
        />
      )}
    </section>
  );
}

function InvoiceTable({ invoices, onViewDetails }: { invoices: Invoice[]; onViewDetails?: (invoiceNumber: number) => void }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>الفاتورة</th>
            <th>التاريخ والوقت</th>
            <th>العميل</th>
            <th>البائع</th>
            <th>الإجمالي</th>
            <th>المتبقي</th>
            <th>الحالة</th>
            {onViewDetails && <th>التفاصيل</th>}
          </tr>
        </thead>
        <tbody>
          {invoices.map((x) => (
            <tr key={x.invoiceNumber}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <strong>#{x.invoiceNumber}</strong>
                  {x.onlineOrderNumber && (
                    <span style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#854d0e",
                      background: "#fef9c3",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      whiteSpace: "nowrap",
                    }}>
                      📦 طلب #{x.onlineOrderNumber}
                    </span>
                  )}
                </div>
              </td>
              <td><code>{formatDateTime(x.createdAt)}</code></td>
              <td>{x.customerName || "عميل نقدي"}</td>
              <td>{x.sellerName}</td>
              <td>{money(x.totalPiasters)}</td>
              <td>{money(x.remainingPiasters)}</td>
              <td><span className="pill">{x.status === "COMPLETED" ? "مكتملة" : "ملغاة"}</span></td>
              {onViewDetails && (
                <td>
                  <button type="button" className="edit-button" onClick={() => onViewDetails(x.invoiceNumber)}>
                    عرض التفاصيل 🔍
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!invoices.length && <Empty text="لا توجد فواتير تطابق التصفية الحالية." />}
    </div>
  );
}
function Empty({ text }: { text: string }) { return <div className="empty"><span>◇</span><p>{text}</p></div>; }

function SalesReport({
  active = true,
  invoices,
  session,
}: {
  active?: boolean;
  invoices: Invoice[];
  session: Session;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"ALL" | "SINGLE" | "RANGE">("ALL");
  const [singleDate, setSingleDate] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [selectedInvoiceNumber, setSelectedInvoiceNumber] = useState<number | null>(null);
  const [thermalReceiptDetail, setThermalReceiptDetail] = useState<InvoiceDetailView | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceDetailView | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [sendingTelegram, setSendingTelegram] = useState(false);
  const [telegramSuccess, setTelegramSuccess] = useState("");

  async function handleSendTelegram() {
    setSendingTelegram(true);
    setDetailError("");
    setTelegramSuccess("");
    const targetDate = dateFilterType === "SINGLE" && singleDate ? singleDate : null;
    try {
      const res = await invoke<string>("send_daily_report_to_telegram", {
        token: session.token,
        date: targetDate,
      });
      setTelegramSuccess(res);
    } catch (err: unknown) {
      setDetailError(String(err));
    } finally {
      setSendingTelegram(false);
    }
  }

  useEffect(() => {
    if (!active) return;
    function handleReportKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && selectedInvoiceNumber !== null) {
        e.preventDefault();
        setSelectedInvoiceNumber(null);
        setInvoiceDetail(null);
      }
    }
    window.addEventListener("keydown", handleReportKeyDown);
    return () => window.removeEventListener("keydown", handleReportKeyDown);
  }, [active, selectedInvoiceNumber]);

  async function openInvoiceDetails(num: number) {
    setSelectedInvoiceNumber(num);
    setLoadingDetail(true);
    setDetailError("");
    setInvoiceDetail(null);
    try {
      const data = await invoke<InvoiceDetailView>("get_invoice_details", {
        token: session.token,
        invoiceNumber: num,
      });
      setInvoiceDetail(data);
    } catch (err: unknown) {
      setDetailError(String(err));
    } finally {
      setLoadingDetail(false);
    }
  }

  const filteredInvoices = invoices.filter((inv) => {
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const numStr = String(inv.invoiceNumber);
      const custName = (inv.customerName || "").toLowerCase();
      const sellerName = (inv.sellerName || "").toLowerCase();
      if (!numStr.includes(q) && !custName.includes(q) && !sellerName.includes(q)) {
        return false;
      }
    }

    const invDateStr = getLocalDateString(inv.createdAt);

    if (dateFilterType === "SINGLE") {
      if (singleDate && invDateStr !== singleDate) {
        return false;
      }
    } else if (dateFilterType === "RANGE") {
      if (fromDate && invDateStr < fromDate) {
        return false;
      }
      if (toDate && invDateStr > toDate) {
        return false;
      }
    }

    return true;
  });

  const completedInvoices = filteredInvoices.filter((i) => i.status === "COMPLETED");
  const cancelledInvoices = filteredInvoices.filter((i) => i.status === "CANCELLED");

  const totalSubtotal = completedInvoices.reduce((acc, i) => acc + (i.subtotalPiasters ?? i.totalPiasters ?? 0), 0);
  const totalDiscount = completedInvoices.reduce((acc, i) => acc + (i.discountPiasters ?? 0), 0);
  const grandTotal = completedInvoices.reduce((acc, i) => acc + (i.totalPiasters ?? 0), 0);

  const totalCash = completedInvoices.reduce((acc, i) => acc + (i.paidCashPiasters ?? 0), 0);
  const totalInstapay = completedInvoices.reduce((acc, i) => acc + (i.paidInstapayPiasters ?? 0), 0);
  const totalWallet = completedInvoices.reduce((acc, i) => acc + (i.paidWalletPiasters ?? 0), 0);
  const totalRemaining = completedInvoices.reduce((acc, i) => acc + (i.remainingPiasters ?? 0), 0);

  const totalPaid = totalCash + totalInstapay + totalWallet;
  const totalRefunds = cancelledInvoices.reduce((acc, i) => acc + (i.totalPiasters ?? 0), 0);

  return (
    <div className="stack" data-print-document="sales-report">
      <section className="panel print-hide">
        <div className="section-head">
          <div>
            <h2>📊 تقرير فواتير المبيعات</h2>
            <p>عرض وتحليل حركة المبيعات، وسائل الدفع التفصيلية والديون المتبقية</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className="secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                borderColor: "#0284c7",
                color: "#0369a1",
                background: "#f0f9ff",
                fontWeight: 700
              }}
              disabled={sendingTelegram}
              onClick={() => void handleSendTelegram()}
              title="إرسال تقرير المبيعات والحضور إلى تليجرام المدير"
            >
              <span>📲</span> {sendingTelegram ? "جارٍ الإرسال..." : "إرسال التقرير لتليجرام"}
            </button>
            <button
              type="button"
              className="primary"
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
              onClick={() => void printDocumentFromPage("sales-report", "تقرير المبيعات")}
            >
              <LuPrinter style={{ fontSize: "18px" }} /> طباعة التقرير
            </button>
          </div>
        </div>

        {telegramSuccess && (
          <div className="message success" style={{ marginBottom: "14px" }} role="status">
            {telegramSuccess}
            <button type="button" onClick={() => setTelegramSuccess("")}>×</button>
          </div>
        )}

        <div style={{ background: "#faf8f5", padding: "16px", borderRadius: "12px", border: "1px solid #e9e1d9", display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center" }}>
            <div style={{ flex: "1 1 280px" }}>
              <label style={{ marginBottom: "6px" }}>🔍 بحث برقم الفاتورة أو اسم العميل / البائع</label>
              <input
                className="search full"
                placeholder="أدخل رقم الفاتورة أو اسم العميل..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ height: "42px", fontSize: "14px" }}
              />
            </div>

            <div style={{ flex: "0 0 auto" }}>
              <label style={{ marginBottom: "6px" }}>📅 تصفية حسب التاريخ</label>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  type="button"
                  className="preset-btn"
                  style={dateFilterType === "ALL" ? { background: "#785038", color: "#fff", borderColor: "#785038" } : {}}
                  onClick={() => setDateFilterType("ALL")}
                >
                  الكل
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  style={dateFilterType === "SINGLE" ? { background: "#785038", color: "#fff", borderColor: "#785038" } : {}}
                  onClick={() => setDateFilterType("SINGLE")}
                >
                  تاريخ محدد
                </button>
                <button
                  type="button"
                  className="preset-btn"
                  style={dateFilterType === "RANGE" ? { background: "#785038", color: "#fff", borderColor: "#785038" } : {}}
                  onClick={() => setDateFilterType("RANGE")}
                >
                  من - إلى
                </button>
              </div>
            </div>
          </div>

          {dateFilterType === "SINGLE" && (
            <div style={{ display: "flex", gap: "12px", alignItems: "center", maxWidth: "320px" }}>
              <label style={{ margin: 0, whiteSpace: "nowrap" }}>اختر التاريخ:</label>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #dfd5ca" }}
              />
              {singleDate && (
                <button type="button" className="link-button" onClick={() => setSingleDate("")}>
                  مسح
                </button>
              )}
            </div>
          )}

          {dateFilterType === "RANGE" && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <label style={{ margin: 0, whiteSpace: "nowrap" }}>من تاريخ:</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #dfd5ca" }}
                />
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <label style={{ margin: 0, whiteSpace: "nowrap" }}>إلى تاريخ:</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #dfd5ca" }}
                />
              </div>
              {(fromDate || toDate) && (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setFromDate("");
                    setToDate("");
                  }}
                >
                  إعادة ضبط النطاق
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <div className="print-only-header" style={{ display: "none" }}>
        <h1 style={{ textAlign: "center", marginBottom: "4px" }}>مؤسسة المرسي - تقرير فواتير المبيعات</h1>
        <p style={{ textAlign: "center", color: "#666", fontSize: "12px", marginBottom: "16px" }}>
          {dateFilterType === "SINGLE" && singleDate ? `بتاريخ: ${singleDate}` : ""}
          {dateFilterType === "RANGE" && (fromDate || toDate) ? `الفترة من: ${fromDate || "بداية التسجيل"} إلى: ${toDate || "اليوم"}` : ""}
          {dateFilterType === "ALL" ? "تقرير المبيعات الشامل" : ""}
        </p>
      </div>

      <section className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <h3 style={{ margin: 0 }}>📋 قائمة الفواتير ({filteredInvoices.length})</h3>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>الفاتورة</th>
                <th>الوقت</th>
                <th>التاريخ</th>
                <th>المستخدم</th>
                <th>المجموع</th>
                <th>الخصم</th>
                <th>المجموع الكلي</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
                <th>الحالة</th>
                <th className="print-hide">التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map((inv) => {
                const paidTotal = (inv.paidCashPiasters ?? 0) + (inv.paidInstapayPiasters ?? 0) + (inv.paidWalletPiasters ?? 0);
                const isCancelled = inv.status === "CANCELLED";
                return (
                  <tr key={inv.invoiceNumber} style={isCancelled ? { background: "#fff8f8", opacity: 0.8 } : {}}>
                    <td>
                      <strong style={{ color: "#785038" }}>#{inv.invoiceNumber}</strong>
                      {inv.customerName && <div style={{ fontSize: "11px", color: "#8b7b70" }}>{inv.customerName}</div>}
                    </td>
                    <td><code>{formatTimeOnly(inv.createdAt)}</code></td>
                    <td>{formatDateOnly(inv.createdAt)}</td>
                    <td>{inv.sellerName}</td>
                    <td>{money(inv.subtotalPiasters ?? inv.totalPiasters)}</td>
                    <td style={{ color: inv.discountPiasters ? "#b94d3f" : "inherit" }}>
                      {inv.discountPiasters ? `-${money(inv.discountPiasters)}` : "—"}
                    </td>
                    <td><strong>{money(inv.totalPiasters)}</strong></td>
                    <td style={{ color: "#24742c", fontWeight: 700 }}>{money(paidTotal)}</td>
                    <td>
                      {inv.remainingPiasters > 0 ? (
                        <span className="pill" style={{ background: "#fff1e6", color: "#b64e17", border: "1px solid #ffd8bf" }}>
                          آجل {money(inv.remainingPiasters)}
                        </span>
                      ) : (
                        <span style={{ color: "#8b7b70" }}>0.00 ج.م</span>
                      )}
                    </td>
                    <td>
                      <span className="pill" style={isCancelled ? { background: "#fff0ed", color: "#9f352a" } : { background: "#e9f6e9", color: "#24742c" }}>
                        {isCancelled ? "مرتجع / ملغاة" : "مكتملة"}
                      </span>
                    </td>
                    <td className="print-hide">
                      <button
                        type="button"
                        className="edit-button"
                        onClick={() => openInvoiceDetails(inv.invoiceNumber)}
                      >
                        عرض 🔍
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!filteredInvoices.length && <Empty text="لا توجد فواتير تطابق معايير البحث والتاريخ المحددة." />}
        </div>
      </section>

      <section className="panel sales-report-summary-card" style={{ background: "linear-gradient(135deg, #ffffff, #faf6f0)", border: "2px solid #e3d6c8", borderRadius: "16px", padding: "24px" }}>
        <h3 style={{ borderBottom: "1px solid #e3d6c8", paddingBottom: "12px", marginBottom: "18px", color: "#34231c", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>📈</span> ملخص تقرير المبيعات للفترة المحددة
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "14px", marginBottom: "20px" }}>
          <div style={{ background: "#fff", padding: "14px", borderRadius: "12px", border: "1px solid #e9e1d9" }}>
            <span style={{ fontSize: "12px", color: "#8b7b70", display: "block" }}>الإجمالي (قبل الخصم)</span>
            <strong style={{ fontSize: "19px", color: "#241c18", marginTop: "4px", display: "block" }}>{money(totalSubtotal)}</strong>
          </div>

          <div style={{ background: "#fff", padding: "14px", borderRadius: "12px", border: "1px solid #e9e1d9" }}>
            <span style={{ fontSize: "12px", color: "#8b7b70", display: "block" }}>إجمالي الخصومات</span>
            <strong style={{ fontSize: "19px", color: "#b94d3f", marginTop: "4px", display: "block" }}>{money(totalDiscount)}</strong>
          </div>

          <div style={{ background: "#fff", padding: "14px", borderRadius: "12px", border: "1px solid #e9e1d9" }}>
            <span style={{ fontSize: "12px", color: "#8b7b70", display: "block" }}>إجمالي المدفوع</span>
            <strong style={{ fontSize: "19px", color: "#24742c", marginTop: "4px", display: "block" }}>{money(totalPaid)}</strong>
          </div>

          <div style={{ background: "#fff", padding: "14px", borderRadius: "12px", border: "1px solid #e9e1d9" }}>
            <span style={{ fontSize: "12px", color: "#8b7b70", display: "block" }}>إجمالي المتبقي (الآجل)</span>
            <strong style={{ fontSize: "19px", color: "#b64e17", marginTop: "4px", display: "block" }}>{money(totalRemaining)}</strong>
          </div>

          <div style={{ background: "#fff0ed", padding: "14px", borderRadius: "12px", border: "1px solid #f5c6cb" }}>
            <span style={{ fontSize: "12px", color: "#9f352a", display: "block" }}>إجمالي المرتجعات</span>
            <strong style={{ fontSize: "19px", color: "#9f352a", marginTop: "4px", display: "block" }}>{money(totalRefunds)}</strong>
          </div>
        </div>

        <div style={{ background: "#34231c", color: "#fff", borderRadius: "14px", padding: "20px", display: "flex", flexWrap: "wrap", gap: "20px", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <span style={{ color: "#d9c4b3", fontSize: "13px", fontWeight: 700, display: "block" }}>المجموع الكلي الصافي للمبيعات</span>
            <strong style={{ fontSize: "28px", color: "#ffffff", marginTop: "2px", display: "block" }}>{money(grandTotal)}</strong>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "10px", padding: "8px 14px" }}>
              <span style={{ display: "block", fontSize: "11px", color: "#e3d1c2" }}>💵 نقدياً (كاش)</span>
              <strong style={{ fontSize: "15px", color: "#fff" }}>{money(totalCash)}</strong>
            </div>

            <div style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "10px", padding: "8px 14px" }}>
              <span style={{ display: "block", fontSize: "11px", color: "#e3d1c2" }}>📲 إنستا باي</span>
              <strong style={{ fontSize: "15px", color: "#fff" }}>{money(totalInstapay)}</strong>
            </div>

            <div style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "10px", padding: "8px 14px" }}>
              <span style={{ display: "block", fontSize: "11px", color: "#e3d1c2" }}>💳 محفظة</span>
              <strong style={{ fontSize: "15px", color: "#fff" }}>{money(totalWallet)}</strong>
            </div>

            <div style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "10px", padding: "8px 14px" }}>
              <span style={{ display: "block", fontSize: "11px", color: "#e3d1c2" }}>⏳ آجل</span>
              <strong style={{ fontSize: "15px", color: "#ffcdd2" }}>{money(totalRemaining)}</strong>
            </div>
          </div>
        </div>
      </section>

      {selectedInvoiceNumber !== null && (
        <div
          className="variant-picker-overlay print-hide"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedInvoiceNumber(null);
          }}
        >
          <section className="invoice-details-dialog" role="dialog" aria-modal="true" aria-label={`تفاصيل الفاتورة #${selectedInvoiceNumber}`}>
            <div className="invoice-details-header">
              <div>
                <h2>تفاصيل الفاتورة #{selectedInvoiceNumber}</h2>
                {invoiceDetail && (
                  <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#8b7b70" }}>
                    تمت في {formatDateTime(invoiceDetail.createdAt)} · بواسطة {invoiceDetail.sellerName}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="sheet-close"
                aria-label="إغلاق"
                onClick={() => setSelectedInvoiceNumber(null)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {loadingDetail && <div className="empty"><p>جارٍ تحميل تفاصيل الفاتورة…</p></div>}
            {detailError && <div className="message error">{detailError}</div>}

            {invoiceDetail && (
              <div>
                <div className="invoice-details-grid">
                  <div><small>رقم الفاتورة</small><strong>#{invoiceDetail.invoiceNumber}</strong></div>
                  <div><small>الحالة</small><strong>{invoiceDetail.status === "COMPLETED" ? "مكتملة" : "ملغاة"}</strong></div>
                  {invoiceDetail.onlineOrderNumber && (
                    <div><small>نوع الفاتورة</small><strong style={{ color: "#854d0e" }}>📦 طلب أونلاين #{invoiceDetail.onlineOrderNumber}</strong></div>
                  )}
                  <div><small>الموظف البائع</small><strong>{invoiceDetail.sellerName}</strong></div>
                  <div><small>العميل</small><strong>{invoiceDetail.customerName || "عميل نقدي"}</strong></div>
                  {invoiceDetail.customerPhone && <div><small>رقم هاتف العميل</small><strong>{invoiceDetail.customerPhone}</strong></div>}
                  {invoiceDetail.notes && <div style={{ gridColumn: "1 / -1" }}><small>ملاحظات</small><strong>{invoiceDetail.notes}</strong></div>}
                </div>

                <h3 style={{ fontSize: "15px", marginBottom: "10px", color: "#34231c" }}>المنتجات والأصناف</h3>
                <div className="table-wrap" style={{ marginBottom: "18px" }}>
                  <table>
                    <thead>
                      <tr>
                        <th>المنتج / المتغير</th>
                        <th>المخزن</th>
                        <th>الكمية</th>
                        <th>السعر</th>
                        <th>الخصم</th>
                        <th>المجموع</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceDetail.items.map((item, index) => {
                        const variantText = [item.color, item.size ? `مقاس ${item.size}` : ""].filter(Boolean).join(" · ");
                        return (
                          <tr key={index}>
                            <td>
                              <strong>{item.nameSnapshot}</strong>
                              {variantText && <small style={{ display: "block", color: "#785038" }}>{variantText}</small>}
                            </td>
                            <td>{item.warehouseName}</td>
                            <td><strong>{item.quantity}</strong></td>
                            <td>{money(item.sellPricePiasters)}</td>
                            <td>{money(item.discountEachPiasters * item.quantity)}</td>
                            <td><strong>{money(item.lineTotalPiasters)}</strong></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="sheet-totals" style={{ marginTop: "0" }}>
                  {(invoiceDetail.shippingFeePiasters || 0) > 0 ? (
                    <>
                      <div className="total"><span>إجمالي المنتجات</span><strong>{money(invoiceDetail.subtotalPiasters - (invoiceDetail.shippingFeePiasters || 0))}</strong></div>
                      <div className="total"><span>مصاريف الشحن</span><strong>+{money(invoiceDetail.shippingFeePiasters || 0)}</strong></div>
                    </>
                  ) : (
                    <div className="total"><span>المجموع الفرعي</span><strong>{money(invoiceDetail.subtotalPiasters)}</strong></div>
                  )}
                  {(invoiceDetail.extraDiscountPiasters || 0) > 0 ? (
                    <>
                      {invoiceDetail.discountPiasters - (invoiceDetail.extraDiscountPiasters || 0) > 0 && (
                        <div className="total"><span>خصم القطع</span><strong>{money(invoiceDetail.discountPiasters - (invoiceDetail.extraDiscountPiasters || 0))}</strong></div>
                      )}
                      <div className="total"><span>خصم الفاتورة</span><strong>{money(invoiceDetail.extraDiscountPiasters || 0)}</strong></div>
                      <div className="total"><span>إجمالي الخصم</span><strong>{money(invoiceDetail.discountPiasters)}</strong></div>
                    </>
                  ) : (
                    <div className="total"><span>الخصم</span><strong>{money(invoiceDetail.discountPiasters)}</strong></div>
                  )}
                  <div className="total grand"><span>إجمالي الفاتورة</span><strong>{money(invoiceDetail.totalPiasters)}</strong></div>
                  <div className="divider" style={{ margin: "10px 0" }} />
                  {(invoiceDetail.depositPiasters || 0) > 0 ? (
                    <>
                      <div className="total" style={{ color: "#1b5e20" }}><span>العربون المدفوع</span><strong>{money(invoiceDetail.depositPiasters || 0)}</strong></div>
                      <div className="total" style={{ color: "#b94d3f", fontWeight: "bold" }}><span>المطلوب عند الاستلام</span><strong>{money(Math.max(0, invoiceDetail.totalPiasters - (invoiceDetail.depositPiasters || 0)))}</strong></div>
                    </>
                  ) : invoiceDetail.onlineOrderNumber ? (
                    <div className="total" style={{ color: "#b94d3f", fontWeight: "bold" }}><span>المطلوب عند الاستلام</span><strong>{money(invoiceDetail.totalPiasters)}</strong></div>
                  ) : (
                    <>
                      {invoiceDetail.paidCashPiasters > 0 && <div className="total"><span>المدفوع نقدي</span><strong>{money(invoiceDetail.paidCashPiasters)}</strong></div>}
                      {invoiceDetail.paidInstapayPiasters > 0 && <div className="total"><span>المدفوع إنستاباي</span><strong>{money(invoiceDetail.paidInstapayPiasters)}</strong></div>}
                      {invoiceDetail.paidWalletPiasters > 0 && <div className="total"><span>المدفوع محفظة</span><strong>{money(invoiceDetail.paidWalletPiasters)}</strong></div>}
                      {invoiceDetail.remainingPiasters > 0 && <div className="total" style={{ color: "#b94d3f" }}><span>المتبقي (آجل)</span><strong>{money(invoiceDetail.remainingPiasters)}</strong></div>}
                    </>
                  )}
                  {session.role === "ADMIN" && (
                    <div className="metrics" style={{ marginTop: "12px" }}>
                      <span title="إجمالي التكلفة">{money(invoiceDetail.items.reduce((s, i) => s + i.buyPricePiasters * i.quantity, 0))}</span>
                      <span title="صافي ربح الفاتورة">{money(invoiceDetail.totalPiasters - (invoiceDetail.shippingFeePiasters || 0) - invoiceDetail.items.reduce((s, i) => s + i.buyPricePiasters * i.quantity, 0))}</span>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "18px" }}>
                  <button type="button" className="secondary" onClick={() => setThermalReceiptDetail(invoiceDetail)}>طباعة الفاتورة 🖨️</button>
                  <button type="button" className="primary" onClick={() => setSelectedInvoiceNumber(null)}>إغلاق</button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {thermalReceiptDetail !== null && (
        <ThermalReceiptModal
          invoiceDetail={thermalReceiptDetail}
          onClose={() => setThermalReceiptDetail(null)}
        />
      )}
    </div>
  );
}

export default App;

function generateBarcodeBits(code: string): string {
  const patterns: Record<string, string> = {
    '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
    '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
    '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
    'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
    'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
    'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
    'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
    'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
    'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
    '-': '100101011011', '.': '110010101101', ' ': '100110101101', '*': '100101101101'
  };
  const clean = (code || "10001").toUpperCase().replace(/[^A-Z0-9\-\.\s]/g, "0");
  const str = `*${clean}*`;
  let bits = "";
  for (let i = 0; i < str.length; i++) {
    bits += (patterns[str[i]] || patterns['0']) + "0";
  }
  // Quiet zones at both ends (10 modules each) required by optical barcode scanners
  return "0000000000" + bits + "0000000000";
}

function BarcodeSVG({ code, width = 125, height = 34 }: { code: string; width?: number; height?: number }) {
  const bits = generateBarcodeBits(code);
  const barWidth = width / bits.length;

  const bars: { x: number; width: number }[] = [];
  let startIdx: number | null = null;
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === "1") {
      if (startIdx === null) startIdx = i;
    } else if (startIdx !== null) {
      bars.push({ x: startIdx * barWidth, width: (i - startIdx) * barWidth });
      startIdx = null;
    }
  }
  if (startIdx !== null) {
    bars.push({ x: startIdx * barWidth, width: (bits.length - startIdx) * barWidth });
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      style={{ display: "block", margin: "0 auto", shapeRendering: "crispEdges" }}
    >
      <rect x={0} y={0} width={width} height={height} fill="#fff" />
      {bars.map((bar, idx) => (
        <rect
          key={idx}
          x={bar.x}
          y={0}
          width={bar.width}
          height={height}
          fill="#000"
        />
      ))}
    </svg>
  );
}

async function thermalCanvas(node: HTMLElement, targetWidth: number, targetHeight?: number): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const bounds = node.getBoundingClientRect();
  const source = await toCanvas(node, {
    backgroundColor: "#fff",
    pixelRatio: 2,
    width: bounds.width,
    height: node.scrollHeight,
    style: { maxHeight: "none", overflow: "visible", boxShadow: "none", borderRadius: "0" },
  });
  const output = document.createElement("canvas");
  output.width = targetWidth;
  output.height = targetHeight ?? Math.ceil(source.height * targetWidth / source.width);
  const context = output.getContext("2d");
  if (!context) throw new Error("تعذر تجهيز صورة الطباعة");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, output.width, output.height);
  context.drawImage(source, 0, 0, output.width, output.height);
  return output;
}

function thermalPixels(canvas: HTMLCanvasElement): { widthBytes: number; height: number; pixels: number[] } {
  const widthBytes = Math.ceil(canvas.width / 8);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("تعذر قراءة صورة الطباعة");
  const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const packed = new Uint8Array(widthBytes * canvas.height);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const index = (y * canvas.width + x) * 4;
      const darkness = (rgba[index] * 299 + rgba[index + 1] * 587 + rgba[index + 2] * 114) / 1000;
      if (rgba[index + 3] > 128 && darkness < 170) {
        packed[y * widthBytes + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
  }
  return { widthBytes, height: canvas.height, pixels: Array.from(packed) };
}

async function printDocumentFromPage(key: string, title: string): Promise<void> {
  const original = document.querySelector<HTMLElement>(`[data-print-document="${key}"]`);
  if (!original) {
    window.alert("تعذر العثور على محتوى المستند المطلوب طباعته");
    return;
  }
  try {
    await printReportHtml(original, title);
  } catch (error) {
    window.alert(`تعذرت طباعة ${title}: ${String(error)}`);
  }
}

function isLikelyBarcodePrinter(name: string): boolean {
  return /barcode|label|365|235|420|470|tsc|zebra|postek|argox/i.test(name);
}

function isLikelyReceiptPrinter(name: string): boolean {
  if (isLikelyBarcodePrinter(name)) return false;
  return /receipt|pos|80|58|thermal|t20|t88|d200|n160|q90|epson|bixolon|star|rongta/i.test(name);
}

function ThermalReceiptModal({
  invoiceDetail,
  onClose,
  onNewSale,
}: {
  invoiceDetail: InvoiceDetailView;
  onClose: () => void;
  onNewSale?: () => void;
}) {
  const [paperSize, setPaperSize] = useState<"80mm" | "58mm">("80mm");
  const receiptRef = useRef<HTMLDivElement>(null);
  const [receiptPrinter, setReceiptPrinter] = useState(() => localStorage.getItem("morsi.receiptPrinter") || localStorage.getItem("morsi.drawerPrinter") || "");
  const [printerNames, setPrinterNames] = useState<string[]>([]);
  const [drawerPin, setDrawerPin] = useState<0 | 1>(() => localStorage.getItem("morsi.drawerPin") === "1" ? 1 : 0);
  const [autoOpenDrawer, setAutoOpenDrawer] = useState(() => localStorage.getItem("morsi.autoOpenDrawer") !== "false");
  const [drawerNotice, setDrawerNotice] = useState("");

  const changeReceiptPrinter = useCallback((name: string) => {
    setReceiptPrinter(name);
    localStorage.setItem("morsi.receiptPrinter", name);
    localStorage.setItem("morsi.drawerPrinter", name);
    if (isTauri() && name.trim()) {
      void invoke("set_default_receipt_printer", { printerName: name.trim() }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    void Promise.all([
      invoke<string>("get_default_receipt_printer").catch((): string => ""),
      invoke<string[]>("list_receipt_printers").catch((): string[] => []),
    ]).then(([defaultPrinter, installedPrinters]) => {
      setPrinterNames(installedPrinters);

      setReceiptPrinter((current) => {
        // 1. If currently set and valid in installedPrinters, keep it
        if (current && installedPrinters.includes(current)) {
          void invoke("set_default_receipt_printer", { printerName: current }).catch(() => {});
          return current;
        }
        // 2. If saved in localStorage and valid
        const saved = localStorage.getItem("morsi.receiptPrinter") || localStorage.getItem("morsi.drawerPrinter");
        if (saved && installedPrinters.includes(saved)) {
          void invoke("set_default_receipt_printer", { printerName: saved }).catch(() => {});
          return saved;
        }
        // 3. Find printer matching receipt signatures (and definitely NOT barcode)
        const bestReceipt = installedPrinters.find(isLikelyReceiptPrinter);
        if (bestReceipt) {
          localStorage.setItem("morsi.receiptPrinter", bestReceipt);
          localStorage.setItem("morsi.drawerPrinter", bestReceipt);
          void invoke("set_default_receipt_printer", { printerName: bestReceipt }).catch(() => {});
          return bestReceipt;
        }
        // 4. Default printer if it's not a barcode printer
        if (defaultPrinter && !isLikelyBarcodePrinter(defaultPrinter)) {
          localStorage.setItem("morsi.receiptPrinter", defaultPrinter);
          localStorage.setItem("morsi.drawerPrinter", defaultPrinter);
          void invoke("set_default_receipt_printer", { printerName: defaultPrinter }).catch(() => {});
          return defaultPrinter;
        }
        // 5. Any installed printer that is not barcode
        const nonBarcode = installedPrinters.find((name) => !isLikelyBarcodePrinter(name));
        const chosen = nonBarcode || defaultPrinter || installedPrinters[0] || "";
        if (chosen) {
          localStorage.setItem("morsi.receiptPrinter", chosen);
          localStorage.setItem("morsi.drawerPrinter", chosen);
          void invoke("set_default_receipt_printer", { printerName: chosen }).catch(() => {});
        }
        return chosen;
      });
    });
  }, []);

  const openDrawer = useCallback(async () => {
    try {
      await invoke("pulse_cash_drawer", { printerName: receiptPrinter.trim(), pin: drawerPin });
      setDrawerNotice("تم إرسال أمر فتح الدرج للطابعة");
    } catch (error) {
      setDrawerNotice(`تعذر فتح الدرج: ${String(error)}`);
    }
  }, [receiptPrinter, drawerPin]);

  const [printingDirect, setPrintingDirect] = useState(false);

  const printReceiptPreview = useCallback(async () => {
    if (!receiptRef.current) return;
    try {
      setDrawerNotice("");
      if (isTauri() && receiptPrinter.trim()) {
        await invoke("set_default_receipt_printer", { printerName: receiptPrinter.trim() }).catch(() => {});
      }
      await printReceiptHtml(receiptRef.current, paperSize);
      if (autoOpenDrawer && isTauri() && receiptPrinter.trim()) {
        void openDrawer();
      }
    } catch (error) {
      setDrawerNotice(`تعذرت معاينة/طباعة الفاتورة: ${String(error)}`);
    }
  }, [paperSize, autoOpenDrawer, receiptPrinter, openDrawer]);

  const printReceiptDirect = useCallback(async () => {
    if (!receiptRef.current) return;
    if (!isTauri()) {
      // If outside desktop app, use isolated browser print preview directly
      await printReceiptPreview();
      return;
    }
    setPrintingDirect(true);
    setDrawerNotice("");
    try {
      await document.fonts.ready;
      await receiptRef.current.querySelector("img")?.decode().catch(() => undefined);
      const printerName = receiptPrinter.trim() || await invoke<string>("get_default_receipt_printer");
      const targetWidth = paperSize === "80mm" ? 560 : 368;
      const receipt = await thermalCanvas(receiptRef.current, targetWidth);
      await invoke("print_thermal_bitmap", {
        printerName,
        ...thermalPixels(receipt),
        paperWidthMm: paperSize === "80mm" ? 80 : 58,
        paperHeightMm: 0,
        cut: true,
        drawerPin: autoOpenDrawer ? drawerPin : null,
      });
      setDrawerNotice(autoOpenDrawer ? "تمت طباعة الفاتورة وإرسال أمر فتح الدرج بنجاح" : "تمت طباعة الفاتورة بنجاح");
    } catch (error) {
      console.warn("Direct thermal print error, opening preview print fallback:", error);
      setDrawerNotice(`تعذرت الطباعة المباشرة (${String(error)}) - جارٍ فتح معاينة الطباعة...`);
      try {
        await printReceiptPreview();
      } catch (previewErr) {
        setDrawerNotice(`تعذرت طباعة الفاتورة: ${String(previewErr)}`);
      }
    } finally {
      setPrintingDirect(false);
    }
  }, [paperSize, receiptPrinter, drawerPin, autoOpenDrawer, printReceiptPreview]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p") {
        e.preventDefault();
        e.stopImmediatePropagation();
        void printReceiptPreview();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter") {
        e.preventDefault();
        void printReceiptDirect();
      }
    }
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose, printReceiptDirect, printReceiptPreview]);

  const totalItemsCount = invoiceDetail.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      {createPortal(
    <div
      className="thermal-receipt-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="thermal-receipt-dialog">
        {/* On-Screen Controls Toolbar */}
        <div className="thermal-receipt-controls print-hide" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", gap: "14px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#dfcfc0" }}>عرض الورق:</span>
              <button
                type="button"
                className={`thermal-size-btn ${paperSize === "80mm" ? "active" : ""}`}
                onClick={() => setPaperSize("80mm")}
              >
                80mm (الافتراضي)
              </button>
              <button
                type="button"
                className={`thermal-size-btn ${paperSize === "58mm" ? "active" : ""}`}
                onClick={() => setPaperSize("58mm")}
              >
                58mm (ورق رفيع)
              </button>
            </div>

            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#dfcfc0", fontWeight: 700 }}>🖨️ طابعة الفواتير:</span>
              <select
                aria-label="طابعة الفواتير والكاشير"
                value={receiptPrinter}
                onChange={(e) => changeReceiptPrinter(e.target.value)}
                style={{
                  padding: "5px 10px",
                  fontSize: "12.5px",
                  borderRadius: "6px",
                  background: "#2a1c17",
                  color: "#f5ece3",
                  border: "1px solid #8c6a53",
                  fontWeight: "bold",
                  minWidth: "170px",
                  cursor: "pointer",
                }}
              >
                {printerNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                {receiptPrinter && !printerNames.includes(receiptPrinter) && (
                  <option value={receiptPrinter}>{receiptPrinter}</option>
                )}
                {!printerNames.length && !receiptPrinter && (
                  <option value="">(لم يتم العثور على طابعات)</option>
                )}
              </select>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              className="primary"
              style={{
                background: "#2e7d32",
                borderColor: "#2e7d32",
                padding: "8px 18px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontWeight: "bold",
              }}
              onClick={() => void printReceiptDirect()}
              disabled={printingDirect}
              title="طباعة حرارية مباشرة وسريعة على طابعة الفواتير (Enter)"
            >
              <LuPrinter /> {printingDirect ? "جارٍ الطباعة..." : "طباعة سريعة (Enter)"}
            </button>
            <button
              type="button"
              className="secondary"
              style={{
                padding: "8px 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
              onClick={() => void printReceiptPreview()}
              title="معاينة وطباعة ويندوز أو حفظ كـ PDF (Ctrl+P)"
            >
              <LuEye /> معاينة وطباعة ويندوز (Ctrl+P)
            </button>
            <button
              type="button"
              className="secondary"
              style={{ padding: "8px 14px" }}
              onClick={onNewSale || onClose}
            >
              {onNewSale ? "+ فاتورة جديدة (Esc)" : "إغلاق (Esc)"}
            </button>
          </div>
        </div>

        <div className="thermal-drawer-controls print-hide">
          <label className="thermal-drawer-auto">
            <input
              type="checkbox"
              checked={autoOpenDrawer}
              onChange={(event) => {
                setAutoOpenDrawer(event.target.checked);
                localStorage.setItem("morsi.autoOpenDrawer", String(event.target.checked));
              }}
            />
            فتح درج الكاشير بعد طباعة الفاتورة
          </label>
          <span style={{ fontSize: "12px", color: "#666" }}>
            (عبر طابعة: <strong>{receiptPrinter || "الافتراضية"}</strong>)
          </span>
          <select
            aria-label="منفذ الدرج"
            value={drawerPin}
            onChange={(event) => {
              const pin = Number(event.target.value) as 0 | 1;
              setDrawerPin(pin);
              localStorage.setItem("morsi.drawerPin", String(pin));
            }}
          >
            <option value={0}>منفذ 2</option>
            <option value={1}>منفذ 5</option>
          </select>
          <button type="button" className="secondary" onClick={() => void openDrawer()} disabled={!receiptPrinter.trim()}>
            تجربة فتح الدرج
          </button>
          {drawerNotice && <small role="status">{drawerNotice}</small>}
        </div>

        {/* The Receipt Strip */}
        <div ref={receiptRef} className={`thermal-receipt-card width-${paperSize}`}>
          {/* Header */}
          <div className="thermal-receipt-header">
            <img
              src="/logo.png"
              alt="morsi for belt"
              className="thermal-receipt-logo"
            />
            <div className="thermal-receipt-title">MORSI FOR BELT</div>
            <div className="thermal-receipt-address">طنطا - شارع القنطرة</div>
            <div className="thermal-receipt-contacts">
              <div className="thermal-receipt-contacts-row">
                <span>لطلبات الأونلاين:</span>
                <strong dir="ltr">01284888405</strong>
              </div>
              <div className="thermal-receipt-contacts-row">
                <span>رقم الشكاوى والمقترحات:</span>
                <strong dir="ltr">01270202539</strong>
              </div>
            </div>
          </div>

          <div className="thermal-receipt-divider-double" />

          {/* Meta */}
          <div className="thermal-receipt-meta">
            <div className="thermal-receipt-meta-row">
              <span>رقم الفاتورة:</span>
              <strong style={{ fontSize: "14px" }}>#{invoiceDetail.invoiceNumber}</strong>
            </div>
            <div className="thermal-receipt-meta-row">
              <span>التاريخ والوقت:</span>
              <span>{formatDateTime(invoiceDetail.createdAt)}</span>
            </div>
            <div className="thermal-receipt-meta-row">
              <span>البائع:</span>
              <span>{invoiceDetail.sellerName}</span>
            </div>
            {invoiceDetail.customerName && (
              <div className="thermal-receipt-meta-row">
                <span>العميل:</span>
                <strong>{invoiceDetail.customerName}</strong>
              </div>
            )}
            {invoiceDetail.customerPhone && (
              <div className="thermal-receipt-meta-row">
                <span>الهاتف:</span>
                <span style={{ direction: "ltr" }}>{invoiceDetail.customerPhone}</span>
              </div>
            )}
            {invoiceDetail.onlineOrderNumber && (
              <div className="thermal-receipt-meta-row" style={{ fontWeight: 700 }}>
                <span>نوع الفاتورة:</span>
                <span>طلب أونلاين #{invoiceDetail.onlineOrderNumber}</span>
              </div>
            )}
            {invoiceDetail.notes && (
              <div className="thermal-receipt-meta-row" style={{ marginTop: "2px" }}>
                <span>ملاحظات:</span>
                <span>{invoiceDetail.notes}</span>
              </div>
            )}
          </div>

          <div className="thermal-receipt-divider" />

          {/* Items Table */}
          <table className="thermal-receipt-table">
            <thead>
              <tr>
                <th style={{ textAlign: "right" }}>الصنف</th>
                <th style={{ textAlign: "center", width: "45px" }}>الكمية</th>
                <th style={{ textAlign: "left", width: "55px" }}>السعر</th>
                <th style={{ textAlign: "left", width: "60px" }}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {invoiceDetail.items.map((item, idx) => {
                const variantInfo = [item.color, item.size ? `مقاس ${item.size}` : ""].filter(Boolean).join(" · ");
                const itemDiscount = item.discountEachPiasters * item.quantity;
                return (
                  <tr key={idx}>
                    <td style={{ textAlign: "right" }}>
                      <strong>{item.nameSnapshot}</strong>
                      {variantInfo && (
                        <div style={{ fontSize: "10px", color: "#444" }}>{variantInfo}</div>
                      )}
                      {itemDiscount > 0 && (
                        <div style={{ fontSize: "10px", color: "#666" }}>خصم: -{money(itemDiscount)}</div>
                      )}
                    </td>
                    <td style={{ textAlign: "center", verticalAlign: "top" }}>
                      {item.quantity}
                    </td>
                    <td style={{ textAlign: "left", verticalAlign: "top" }}>
                      {(item.sellPricePiasters / 100).toFixed(2)}
                    </td>
                    <td style={{ textAlign: "left", verticalAlign: "top", fontWeight: 700 }}>
                      {(item.lineTotalPiasters / 100).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="thermal-receipt-divider" />

          {/* Totals & Payments */}
          <div className="thermal-receipt-totals">
            <div className="thermal-receipt-total-row">
              <span>عدد القطع:</span>
              <strong>{totalItemsCount} قطعة</strong>
            </div>
            {(invoiceDetail.shippingFeePiasters || 0) > 0 ? (
              <>
                <div className="thermal-receipt-total-row">
                  <span>إجمالي المنتجات:</span>
                  <span>{money(invoiceDetail.subtotalPiasters - (invoiceDetail.shippingFeePiasters || 0))}</span>
                </div>
                <div className="thermal-receipt-total-row">
                  <span>مصاريف الشحن:</span>
                  <span>+{money(invoiceDetail.shippingFeePiasters || 0)}</span>
                </div>
              </>
            ) : (
              <div className="thermal-receipt-total-row">
                <span>المجموع الفرعي:</span>
                <span>{money(invoiceDetail.subtotalPiasters)}</span>
              </div>
            )}
            {invoiceDetail.discountPiasters > 0 && (
              <>
                {(invoiceDetail.extraDiscountPiasters || 0) > 0 ? (
                  <>
                    {invoiceDetail.discountPiasters - (invoiceDetail.extraDiscountPiasters || 0) > 0 && (
                      <div className="thermal-receipt-total-row">
                        <span>خصم القطع:</span>
                        <span>-{money(invoiceDetail.discountPiasters - (invoiceDetail.extraDiscountPiasters || 0))}</span>
                      </div>
                    )}
                    <div className="thermal-receipt-total-row">
                      <span>خصم الفاتورة:</span>
                      <span>-{money(invoiceDetail.extraDiscountPiasters || 0)}</span>
                    </div>
                    <div className="thermal-receipt-total-row">
                      <span>إجمالي الخصم:</span>
                      <span>-{money(invoiceDetail.discountPiasters)}</span>
                    </div>
                  </>
                ) : (
                  <div className="thermal-receipt-total-row">
                    <span>إجمالي الخصم:</span>
                    <span>-{money(invoiceDetail.discountPiasters)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="thermal-receipt-grand-box">
            <span>الإجمالي المستحق:</span>
            <span>{money(invoiceDetail.totalPiasters)}</span>
          </div>

          {/* Payment breakdown */}
          <div className="thermal-receipt-totals" style={{ fontSize: "11px" }}>
            {(invoiceDetail.depositPiasters || 0) > 0 ? (
              <>
                <div className="thermal-receipt-total-row" style={{ fontWeight: 700, color: "#1b5e20" }}>
                  <span>العربون المدفوع:</span>
                  <span>{money(invoiceDetail.depositPiasters || 0)}</span>
                </div>
                <div className="thermal-receipt-total-row" style={{ fontWeight: 800, color: "#900", fontSize: "13px" }}>
                  <span>المطلوب عند الاستلام:</span>
                  <span>{money(Math.max(0, invoiceDetail.totalPiasters - (invoiceDetail.depositPiasters || 0)))}</span>
                </div>
              </>
            ) : invoiceDetail.onlineOrderNumber ? (
              <div className="thermal-receipt-total-row" style={{ fontWeight: 800, color: "#900", fontSize: "13px" }}>
                <span>المطلوب عند الاستلام:</span>
                <span>{money(invoiceDetail.totalPiasters)}</span>
              </div>
            ) : (
              <>
                {invoiceDetail.paidCashPiasters > 0 && (
                  <div className="thermal-receipt-total-row">
                    <span>المدفوع نقداً (كاش):</span>
                    <span>{money(invoiceDetail.paidCashPiasters)}</span>
                  </div>
                )}
                {invoiceDetail.paidCashPiasters > invoiceDetail.totalPiasters && (
                  <div className="thermal-receipt-total-row" style={{ fontWeight: 700 }}>
                    <span>الباقي للعميل:</span>
                    <span>{money(invoiceDetail.paidCashPiasters - invoiceDetail.totalPiasters)}</span>
                  </div>
                )}
                {invoiceDetail.paidInstapayPiasters > 0 && (
                  <div className="thermal-receipt-total-row">
                    <span>المدفوع إنستاباي:</span>
                    <span>{money(invoiceDetail.paidInstapayPiasters)}</span>
                  </div>
                )}
                {invoiceDetail.paidWalletPiasters > 0 && (
                  <div className="thermal-receipt-total-row">
                    <span>المدفوع محفظة إلكترونية:</span>
                    <span>{money(invoiceDetail.paidWalletPiasters)}</span>
                  </div>
                )}
                {invoiceDetail.remainingPiasters > 0 && (
                  <div className="thermal-receipt-total-row" style={{ fontWeight: 800, color: "#900" }}>
                    <span>المتبقي (آجل):</span>
                    <span>{money(invoiceDetail.remainingPiasters)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="thermal-receipt-divider-double" />

          {/* Return Policy & Store Greeting */}
          <div className="thermal-receipt-footer">
            <div>• برجاء الحفاظ على الفاتورة لضمان حقك في الاستبدال أو الاسترجاع خلال 14 يوم</div>
            <div style={{ marginTop: "6px", fontWeight: 700 }}>
              علموا اولادكم ان القدس ستبقى عربية ❤️
            </div>
            <div className="thermal-receipt-socials">
              <p>👇مستنيك هنا👇</p>
              <div className="thermal-receipt-social-item fb">
                <FaFacebook />
                <span>Morsi For Belt</span>
              </div>
              <div className="thermal-receipt-social-item tiktok">
                <FaTiktok />
                <span>Morsi_For_Belt - مرسى للجلود</span>
              </div>
            </div>
          </div>

          <div className="thermal-receipt-paper-cut">
            - - - - - - - - - - - - - - - - - - - - - - - -
          </div>
        </div>
      </div>
    </div>,
    document.body,
      )}
    </>
  );
}



type BarcodePrintItem = {
  key: string;
  productId: number;
  variantId: number | null;
  name: string;
  category: string;
  color: string | null;
  size: string | null;
  location: string | null;
  barcode: string;
  sellPricePiasters: number;
  availableQuantity: number;
  qty: number;
};

function BarcodePrintPage({
  products,
  categories,
  warehouses,
}: {
  products: Product[];
  categories: Named[];
  warehouses: Named[];
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [printQueue, setPrintQueue] = useState<BarcodePrintItem[]>([]);
  const [qtyInputMap, setQtyInputMap] = useState<Record<number, number>>({});
  const [variantQtyMap, setVariantQtyMap] = useState<Record<string, number>>({});
  const [expandedProductIds, setExpandedProductIds] = useState<Set<number>>(new Set());
  const [warningMsg, setWarningMsg] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const groupedProducts = groupProductRows(products);

  const filteredGroups = groupedProducts.filter((group) => {
    if (categoryFilter && group.category !== categoryFilter) return false;
    if (warehouseFilter && !group.warehouses.includes(warehouseFilter)) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const text = [
        group.name,
        group.barcode,
        group.category,
        ...group.colors,
        ...group.sizes,
        ...group.warehouses,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  const makeItem = (group: ProductGroup, variant?: Product | null, qty: number = 1): BarcodePrintItem => {
    const v = variant || (group.rows.length === 1 ? group.rows[0] : null);
    const key = v?.variantId ? `${group.productId}_${v.variantId}` : `${group.productId}_main`;
    return {
      key,
      productId: group.productId,
      variantId: v?.variantId ?? null,
      name: group.name,
      category: group.category,
      color: v?.color ?? null,
      size: v?.size ?? null,
      location: v?.location || group.locations[0] || null,
      barcode: group.barcode || v?.barcode || `P${group.productId}`,
      sellPricePiasters: group.sellPricePiasters,
      availableQuantity: v ? v.quantity : group.totalQuantity,
      qty,
    };
  };

  const toggleExpand = (productId: number) => {
    setExpandedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const handleGroupQtyChange = (group: ProductGroup, rawVal: string) => {
    let num = parseInt(rawVal, 10);
    if (isNaN(num) || num < 0) num = 0;
    setQtyInputMap((prev) => ({ ...prev, [group.productId]: num }));
  };

  const addVariantToQueue = (group: ProductGroup, variant: Product, requestedQty: number) => {
    if (requestedQty <= 0) {
      setWarningMsg("يرجى تحديد عدد ملصقات أكبر من 0 للطباعة");
      setTimeout(() => setWarningMsg(null), 3000);
      return;
    }
    const item = makeItem(group, variant, requestedQty);
    setPrintQueue((prev) => {
      const idx = prev.findIndex((p) => p.key === item.key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item];
    });
  };

  const addAllVariantsOfGroup = (group: ProductGroup) => {
    const variantsToAdd = group.rows;
    if (!variantsToAdd.length) {
      setWarningMsg(`لا توجد عناصر للمنتج "${group.name}"`);
      setTimeout(() => setWarningMsg(null), 3000);
      return;
    }
    setPrintQueue((prev) => {
      const next = [...prev];
      for (const variant of variantsToAdd) {
        const vKey = `${group.productId}_${variant.variantId ?? "main"}`;
        const defaultQty = variant.quantity > 0 ? variant.quantity : 1;
        const vQty = variantQtyMap[vKey] !== undefined ? variantQtyMap[vKey] : defaultQty;
        const finalQty = vQty > 0 ? vQty : defaultQty;
        const item = makeItem(group, variant, finalQty);
        const idx = next.findIndex((p) => p.key === item.key);
        if (idx >= 0) {
          next[idx] = item;
        } else {
          next.push(item);
        }
      }
      return next;
    });
  };

  const addGroupToQueue = (group: ProductGroup) => {
    if (group.rows.length > 1) {
      addAllVariantsOfGroup(group);
      return;
    }
    const defaultQty = group.totalQuantity > 0 ? group.totalQuantity : 1;
    const requestedQty = qtyInputMap[group.productId] !== undefined ? qtyInputMap[group.productId] : defaultQty;
    if (requestedQty <= 0) {
      setWarningMsg("يرجى تحديد عدد ملصقات أكبر من 0 للطباعة");
      setTimeout(() => setWarningMsg(null), 3000);
      return;
    }
    const item = makeItem(group, group.rows[0], requestedQty);
    setPrintQueue((prev) => {
      const idx = prev.findIndex((p) => p.key === item.key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = item;
        return next;
      }
      return [...prev, item];
    });
  };

  const removeFromQueue = (key: string) => {
    setPrintQueue((prev) => prev.filter((item) => item.key !== key));
  };

  const directPrintVariant = (group: ProductGroup, variant: Product, qty: number) => {
    if (qty <= 0) {
      setWarningMsg("يرجى تحديد عدد ملصقات أكبر من 0 للطباعة");
      setTimeout(() => setWarningMsg(null), 3000);
      return;
    }
    const item = makeItem(group, variant, qty);
    setPrintQueue([item]);
    setIsPreviewOpen(true);
  };

  const directPrintGroup = (group: ProductGroup) => {
    if (group.rows.length > 1) {
      const variantsToAdd = group.rows;
      if (!variantsToAdd.length) {
        setWarningMsg(`لا توجد عناصر للمنتج "${group.name}"`);
        setTimeout(() => setWarningMsg(null), 3000);
        return;
      }
      const items = variantsToAdd.map((v) => {
        const vKey = `${group.productId}_${v.variantId ?? "main"}`;
        const defaultQty = v.quantity > 0 ? v.quantity : 1;
        const vQty = variantQtyMap[vKey] !== undefined ? variantQtyMap[vKey] : defaultQty;
        return makeItem(group, v, vQty > 0 ? vQty : defaultQty);
      });
      setPrintQueue(items);
      setIsPreviewOpen(true);
      return;
    }
    const defaultQty = group.totalQuantity > 0 ? group.totalQuantity : 1;
    const requestedQty = qtyInputMap[group.productId] !== undefined ? qtyInputMap[group.productId] : defaultQty;
    if (requestedQty <= 0) {
      setWarningMsg("يرجى تحديد عدد ملصقات أكبر من 0 للطباعة");
      setTimeout(() => setWarningMsg(null), 3000);
      return;
    }
    const item = makeItem(group, group.rows[0], requestedQty);
    setPrintQueue([item]);
    setIsPreviewOpen(true);
  };

  const totalLabelsCount = printQueue.reduce((acc, item) => acc + item.qty, 0);

  return (
    <div className="stack">
      <section className="panel print-hide">
        <div className="section-head">
          <div>
            <h2>🏷️ طباعة الباركود والملصقات</h2>
            <p>طباعة طوابع الباركود للأصناف ومتغيراتها باللون والمقاس ومكان الرف لطابعات الملصقات الحرارية</p>
          </div>
          {totalLabelsCount > 0 && (
            <button
              type="button"
              className="primary"
              onClick={() => setIsPreviewOpen(true)}
              style={{ background: "#24742c", borderColor: "#24742c", padding: "10px 18px", fontSize: "14px" }}
            >
              معاينة وطباعة الطابور ({totalLabelsCount} ملصق) 🖨️
            </button>
          )}
        </div>

        {warningMsg && (
          <div className="message warning" style={{ marginBottom: "14px" }}>
            {warningMsg}
          </div>
        )}

        <div className="filters-bar" style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
          <div style={{ flex: 1, minWidth: "220px" }}>
            <input
              placeholder="🔍 بحث باسم المنتج، الباركود، التصنيف، المقاس، اللون..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: "9px 12px", width: "100%" }}
            />
          </div>
          <div style={{ minWidth: "160px" }}>
            <BrandSelect
              label="التصنيف"
              value={categoryFilter}
              onValueChange={setCategoryFilter}
              placeholder="كل التصنيفات"
              emptyOptionLabel="كل التصنيفات"
              options={categories.map((c) => ({ value: c.name, label: c.name }))}
            />
          </div>
          <div style={{ minWidth: "160px" }}>
            <BrandSelect
              label="المخزن"
              value={warehouseFilter}
              onValueChange={setWarehouseFilter}
              placeholder="كل المخازن"
              emptyOptionLabel="كل المخازن"
              options={warehouses.map((w) => ({ value: w.name, label: w.name }))}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>المنتج</th>
                <th>التصنيف والمخازن</th>
                <th>المتغيرات (اللون والمقاس)</th>
                <th>سعر البيع</th>
                <th>الباركود الأصلي</th>
                <th>إجمالي الكمية المتاحة 📦</th>
                <th style={{ width: "130px" }}>عدد الملصقات 🖨️</th>
                <th>إجراءات الطباعة</th>
              </tr>
            </thead>
            <tbody>
              {filteredGroups.map((group) => {
                const available = group.totalQuantity;
                const hasMultipleVariants = group.rows.length > 1;
                const isExpanded = expandedProductIds.has(group.productId);
                const defaultQty = available > 0 ? available : 1;
                const currentQtyInput = qtyInputMap[group.productId] !== undefined ? qtyInputMap[group.productId] : defaultQty;
                const isParentInQueue = printQueue.some((item) => item.productId === group.productId);
                const variantsSummary = [
                  group.colors.length ? `الألوان: ${group.colors.join("، ")}` : "",
                  group.sizes.length ? `المقاسات: ${group.sizes.join("، ")}` : "",
                ].filter(Boolean).join(" · ");

                return (
                  <Fragment key={group.productId}>
                    <tr style={available === 0 ? { opacity: 0.85, background: "#fbfaf8" } : {}}>
                      <td>
                        <strong style={{ fontSize: "14px" }}>{group.name}</strong>
                      </td>
                      <td>
                        <span className="pill">{group.category}</span>
                        <small style={{ display: "block", color: "#8b7b70", marginTop: "2px" }}>{group.warehouses.join("، ") || "المخزن الرئيسي"}</small>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <small style={{ color: "#785038" }}>
                            {variantsSummary || (group.rows[0]?.color || group.rows[0]?.size ? [group.rows[0]?.color ? `لون: ${group.rows[0].color}` : "", group.rows[0]?.size ? `مقاس: ${group.rows[0].size}` : ""].filter(Boolean).join(" · ") : "منتج فردي (بدون متغيرات)")}
                          </small>
                          {hasMultipleVariants && (
                            <button
                              type="button"
                              className="link-button"
                              style={{ fontSize: "11.5px", fontWeight: 700, color: "#1d4ed8", textAlign: "right", padding: 0 }}
                              onClick={() => toggleExpand(group.productId)}
                            >
                              {isExpanded ? "▲ إخفاء تفاصيل المقاسات والألوان" : `▼ تفاصيل المقاسات والألوان (${group.rows.length})`}
                            </button>
                          )}
                        </div>
                      </td>
                      <td><strong>{money(group.sellPricePiasters)}</strong></td>
                      <td>
                        <code style={{ fontSize: "12px", background: "#f5ece3", padding: "2px 6px", borderRadius: "4px" }}>
                          {group.barcode || `P${group.productId}`}
                        </code>
                      </td>
                      <td>
                        <strong style={{ color: available > 0 ? "#24742c" : "#b94d3f", fontSize: "15px" }}>
                          {available} قطعة
                        </strong>
                      </td>
                      <td>
                        <input
                          type="number"
                          min={1}
                          value={currentQtyInput || ""}
                          placeholder="1"
                          onChange={(e) => handleGroupQtyChange(group, e.target.value)}
                          style={{
                            width: "80px",
                            padding: "6px 8px",
                            textAlign: "center",
                            fontWeight: "bold",
                            fontSize: "14px",
                            borderRadius: "6px",
                            border: "1px solid #d0c2b4",
                          }}
                        />
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className={isParentInQueue ? "secondary" : "primary"}
                            onClick={() => addGroupToQueue(group)}
                            style={{ fontSize: "12px", padding: "6px 10px" }}
                            title={hasMultipleVariants ? "إضافة جميع المتغيرات لهذا المنتج" : "إضافة هذا المنتج لطابور الطباعة"}
                          >
                            {hasMultipleVariants ? (isParentInQueue ? "تحديث الكل 🔄" : "+ كل المتغيرات") : (isParentInQueue ? "تحديث 🔄" : "+ للطابور")}
                          </button>
                          <button
                            type="button"
                            className="secondary"
                            onClick={() => directPrintGroup(group)}
                            style={{ fontSize: "12px", padding: "6px 10px", borderColor: "#785038", color: "#785038" }}
                            title="طباعة فورية"
                          >
                            طباعة فورية 🖨️
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded variants list */}
                    {hasMultipleVariants && isExpanded && (
                      <tr className="product-details-row">
                        <td colSpan={8} style={{ background: "#faf8f5", padding: "14px 20px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                            <div>
                              <strong style={{ fontSize: "13.5px", color: "#34231c" }}>
                                📦 مقاسات وألوان: {group.name}
                              </strong>
                              <span style={{ fontSize: "12px", color: "#785038", marginRight: "10px" }}>
                                حدد عدد ملصقات الباركود لكل قطعة ولون ومقاس بدقة
                              </span>
                            </div>
                            <button
                              type="button"
                              className="secondary"
                              style={{ fontSize: "12px", padding: "5px 12px", borderColor: "#24742c", color: "#24742c", fontWeight: 700 }}
                              onClick={() => addAllVariantsOfGroup(group)}
                            >
                              + إضافة جميع المتغيرات للطابور
                            </button>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "10px" }}>
                            {group.rows.map((variant, vIdx) => {
                              const vKey = `${group.productId}_${variant.variantId ?? vIdx}`;
                              const defaultVQty = variant.quantity > 0 ? variant.quantity : 1;
                              const vQty = variantQtyMap[vKey] !== undefined ? variantQtyMap[vKey] : defaultVQty;
                              const isQueued = printQueue.some((item) => item.key === vKey);

                              return (
                                <div
                                  key={vKey}
                                  style={{
                                    background: "#fff",
                                    border: "1px solid #e2d2c1",
                                    borderRadius: "8px",
                                    padding: "10px 12px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "5px",
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span style={{ fontWeight: 800, fontSize: "13px", color: "#34231c" }}>
                                      {variant.color ? `اللون: ${variant.color}` : "بدون لون"}
                                      {variant.size ? ` · المقاس: ${variant.size}` : ""}
                                    </span>
                                    <span style={{ fontSize: "11px", fontWeight: 700, color: variant.quantity > 0 ? "#24742c" : "#b94d3f" }}>
                                      المتاح: {variant.quantity}
                                    </span>
                                  </div>

                                  {variant.location && (
                                    <span style={{ fontSize: "11px", color: "#785038" }}>
                                      📍 رف: {variant.location} ({variant.warehouse})
                                    </span>
                                  )}

                                  <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "4px" }}>
                                    <input
                                      type="number"
                                      min={1}
                                      value={vQty || ""}
                                      placeholder="1"
                                      onChange={(e) => {
                                        let val = parseInt(e.target.value, 10);
                                        if (isNaN(val) || val < 0) val = 0;
                                        setVariantQtyMap((prev) => ({ ...prev, [vKey]: val }));
                                      }}
                                      style={{ width: "65px", padding: "4px 6px", textAlign: "center", fontWeight: "bold", fontSize: "13px" }}
                                    />
                                    <button
                                      type="button"
                                      className={isQueued ? "secondary" : "primary"}
                                      style={{ flex: 1, fontSize: "11px", padding: "5px 8px" }}
                                      disabled={vQty <= 0}
                                      onClick={() => addVariantToQueue(group, variant, vQty)}
                                    >
                                      {isQueued ? "تحديث 🔄" : "+ للطابور"}
                                    </button>
                                    <button
                                      type="button"
                                      className="secondary"
                                      style={{ fontSize: "11px", padding: "5px 8px", borderColor: "#785038", color: "#785038" }}
                                      disabled={vQty <= 0}
                                      onClick={() => directPrintVariant(group, variant, vQty)}
                                      title="طباعة فورية لهذا المقاس/اللون"
                                    >
                                      🖨️
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {!filteredGroups.length && <Empty text="لا توجد منتجات تطابق نتائج البحث." />}
        </div>
      </section>

      {printQueue.length > 0 && (
        <section className="panel print-hide" style={{ background: "#faf6f0", border: "1.5px solid #c99a59" }}>
          <div className="section-head">
            <div>
              <h3>📋 طابور ملصقات الباركود الجاهزة للطباعة ({totalLabelsCount} ملصق)</h3>
              <p>مجموعة المنتجات والمتغيرات التي اخترتها وطباعتها دفعة واحدة على مكنة الباركود</p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" className="secondary" onClick={() => setPrintQueue([])}>
                تفريغ الطابور 🗑️
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => setIsPreviewOpen(true)}
                style={{ background: "#24742c", borderColor: "#24742c" }}
              >
                معاينة وطباعة الكل ({totalLabelsCount} ملصق) 🖨️
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>اللون والمقاس</th>
                  <th>مكان الرف</th>
                  <th>الباركود</th>
                  <th>السعر</th>
                  <th>عدد الملصقات المطلوب طباعتها</th>
                  <th>حذف</th>
                </tr>
              </thead>
              <tbody>
                {printQueue.map((item) => (
                  <tr key={item.key}>
                    <td><strong>{item.name}</strong></td>
                    <td>
                      <span style={{ fontWeight: 700, color: "#34231c" }}>
                        {item.color ? `اللون: ${item.color}` : "—"}
                        {item.size ? ` · المقاس: ${item.size}` : ""}
                        {!item.color && !item.size ? "منتج فردي (بدون متغيرات)" : ""}
                      </span>
                    </td>
                    <td>{item.location ? `📍 ${item.location}` : "—"}</td>
                    <td><code>{item.barcode}</code></td>
                    <td><strong>{money(item.sellPricePiasters)}</strong></td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val) && val > 0) {
                              setPrintQueue((prev) =>
                                prev.map((p) => (p.key === item.key ? { ...p, qty: val } : p))
                              );
                            }
                          }}
                          style={{ width: "70px", padding: "4px 8px", textAlign: "center", fontWeight: "bold", fontSize: "14px" }}
                        />
                        <span style={{ fontSize: "13px", color: "#5d3a28" }}>ملصق</span>
                      </div>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="sheet-close"
                        onClick={() => removeFromQueue(item.key)}
                        title="حذف من الطابور"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {isPreviewOpen && (
        <PreviewBarcodeModal
          queue={printQueue}
          onClose={() => setIsPreviewOpen(false)}
        />
      )}
    </div>
  );
}

function PreviewBarcodeModal({
  queue,
  onClose,
}: {
  queue: BarcodePrintItem[];
  onClose: () => void;
}) {
  const totalStickers = queue.reduce((sum, item) => sum + item.qty, 0);

  const labelsRef = useRef<HTMLDivElement>(null);
  const [barcodePrinter, setBarcodePrinter] = useState(() => localStorage.getItem("morsi.barcodePrinter") || "");
  const [printerNames, setPrinterNames] = useState<string[]>([]);
  const [printNotice, setPrintNotice] = useState("");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    void Promise.all([
      invoke<string>("get_default_receipt_printer").catch((): string => ""),
      invoke<string[]>("list_receipt_printers").catch((): string[] => []),
    ]).then(([defaultPrinter, installedPrinters]) => {
      setPrinterNames(installedPrinters);
      setBarcodePrinter((current) => {
        if (current && installedPrinters.includes(current)) return current;
        const saved = localStorage.getItem("morsi.barcodePrinter");
        if (saved && installedPrinters.includes(saved)) return saved;
        const bestBarcode = installedPrinters.find(isLikelyBarcodePrinter);
        if (bestBarcode) {
          localStorage.setItem("morsi.barcodePrinter", bestBarcode);
          return bestBarcode;
        }
        return defaultPrinter || installedPrinters[0] || "";
      });
    });
  }, []);

  const handleClose = () => {
    if (isTauri()) {
      const rec = localStorage.getItem("morsi.receiptPrinter") || localStorage.getItem("morsi.drawerPrinter") || "";
      if (rec.trim()) {
        void invoke("set_default_receipt_printer", { printerName: rec.trim() }).catch(() => {});
      }
    }
    onClose();
  };

  const [showName, setShowName] = useState(true);
  const [showVariantInfo, setShowVariantInfo] = useState(true);
  const [showLocation, setShowLocation] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [labelSize, setLabelSize] = useState<"standard" | "compact" | "large">(() => {
    const saved = localStorage.getItem("morsi.barcodeLabelSize");
    if (saved === "compact" || saved === "standard" || saved === "large") return saved;
    return "compact";
  });

  const handleSelectLabelSize = (size: "standard" | "compact" | "large") => {
    setLabelSize(size);
    localStorage.setItem("morsi.barcodeLabelSize", size);
  };

  const stickersToPrint: BarcodePrintItem[] = [];
  for (const item of queue) {
    for (let i = 0; i < item.qty; i++) {
      stickersToPrint.push(item);
    }
  }

  const printLabelsPreview = async () => {
    if (!labelsRef.current) return;
    try {
      setPrintNotice("");
      if (isTauri() && barcodePrinter.trim()) {
        await invoke("set_default_receipt_printer", { printerName: barcodePrinter.trim() }).catch(() => {});
      }
      await printBarcodeStickersHtml(labelsRef.current, labelSize);
    } catch (error) {
      setPrintNotice(`تعذرت معاينة/طباعة الملصقات: ${String(error)}`);
    }
  };

  const printLabelsDirect = async () => {
    if (!labelsRef.current) return;
    if (!isTauri()) {
      await printLabelsPreview();
      return;
    }
    setPrinting(true);
    setPrintNotice("");
    try {
      const printerName = barcodePrinter.trim() || await invoke<string>("get_default_receipt_printer");
      const labels = Array.from(labelsRef.current.querySelectorAll<HTMLElement>(".barcode-label-card"));
      const labelWidth = labelSize === "compact" ? 320 : labelSize === "large" ? 480 : 400;
      const labelHeight = labelSize === "compact" ? 200 : labelSize === "large" ? 320 : 240;
      const paperW = labelSize === "compact" ? 40 : labelSize === "standard" ? 50 : 60;
      const paperH = labelSize === "compact" ? 25 : labelSize === "standard" ? 30 : 40;

      // Fast caching by sticker signature to avoid re-rendering identical stickers multiple times
      const pixelCache = new Map<string, { widthBytes: number; height: number; pixels: number[] }>();
      const labelsData: Array<{ widthBytes: number; height: number; pixels: number[] }> = [];

      for (let index = 0; index < stickersToPrint.length; index++) {
        const item = stickersToPrint[index];
        const cacheKey = `${item.key}_${labelSize}_${showName}_${showVariantInfo}_${showLocation}_${showPrice}`;
        let cached = pixelCache.get(cacheKey);
        if (!cached) {
          const domCard = labels[index];
          if (domCard) {
            const page = document.createElement("canvas");
            page.width = 576;
            page.height = labelHeight;
            const context = page.getContext("2d");
            if (!context) throw new Error("تعذر تجهيز ملصقات الطباعة");
            context.fillStyle = "#fff";
            context.fillRect(0, 0, page.width, page.height);
            const label = await thermalCanvas(domCard, labelWidth, labelHeight);
            context.drawImage(label, Math.floor((page.width - labelWidth) / 2), 0);
            cached = thermalPixels(page);
            pixelCache.set(cacheKey, cached);
          }
        }
        if (cached) {
          labelsData.push(cached);
        }
      }

      await invoke("print_thermal_labels", {
        printerName,
        labels: labelsData,
        paperWidthMm: paperW,
        paperHeightMm: paperH,
      });
      setPrintNotice(`تم إرسال ${labelsData.length} ملصق لطابعة الباركود دفعة واحدة بنجاح 🖨️`);
    } catch (error) {
      console.warn("Direct barcode print error, fallback to preview:", error);
      setPrintNotice(`تعذرت الطباعة المباشرة (${String(error)}) - جارٍ فتح معاينة الطباعة...`);
      try {
        await printLabelsPreview();
      } catch (previewErr) {
        setPrintNotice(`تعذرت طباعة الملصقات: ${String(previewErr)}`);
      }
    } finally {
      setPrinting(false);
    }
  };

  useEffect(() => {
    const handlePrintShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
        event.preventDefault();
        event.stopImmediatePropagation();
        void printLabelsPreview();
      } else if (event.key === "Enter") {
        event.preventDefault();
        event.stopImmediatePropagation();
        void printLabelsDirect();
      }
    };
    window.addEventListener("keydown", handlePrintShortcut, true);
    return () => window.removeEventListener("keydown", handlePrintShortcut, true);
  });

  return (
    <>
      {createPortal(
    <div className="variant-picker-overlay barcode-print-overlay" style={{ zIndex: 4000 }}>
      <section
        className="invoice-details-dialog barcode-print-modal-only"
        style={{ width: "95vw", maxWidth: "1100px", maxHeight: "92vh", padding: "28px" }}
      >
        <div className="invoice-details-header print-hide">
          <div>
            <h2>🖨️ معاينة ملصقات الباركود للطباعة ({totalStickers} ملصق)</h2>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#785038" }}>
              شكل وطابع ملصقات الباركود كما ستظهر على طابعة الملصقات الحرارية
            </p>
          </div>
          <button type="button" className="sheet-close" onClick={handleClose}>
            ✕
          </button>
        </div>

        {/* Print Settings Toolbar */}
        <div className="print-hide" style={{
          background: "#faf6f0",
          border: "1px solid #e2d2c1",
          borderRadius: "10px",
          padding: "10px 16px",
          margin: "12px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "#5d3a28" }}>بيانات الملصق:</span>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", margin: 0, cursor: "pointer", color: "#34231c" }}>
              <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} />
              <span>اسم المنتج</span>
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", margin: 0, cursor: "pointer", color: "#34231c" }}>
              <input type="checkbox" checked={showVariantInfo} onChange={(e) => setShowVariantInfo(e.target.checked)} />
              <span>اللون والمقاس</span>
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", margin: 0, cursor: "pointer", color: "#34231c" }}>
              <input type="checkbox" checked={showLocation} onChange={(e) => setShowLocation(e.target.checked)} />
              <span>مكان الصنف / الرف</span>
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", margin: 0, cursor: "pointer", color: "#34231c" }}>
              <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
              <span>سعر البيع</span>
            </label>
          </div>

          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "#785038", fontWeight: 600 }}>حجم الملصق:</span>
            <button
              type="button"
              className={`thermal-size-btn ${labelSize === "compact" ? "active" : ""}`}
              onClick={() => handleSelectLabelSize("compact")}
              style={{ fontSize: "11px", padding: "4px 8px" }}
              title="المقاس الصغير 40×25 مم"
            >
              40×25 مم (صغير)
            </button>
            <button
              type="button"
              className={`thermal-size-btn ${labelSize === "standard" ? "active" : ""}`}
              onClick={() => handleSelectLabelSize("standard")}
              style={{ fontSize: "11px", padding: "4px 8px" }}
              title="المقاس الوسط 50×30 مم"
            >
              50×30 مم (وسط)
            </button>
            <button
              type="button"
              className={`thermal-size-btn ${labelSize === "large" ? "active" : ""}`}
              onClick={() => handleSelectLabelSize("large")}
              style={{ fontSize: "11px", padding: "4px 8px" }}
              title="المقاس الكبير 60×40 مم"
            >
              60×40 مم (كبير)
            </button>
          </div>
        </div>

        <div className="barcode-print-content" style={{ margin: "16px 0", maxHeight: "60vh", overflowY: "auto", background: "#f2ece4", padding: "16px", borderRadius: "10px" }}>
          <div ref={labelsRef} className="barcode-stickers-grid">
            {stickersToPrint.map((item, idx) => {
              const code = item.barcode || `P${item.productId}`;
              const locationText = item.location || "";
              const hasColor = Boolean(item.color && item.color.trim());
              const hasSize = Boolean(item.size && item.size.trim());

              return (
                <div key={idx} className={`barcode-label-card size-${labelSize}`}>
                  <div className="barcode-label-inner">
                    {showName && (
                      <div className="barcode-label-name" title={item.name}>
                        {item.name}
                      </div>
                    )}
                    {showVariantInfo && (hasColor || hasSize) && (
                      <div className="barcode-label-variant">
                        {hasColor && <span>اللون: {item.color}</span>}
                        {hasColor && hasSize && <span className="barcode-variant-sep">·</span>}
                        {hasSize && <span>المقاس: {item.size}</span>}
                      </div>
                    )}
                    {showLocation && locationText && (
                      <div className="barcode-label-loc">
                        <span>مكان: {locationText}</span>
                      </div>
                    )}
                    <div className="barcode-label-svg-wrap">
                      <BarcodeSVG
                        code={code}
                        width={labelSize === "compact" ? 105 : labelSize === "large" ? 150 : 125}
                        height={labelSize === "compact" ? 30 : labelSize === "large" ? 42 : 36}
                      />
                      <div className="barcode-label-code">{code}</div>
                    </div>
                    {showPrice && (
                      <div className="barcode-label-price">
                        السعر: <strong>{(item.sellPricePiasters / 100).toFixed(2)} ج.م</strong>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="print-hide" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e9e1d9", paddingTop: "14px" }}>
          <span style={{ fontSize: "13px", color: "#785038" }}>
            جاهز للطباعة على طابعة الملصقات الحرارية (Thermal Barcode Printer)
          </span>
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "#5d3a28", fontWeight: 700 }}>🖨️ طابعة الباركود:</span>
              <select
                aria-label="طابعة الباركود في ويندوز"
                value={barcodePrinter}
                onChange={(event) => {
                  setBarcodePrinter(event.target.value);
                  localStorage.setItem("morsi.barcodePrinter", event.target.value);
                }}
                style={{
                  minWidth: "170px",
                  padding: "7px 12px",
                  borderRadius: "6px",
                  fontWeight: "bold",
                  fontSize: "13px",
                  border: "1.5px solid #c99a59",
                  background: "#fff",
                  color: "#34231c",
                  cursor: "pointer",
                }}
              >
                {printerNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
                {barcodePrinter && !printerNames.includes(barcodePrinter) && (
                  <option value={barcodePrinter}>{barcodePrinter}</option>
                )}
                {!printerNames.length && !barcodePrinter && (
                  <option value="">(لم يتم العثور على طابعات)</option>
                )}
              </select>
            </div>
            <button
              type="button"
              className="primary"
              style={{ background: "#24742c", borderColor: "#24742c", padding: "10px 20px", fontSize: "14px", fontWeight: "bold" }}
              onClick={() => void printLabelsDirect()}
              disabled={printing}
              title="طباعة حرارية مباشرة وسريعة لطابعة الباركود دفعة واحدة (Enter)"
            >
              {printing ? "جارٍ إرسال الملصقات..." : "طباعة سريعة مباشرة"} 🖨️
            </button>
            <button
              type="button"
              className="secondary"
              style={{ padding: "10px 18px", fontSize: "14px", fontWeight: 700 }}
              onClick={() => void printLabelsPreview()}
              title="معاينة وطباعة ويندوز لجميع الكميات والملصقات (Ctrl+P)"
            >
              معاينة وطباعة ويندوز 🖨️
            </button>
            <button type="button" className="secondary" onClick={handleClose}>
              إغلاق
            </button>
          </div>
        </div>
        {printNotice && <div className="print-hide" role="status" style={{ marginTop: "8px", textAlign: "center" }}>{printNotice}</div>}
      </section>
    </div>,
    document.body,
      )}
    </>
  );
}

function ProductMovementReport({
  products,
  session,
}: {
  products: Product[];
  session: Session;
}) {
  const groupedProducts = groupProductRows(products);
  const [selectedProduct, setSelectedProduct] = useState<ProductGroup | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ProductMovementReportView | null>(null);
  const [activeTab, setActiveTab] = useState<"sales" | "returns" | "movements">("sales");
  const [tableSearch, setTableSearch] = useState("");

  const [salesPage, setSalesPage] = useState(1);
  const [salesPageSize, setSalesPageSize] = useState(15);

  const [returnsPage, setReturnsPage] = useState(1);
  const [returnsPageSize, setReturnsPageSize] = useState(15);

  const [movementsPage, setMovementsPage] = useState(1);
  const [movementsPageSize, setMovementsPageSize] = useState(15);

  const filteredSearchProducts = groupedProducts.filter((p) => {
    const q = normalizeArabic(searchQuery.trim());
    if (!q) return true;
    return (
      normalizeArabic(p.name).includes(q) ||
      p.barcode.toLowerCase().includes(q.toLowerCase()) ||
      normalizeArabic(p.category).includes(q)
    );
  });

  const reportRequestId = useRef(0);
  const fetchReport = useCallback(
    async (productId: number, variantId: number | null, start: string, end: string) => {
      const requestId = ++reportRequestId.current;
      setLoading(true);
      setError("");
      setReport(null);
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        const data = await Promise.race([
          invoke<ProductMovementReportView>("get_product_movement_report", {
            token: session.token,
            input: {
              productId,
              variantId,
              startDate: start || null,
              endDate: end || null,
            },
          }),
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error("استغرق تحميل التقرير وقتًا أطول من المتوقع. حاول مرة أخرى.")), 30000);
          }),
        ]);
        if (requestId === reportRequestId.current) setReport(data);
      } catch (err) {
        if (requestId === reportRequestId.current) {
          setError(String(err));
          setReport(null);
        }
      } finally {
        if (timeout) clearTimeout(timeout);
        if (requestId === reportRequestId.current) setLoading(false);
      }
    },
    [session.token]
  );

  useEffect(() => {
    if (selectedProduct) {
      void fetchReport(selectedProduct.productId, selectedVariantId, startDate, endDate);
    } else {
      reportRequestId.current += 1;
      setLoading(false);
      setReport(null);
    }
  }, [selectedProduct, selectedVariantId, startDate, endDate, fetchReport]);

  const selectProduct = (p: ProductGroup) => {
    setSelectedProduct(p);
    setSelectedVariantId(null);
    setSearchQuery(p.name);
    setShowDropdown(false);
  };

  const filteredSales = (report?.sales || []).filter((s) => {
    const q = normalizeArabic(tableSearch.trim());
    if (!q) return true;
    return (
      String(s.invoiceNumber).includes(q) ||
      normalizeArabic(s.customerName).includes(q) ||
      normalizeArabic(s.sellerName).includes(q) ||
      normalizeArabic(s.warehouseName).includes(q) ||
      (s.color && normalizeArabic(s.color).includes(q)) ||
      (s.size && normalizeArabic(s.size).includes(q))
    );
  });

  const filteredReturns = (report?.returns || []).filter((r) => {
    const q = normalizeArabic(tableSearch.trim());
    if (!q) return true;
    return (
      String(r.refundNumber).includes(q) ||
      String(r.invoiceNumber).includes(q) ||
      normalizeArabic(r.customerName).includes(q) ||
      normalizeArabic(r.sellerName).includes(q) ||
      normalizeArabic(r.performedByName).includes(q) ||
      normalizeArabic(r.warehouseName).includes(q) ||
      (r.color && normalizeArabic(r.color).includes(q)) ||
      (r.size && normalizeArabic(r.size).includes(q))
    );
  });

  const filteredMovements = (report?.stockMovements || []).filter((m) => {
    const q = normalizeArabic(tableSearch.trim());
    if (!q) return true;
    const arabicType =
      m.movementType === "SALE" || m.movementType === "SALE_DEDUCTION"
        ? "خصم مبيعات"
        : m.movementType === "RETURN" || m.movementType === "REFUND_RESTORATION"
        ? "إعادة مرتجع"
        : m.movementType === "OPENING_BALANCE"
        ? "رصيد افتتاحي"
        : m.movementType;
    return (
      normalizeArabic(arabicType).includes(q) ||
      normalizeArabic(m.movementType).includes(q) ||
      normalizeArabic(m.performedByName).includes(q) ||
      normalizeArabic(m.warehouseName).includes(q) ||
      (m.color && normalizeArabic(m.color).includes(q)) ||
      (m.size && normalizeArabic(m.size).includes(q))
    );
  });

  const totalSalesPages = Math.ceil(filteredSales.length / salesPageSize) || 1;
  const paginatedSales = filteredSales.slice((salesPage - 1) * salesPageSize, salesPage * salesPageSize);

  const totalReturnsPages = Math.ceil(filteredReturns.length / returnsPageSize) || 1;
  const paginatedReturns = filteredReturns.slice((returnsPage - 1) * returnsPageSize, returnsPage * returnsPageSize);

  const totalMovementsPages = Math.ceil(filteredMovements.length / movementsPageSize) || 1;
  const paginatedMovements = filteredMovements.slice((movementsPage - 1) * movementsPageSize, movementsPage * movementsPageSize);

  return (
    <div className="stack">
      <section className="panel" style={{ padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "16px", alignItems: "end" }}>
          <div style={{ position: "relative" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "6px", color: "#543729" }}>
              🔍 البحث عن المنتج (بالاسم، التصنيف، أو الباركود):
            </label>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="اكتب اسم المنتج أو امسح الباركود..."
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  fontSize: "15px",
                  borderRadius: "8px",
                  border: "1px solid #d5c8be",
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedProduct(null);
                    setReport(null);
                    setShowDropdown(false);
                  }}
                  style={{
                    position: "absolute",
                    left: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "16px",
                    color: "#999",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {showDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  maxHeight: "320px",
                  overflowY: "auto",
                  background: "#ffffff",
                  border: "1px solid #d5c8be",
                  borderRadius: "0 0 10px 10px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  zIndex: 200,
                  marginTop: "2px",
                }}
              >
                {filteredSearchProducts.length === 0 ? (
                  <div style={{ padding: "16px", textAlign: "center", color: "#888" }}>لا توجد منتجات مطابقة للبحث</div>
                ) : (
                  filteredSearchProducts.map((p) => (
                    <div
                      key={p.productId}
                      onClick={() => selectProduct(p)}
                      style={{
                        padding: "12px 16px",
                        borderBottom: "1px solid #f2ece6",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#faf6f0")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <div>
                        <strong style={{ fontSize: "15px", color: "#3a2419", display: "block" }}>{p.name}</strong>
                        <div style={{ fontSize: "12px", color: "#8c6b58", marginTop: "2px" }}>
                          التصنيف: {p.category} | باركود: {p.barcode || "—"} | الألوان: {p.colors.join("، ") || "افتراضي"} | المقاسات: {p.sizes.join("، ") || "افتراضي"}
                        </div>
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <span className="pill" style={{ background: p.totalQuantity > 0 ? "#eef9f0" : "#fdf0ed", color: p.totalQuantity > 0 ? "#24742c" : "#b63817", fontWeight: "bold" }}>
                          المخزون: {p.totalQuantity}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px", color: "#543729" }}>من تاريخ:</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d5c8be", fontSize: "14px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", marginBottom: "6px", color: "#543729" }}>إلى تاريخ:</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d5c8be", fontSize: "14px" }}
            />
          </div>
        </div>

        {selectedProduct && (selectedProduct.colors.length > 0 || selectedProduct.sizes.length > 0) && (
          <div style={{ marginTop: "16px", paddingTop: "14px", borderTop: "1px dashed #e4d7cb", display: "flex", alignItems: "center", gap: "12px", maxWidth: "550px" }}>
            <span style={{ fontSize: "13px", fontWeight: "bold", color: "#785038", whiteSpace: "nowrap" }}>تصفية حسب متغير معين:</span>
            <div style={{ flex: 1 }}>
              <BrandSelect
                label="تصفية حسب المتغير"
                value={selectedVariantId !== null ? String(selectedVariantId) : ""}
                onValueChange={(val) => setSelectedVariantId(val !== "" ? Number(val) : null)}
                placeholder="جميع المتغيرات (شامل)"
                emptyOptionLabel="جميع المتغيرات (شامل)"
                options={selectedProduct.rows.map((r) => ({
                  value: String(r.variantId ?? r.productId),
                  label: `اللون: ${r.color || "افتراضي"} | المقاس: ${r.size || "افتراضي"} | المخزن: ${r.warehouse} (متوفر: ${r.quantity})`,
                }))}
              />
            </div>
          </div>
        )}
      </section>

      {!selectedProduct && (
        <section className="panel" style={{ padding: "60px 20px", textAlign: "center", background: "#fcfaf7" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📦</div>
          <h3 style={{ fontSize: "20px", color: "#543729", marginBottom: "8px" }}>تقرير حركة المنتج الشامل</h3>
          <p style={{ color: "#785038", maxWidth: "550px", margin: "0 auto", lineHeight: "1.6" }}>
            قم باختيار منتج من مربع البحث أعلاه لعرض السجل الكامل لحركته، الفواتير المباع فيها، أسماء العملاء والبائعين، المرتجعات، وتغيرات رصيد المخزون.
          </p>
        </section>
      )}

      {loading && (
        <div style={{ padding: "40px", textAlign: "center", color: "#785038", fontSize: "16px", fontWeight: "bold" }}>
          <LuRefreshCw className="spin" style={{ marginLeft: "8px", verticalAlign: "middle" }} /> جارٍ تحميل تقرير حركة المنتج…
        </div>
      )}

      {error && <div className="message error">{error}</div>}

      {report && !loading && (
        <>
          <section className="panel" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #efe8e1", paddingBottom: "16px", marginBottom: "20px" }}>
              <div>
                <span className="eyebrow" style={{ color: "#8c6b58" }}>تقرير حركة المنتج</span>
                <h2 style={{ fontSize: "24px", color: "#3a2419", margin: "4px 0" }}>{report.summary.productName}</h2>
                <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                  <span className="pill" style={{ background: "#f3ece5", color: "#61402e" }}>التصنيف: {report.summary.categoryName}</span>
                  <span className="pill" style={{ background: "#f3ece5", color: "#61402e" }}>الباركود: {report.summary.barcode || "—"}</span>
                </div>
              </div>
              <div style={{ textAlign: "left" }}>
                <span style={{ fontSize: "13px", color: "#8c6b58", display: "block", marginBottom: "4px" }}>المخزون المتوفر الحالى</span>
                <span style={{ fontSize: "28px", fontWeight: "900", color: report.summary.currentStock > 0 ? "#24742c" : "#b63817" }}>
                  {report.summary.currentStock} قطعة
                </span>
              </div>
            </div>

            <div className="stats" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
              <div className="stat" style={{ background: "#faf7f2", borderLeft: "4px solid #b66817" }}>
                <span style={{ color: "#785038", fontSize: "13px" }}>إجمالي المباع</span>
                <strong style={{ color: "#543729", fontSize: "22px" }}>{report.summary.totalSoldQuantity} قطعة</strong>
              </div>
              <div className="stat" style={{ background: "#f5fdf7", borderLeft: "4px solid #24742c" }}>
                <span style={{ color: "#24742c", fontSize: "13px" }}>صافي الإيراد (بعد المرتجع)</span>
                <strong style={{ color: "#1b5e20", fontSize: "22px" }}>{money(report.summary.netSalesPiasters)}</strong>
                <small style={{ fontSize: "11px", color: "#555" }}>إجمالي المبيعات: {money(report.summary.grossSalesPiasters)}</small>
              </div>
              <div className="stat" style={{ background: "#fdf3f2", borderLeft: "4px solid #b63817" }}>
                <span style={{ color: "#b63817", fontSize: "13px" }}>المرتجعات</span>
                <strong style={{ color: "#9a240c", fontSize: "22px" }}>{report.summary.totalRefundedQuantity} قطعة</strong>
                <small style={{ fontSize: "11px", color: "#b63817" }}>قيمة المرتجع: {money(report.summary.totalRefundedPiasters)}</small>
              </div>
              <div className="stat" style={{ background: "#f7f9fd", borderLeft: "4px solid #2b569a" }}>
                <span style={{ color: "#2b569a", fontSize: "13px" }}>الفواتير والعملاء</span>
                <strong style={{ color: "#1a3b6e", fontSize: "22px" }}>{report.summary.totalInvoicesCount} فاتورة</strong>
                <small style={{ fontSize: "11px", color: "#444" }}>{report.summary.distinctCustomersCount} عملاء | {report.summary.distinctSellersCount} بائعين</small>
              </div>
            </div>
          </section>

          <section className="panel" style={{ padding: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #efe8e1", paddingBottom: "14px", marginBottom: "16px" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className={activeTab === "sales" ? "primary" : "secondary"}
                  onClick={() => setActiveTab("sales")}
                  style={{ borderRadius: "8px", padding: "8px 16px" }}
                >
                  🛒 سجل المبيعات ({report.sales.length})
                </button>
                <button
                  type="button"
                  className={activeTab === "returns" ? "primary" : "secondary"}
                  onClick={() => setActiveTab("returns")}
                  style={{ borderRadius: "8px", padding: "8px 16px" }}
                >
                  🔄 سجل المرتجعات ({report.returns.length})
                </button>
                <button
                  type="button"
                  className={activeTab === "movements" ? "primary" : "secondary"}
                  onClick={() => setActiveTab("movements")}
                  style={{ borderRadius: "8px", padding: "8px 16px" }}
                >
                  📦 سجل حركة المخزون ({report.stockMovements.length})
                </button>
              </div>

              <input
                type="text"
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="تصفية السجلات الحالية..."
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d5c8be", width: "220px", fontSize: "13px" }}
              />
            </div>

            {activeTab === "sales" && (
              <div>
                {filteredSales.length === 0 ? (
                  <Empty text="لا توجد عمليات مبيعات مسجلة للمنتج حسب الفلتر المحدد." />
                ) : (
                  <>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>رقم الفاتورة</th>
                            <th>التاريخ والوقت</th>
                            <th>اسم العميل</th>
                            <th>البائع (الموظف)</th>
                            <th>المتغير (اللون/المقاس)</th>
                            <th>المخزن</th>
                            <th>الكمية</th>
                            <th>سعر الوحدة</th>
                            <th>الخصم</th>
                            <th>الإجمالي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedSales.map((s, idx) => (
                            <tr key={`${s.invoiceId}-${idx}`}>
                              <td>
                                <strong>#{s.invoiceNumber}</strong>
                              </td>
                              <td>{formatDateTime(s.createdAt)}</td>
                              <td>
                                <strong style={{ color: "#3a2419" }}>{s.customerName}</strong>
                              </td>
                              <td>
                                <span className="pill" style={{ background: "#f0f4ff", color: "#2b569a" }}>
                                  👤 {s.sellerName}
                                </span>
                              </td>
                              <td>
                                {s.color || s.size ? `${s.color || "—"} / ${s.size || "—"}` : "افتراضي"}
                              </td>
                              <td>{s.warehouseName}</td>
                              <td>
                                <strong style={{ fontSize: "15px", color: "#24742c" }}>{s.quantity}</strong>
                              </td>
                              <td>{money(s.unitPricePiasters)}</td>
                              <td>{s.discountPiasters > 0 ? money(s.discountPiasters) : "—"}</td>
                              <td>
                                <strong>{money(s.lineTotalPiasters)}</strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: "#faf6f0", fontWeight: "bold" }}>
                            <td colSpan={6} style={{ textAlign: "left" }}>إجمالي الفلتر:</td>
                            <td style={{ color: "#24742c", fontSize: "16px" }}>
                              {filteredSales.reduce((sum, item) => sum + item.quantity, 0)} قطعة
                            </td>
                            <td colSpan={2}></td>
                            <td style={{ color: "#1b5e20", fontSize: "16px" }}>
                              {money(filteredSales.reduce((sum, item) => sum + item.lineTotalPiasters, 0))}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #efe8e1" }}>
                      <div style={{ fontSize: "13px", color: "#785038" }}>
                        عرض {((salesPage - 1) * salesPageSize) + 1} - {Math.min(salesPage * salesPageSize, filteredSales.length)} من إجمالي <strong>{filteredSales.length}</strong> عملية مبيعات
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <label style={{ fontSize: "13px", color: "#543729" }}>بالصفحة:</label>
                        <div style={{ minWidth: "120px" }}>
                          <BrandSelect
                            label="عدد العناصر بالصفحة"
                            value={String(salesPageSize)}
                            onValueChange={(val) => {
                              setSalesPageSize(Number(val));
                              setSalesPage(1);
                            }}
                            placeholder="الصفحة"
                            options={[
                              { value: "10", label: "10 عناصر" },
                              { value: "15", label: "15 عنصر" },
                              { value: "25", label: "25 عنصر" },
                              { value: "50", label: "50 عنصر" },
                            ]}
                          />
                        </div>
                        <button
                          type="button"
                          className="secondary"
                          disabled={salesPage <= 1}
                          onClick={() => setSalesPage((p) => Math.max(1, p - 1))}
                          style={{ padding: "6px 14px", fontSize: "13px" }}
                        >
                          السابق
                        </button>
                        <span style={{ fontSize: "14px", fontWeight: "bold", color: "#3a2419", padding: "0 6px" }}>
                          {salesPage} / {totalSalesPages}
                        </span>
                        <button
                          type="button"
                          className="secondary"
                          disabled={salesPage >= totalSalesPages}
                          onClick={() => setSalesPage((p) => Math.min(totalSalesPages, p + 1))}
                          style={{ padding: "6px 14px", fontSize: "13px" }}
                        >
                          التالي
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "returns" && (
              <div>
                {filteredReturns.length === 0 ? (
                  <Empty text="لا توجد عمليات مرتجعات مسجلة لهذا المنتج." />
                ) : (
                  <>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>رقم المرتجع</th>
                            <th>رقم الفاتورة الأصلية</th>
                            <th>التاريخ والوقت</th>
                            <th>العميل</th>
                            <th>البائع الأصلي</th>
                            <th>منفذ المرتجع</th>
                            <th>المتغير</th>
                            <th>المخزن</th>
                            <th>الكمية المرتجعة</th>
                            <th>سعر الوحدة</th>
                            <th>المبلغ المسترد</th>
                            <th>طريقة المسترد</th>
                            <th>ملاحظات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedReturns.map((r, idx) => (
                            <tr key={`${r.refundId}-${idx}`}>
                              <td>
                                <strong style={{ color: "#b63817" }}>#{r.refundNumber}</strong>
                              </td>
                              <td>#{r.invoiceNumber}</td>
                              <td>{formatDateTime(r.createdAt)}</td>
                              <td>{r.customerName}</td>
                              <td>{r.sellerName}</td>
                              <td>
                                <span className="pill" style={{ background: "#fff5ed", color: "#b64e17" }}>
                                  {r.performedByName}
                                </span>
                              </td>
                              <td>{r.color || r.size ? `${r.color || "—"} / ${r.size || "—"}` : "افتراضي"}</td>
                              <td>{r.warehouseName}</td>
                              <td>
                                <strong style={{ color: "#b63817", fontSize: "15px" }}>{r.quantity}</strong>
                              </td>
                              <td>{money(r.unitPricePiasters)}</td>
                              <td>
                                <strong style={{ color: "#b63817" }}>{money(r.lineTotalPiasters)}</strong>
                              </td>
                              <td>{getMethodBadge(r.refundMethod)}</td>
                              <td style={{ fontSize: "12px", color: "#666" }}>{r.notes || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr style={{ background: "#fdf5f5", fontWeight: "bold" }}>
                            <td colSpan={8} style={{ textAlign: "left" }}>إجمالي المرتجع:</td>
                            <td style={{ color: "#b63817", fontSize: "16px" }}>
                              {filteredReturns.reduce((sum, item) => sum + item.quantity, 0)} قطعة
                            </td>
                            <td></td>
                            <td style={{ color: "#b63817", fontSize: "16px" }}>
                              {money(filteredReturns.reduce((sum, item) => sum + item.lineTotalPiasters, 0))}
                            </td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #efe8e1" }}>
                      <div style={{ fontSize: "13px", color: "#785038" }}>
                        عرض {((returnsPage - 1) * returnsPageSize) + 1} - {Math.min(returnsPage * returnsPageSize, filteredReturns.length)} من إجمالي <strong>{filteredReturns.length}</strong> عملية مرتجع
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <label style={{ fontSize: "13px", color: "#543729" }}>بالصفحة:</label>
                        <div style={{ minWidth: "120px" }}>
                          <BrandSelect
                            label="عدد العناصر بالصفحة"
                            value={String(returnsPageSize)}
                            onValueChange={(val) => {
                              setReturnsPageSize(Number(val));
                              setReturnsPage(1);
                            }}
                            placeholder="الصفحة"
                            options={[
                              { value: "10", label: "10 عناصر" },
                              { value: "15", label: "15 عنصر" },
                              { value: "25", label: "25 عنصر" },
                              { value: "50", label: "50 عنصر" },
                            ]}
                          />
                        </div>
                        <button
                          type="button"
                          className="secondary"
                          disabled={returnsPage <= 1}
                          onClick={() => setReturnsPage((p) => Math.max(1, p - 1))}
                          style={{ padding: "6px 14px", fontSize: "13px" }}
                        >
                          السابق
                        </button>
                        <span style={{ fontSize: "14px", fontWeight: "bold", color: "#3a2419", padding: "0 6px" }}>
                          {returnsPage} / {totalReturnsPages}
                        </span>
                        <button
                          type="button"
                          className="secondary"
                          disabled={returnsPage >= totalReturnsPages}
                          onClick={() => setReturnsPage((p) => Math.min(totalReturnsPages, p + 1))}
                          style={{ padding: "6px 14px", fontSize: "13px" }}
                        >
                          التالي
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === "movements" && (
              <div>
                {filteredMovements.length === 0 ? (
                  <Empty text="لا توجد حركات رصيد مخزون مسجلة لهذا المنتج." />
                ) : (
                  <>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>رقم الحركة</th>
                            <th>التاريخ والوقت</th>
                            <th>نوع الحركة</th>
                            <th>المتغير</th>
                            <th>المخزن</th>
                            <th>التغير في الكمية</th>
                            <th>الرصيد قبل ← بعد</th>
                            <th>رقم المرجع</th>
                            <th>المنفذ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedMovements.map((m) => (
                            <tr key={m.id}>
                              <td>#{m.id}</td>
                              <td>{formatDateTime(m.createdAt)}</td>
                              <td>{getMovementTypeBadge(m.movementType)}</td>
                              <td>{m.color || m.size ? `${m.color || "—"} / ${m.size || "—"}` : "افتراضي"}</td>
                              <td>{m.warehouseName}</td>
                              <td>
                                <strong
                                  style={{
                                    fontSize: "15px",
                                    color: m.changeQuantity > 0 ? "#24742c" : "#b63817",
                                  }}
                                >
                                  {m.changeQuantity > 0 ? `+${m.changeQuantity}` : m.changeQuantity}
                                </strong>
                              </td>
                              <td>
                                {m.quantityBefore} ← <strong style={{ color: "#3a2419" }}>{m.quantityAfter}</strong>
                              </td>
                              <td>{m.referenceId ? `#${m.referenceId}` : "—"}</td>
                              <td>{m.performedByName}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #efe8e1" }}>
                      <div style={{ fontSize: "13px", color: "#785038" }}>
                        عرض {((movementsPage - 1) * movementsPageSize) + 1} - {Math.min(movementsPage * movementsPageSize, filteredMovements.length)} من إجمالي <strong>{filteredMovements.length}</strong> حركة مخزون
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <label style={{ fontSize: "13px", color: "#543729" }}>عدد الحركات بالصفحة:</label>
                        <div style={{ minWidth: "130px" }}>
                          <BrandSelect
                            label="عدد الحركات بالصفحة"
                            value={String(movementsPageSize)}
                            onValueChange={(val) => {
                              setMovementsPageSize(Number(val));
                              setMovementsPage(1);
                            }}
                            placeholder="الصفحة"
                            options={[
                              { value: "10", label: "10 حركات" },
                              { value: "15", label: "15 حركة" },
                              { value: "25", label: "25 حركة" },
                              { value: "50", label: "50 حركة" },
                              { value: "100", label: "100 حركة" },
                            ]}
                          />
                        </div>
                        <button
                          type="button"
                          className="secondary"
                          disabled={movementsPage <= 1}
                          onClick={() => setMovementsPage((p) => Math.max(1, p - 1))}
                          style={{ padding: "6px 14px", fontSize: "13px" }}
                        >
                          السابق
                        </button>
                        <span style={{ fontSize: "14px", fontWeight: "bold", color: "#3a2419", padding: "0 6px" }}>
                          {movementsPage} / {totalMovementsPages}
                        </span>
                        <button
                          type="button"
                          className="secondary"
                          disabled={movementsPage >= totalMovementsPages}
                          onClick={() => setMovementsPage((p) => Math.min(totalMovementsPages, p + 1))}
                          style={{ padding: "6px 14px", fontSize: "13px" }}
                        >
                          التالي
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

interface InventoryAuditReportSummary {
  id: number;
  title: string;
  monthName: string;
  createdAt: string;
  createdByName: string;
  warehouseName: string;
  categoryName: string;
  totalProductsCount: number;
  matchedProductsCount: number;
  diffProductsCount: number;
  totalShortageUnits: number;
  totalShortageCostPiasters: number;
  totalShortageSellPiasters: number;
  totalSurplusUnits: number;
  totalSurplusCostPiasters: number;
  totalSurplusSellPiasters: number;
  balancesAdjusted: boolean;
}

interface InventoryAuditReportDetails extends InventoryAuditReportSummary {
  reportDataJson: string;
}

function InventoryAudit({
  products,
  categories,
  warehouses,
  session,
  refresh,
  setNotice,
  setError,
}: {
  products: Product[];
  categories: Named[];
  warehouses: Named[];
  session: Session;
  refresh: () => Promise<void>;
  setNotice: (msg: string) => void;
  setError: (msg: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedWarehouse, setSelectedWarehouse] = useState("ALL");

  // Sub-tabs: Live audit session vs saved reports archive
  const [auditSubTab, setAuditSubTab] = useState<"LIVE_AUDIT" | "REPORTS_ARCHIVE">("LIVE_AUDIT");
  const [savedReports, setSavedReports] = useState<InventoryAuditReportSummary[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [viewingSavedReport, setViewingSavedReport] = useState<InventoryAuditReportDetails | null>(null);
  const [viewingSavedReportGroups, setViewingSavedReportGroups] = useState<any[] | null>(null);

  // Admin option: Show system qty and variances during counting (false by default = blind audit)
  const [showSystemQtyDuringAudit, setShowSystemQtyDuringAudit] = useState<boolean>(() => {
    return localStorage.getItem("morsi_audit_show_system_qty") === "true";
  });

  // Save report modal state
  const [showSaveReportModal, setShowSaveReportModal] = useState(false);
  const [saveActionType, setSaveActionType] = useState<"SAVE_ONLY" | "APPLY_AND_SAVE">("SAVE_ONLY");
  const [reportMonthName, setReportMonthName] = useState("");
  const [reportCustomTitle, setReportCustomTitle] = useState("");
  const [isSavingReport, setIsSavingReport] = useState(false);

  // Record of counted quantities: key -> counted quantity
  // Key format: productId-variantId-warehouseId
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Counting dialog state
  const [isAuditing, setIsAuditing] = useState(false);
  const [currentAuditIndex, setCurrentAuditIndex] = useState(0);
  const [tempVariantInputs, setTempVariantInputs] = useState<Record<string, string>>({});
  const variantInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Expanded rows state in the initial product list
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<number>>(new Set());
  // Expanded rows state in the report view
  const [expandedReportGroupIds, setExpandedReportGroupIds] = useState<Set<number>>(new Set());

  // Audit completed view state
  const [auditFinished, setAuditFinished] = useState(false);
  const [reportFilter, setReportFilter] = useState<"ALL" | "DIFF" | "SHORTAGE" | "SURPLUS" | "MATCH">("ALL");
  const [reportScope, setReportScope] = useState<"COUNTED_ONLY" | "ALL_IN_FILTER">("COUNTED_ONLY");
  const [isApplying, setIsApplying] = useState(false);

  // Pagination for initial list
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const getProductKey = (p: Product) => `${p.productId}-${p.variantId ?? "default"}-${p.warehouseId}`;

  // Fetch saved audit reports list from database
  const fetchSavedReports = useCallback(async () => {
    try {
      setLoadingReports(true);
      const list = await invoke<InventoryAuditReportSummary[]>("list_inventory_audit_reports", { token: session.token });
      setSavedReports(list);
    } catch (err) {
      console.error("Failed to load saved audit reports", err);
    } finally {
      setLoadingReports(false);
    }
  }, [session.token]);

  useEffect(() => {
    void fetchSavedReports();
    invoke<boolean>("get_inventory_audit_settings", { token: session.token })
      .then((val) => {
        setShowSystemQtyDuringAudit(val);
        localStorage.setItem("morsi_audit_show_system_qty", String(val));
      })
      .catch((e) => console.warn("Could not load audit settings:", e));
  }, [fetchSavedReports, session.token]);

  async function handleToggleShowSystemQty(newVal: boolean) {
    setShowSystemQtyDuringAudit(newVal);
    localStorage.setItem("morsi_audit_show_system_qty", String(newVal));
    try {
      await invoke("save_inventory_audit_settings", {
        token: session.token,
        showSystemQtyDuringAudit: newVal,
      });
      setNotice(newVal ? "تم تفعيل عرض كميات السيستم والعجز والزيادة أثناء الجرد." : "تم تفعيل وضع الجرد الأعمى (إخفاء كميات السيستم والعجز والزيادة أثناء الجرد لضمان النزاهة).");
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleOpenSavedReport(reportId: number) {
    try {
      const details = await invoke<InventoryAuditReportDetails>("get_inventory_audit_report_details", {
        token: session.token,
        id: reportId,
      });
      setViewingSavedReport(details);
      try {
        const parsed = JSON.parse(details.reportDataJson);
        setViewingSavedReportGroups(parsed.evaluatedGroups || parsed);
      } catch {
        setViewingSavedReportGroups([]);
      }
      setAuditFinished(true);
      setAuditSubTab("LIVE_AUDIT");
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleDeleteSavedReport(reportId: number, title: string) {
    if (!window.confirm(`هل أنت متأكد من حذف تقرير: "${title}" نهائياً من الأرشيف؟`)) return;
    try {
      await invoke("delete_inventory_audit_report", {
        token: session.token,
        id: reportId,
      });
      setNotice(`تم حذف تقرير "${title}" بنجاح.`);
      await fetchSavedReports();
    } catch (err) {
      setError(String(err));
    }
  }

  // 1. Group products into parent products (ProductGroup)
  const allGroups = useMemo(() => groupProductRows(products), [products]);

  // 2. Filter groups based on search, category, and warehouse
  const filteredGroups = useMemo(() => {
    const s = search.trim().toLowerCase();
    return allGroups
      .map((g) => {
        const rows = selectedWarehouse === "ALL" ? g.rows : g.rows.filter((r) => r.warehouse === selectedWarehouse);
        const totalQuantity = rows.reduce((sum, r) => sum + r.quantity, 0);
        return { ...g, rows, totalQuantity };
      })
      .filter((g) => {
        if (g.rows.length === 0) return false;
        const matchesCat = selectedCategory === "ALL" || g.category === selectedCategory;
        if (!matchesCat) return false;

        if (!s) return true;
        const matchesName = g.name.toLowerCase().includes(s);
        const matchesBarcode = g.barcode && g.barcode.toLowerCase().includes(s);
        const matchesColors = g.colors.some((c) => c.toLowerCase().includes(s));
        const matchesSizes = g.sizes.some((sz) => sz.toLowerCase().includes(s));
        const matchesVariantBarcode = g.rows.some((r) => r.barcode && r.barcode.toLowerCase().includes(s));
        return matchesName || matchesBarcode || matchesColors || matchesSizes || matchesVariantBarcode;
      });
  }, [allGroups, search, selectedCategory, selectedWarehouse]);

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / pageSize));
  const paginatedGroups = filteredGroups.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);

  // Load inputs for a product group into dialog state
  function loadInputsForGroup(group: ProductGroup) {
    const inputs: Record<string, string> = {};
    for (const r of group.rows) {
      const key = getProductKey(r);
      inputs[key] = counts[key] !== undefined ? String(counts[key]) : "";
    }
    setTempVariantInputs(inputs);
  }

  // Start auditing from specific index in filtered groups list
  function startAuditFrom(index: number) {
    if (filteredGroups.length === 0) return;
    const boundedIndex = Math.max(0, Math.min(index, filteredGroups.length - 1));
    setCurrentAuditIndex(boundedIndex);
    loadInputsForGroup(filteredGroups[boundedIndex]);
    setIsAuditing(true);
    variantInputRefs.current = [];
    setTimeout(() => {
      if (variantInputRefs.current[0]) {
        variantInputRefs.current[0].focus();
        variantInputRefs.current[0].select();
      }
    }, 60);
  }

  // Save current group inputs into counts record
  function saveCurrentGroupCounts() {
    if (currentAuditIndex < 0 || currentAuditIndex >= filteredGroups.length) return;
    const group = filteredGroups[currentAuditIndex];
    const newCounts: Record<string, number> = {};
    for (const r of group.rows) {
      const key = getProductKey(r);
      const str = tempVariantInputs[key]?.trim();
      if (str !== undefined && str !== "") {
        newCounts[key] = Math.max(0, parseInt(str, 10) || 0);
      }
    }
    setCounts((prev) => ({ ...prev, ...newCounts }));
  }

  // Go to next product in modal
  function handleNextProduct() {
    saveCurrentGroupCounts();
    if (currentAuditIndex < filteredGroups.length - 1) {
      const nextIndex = currentAuditIndex + 1;
      setCurrentAuditIndex(nextIndex);
      loadInputsForGroup(filteredGroups[nextIndex]);
      variantInputRefs.current = [];
      setTimeout(() => {
        if (variantInputRefs.current[0]) {
          variantInputRefs.current[0].focus();
          variantInputRefs.current[0].select();
        }
      }, 60);
    } else {
      if (window.confirm("لقد وصلت لآخر منتج في القائمة! هل تريد إنهاء الجرد الآن وعرض التقرير الشامل؟")) {
        setIsAuditing(false);
        setAuditFinished(true);
      }
    }
  }

  // Go to previous product in modal
  function handlePrevProduct() {
    saveCurrentGroupCounts();
    if (currentAuditIndex > 0) {
      const prevIndex = currentAuditIndex - 1;
      setCurrentAuditIndex(prevIndex);
      loadInputsForGroup(filteredGroups[prevIndex]);
      variantInputRefs.current = [];
      setTimeout(() => {
        if (variantInputRefs.current[0]) {
          variantInputRefs.current[0].focus();
          variantInputRefs.current[0].select();
        }
      }, 60);
    }
  }

  // Finish audit and show report
  function handleFinishAudit() {
    saveCurrentGroupCounts();
    setIsAuditing(false);
    setAuditFinished(true);
  }

  // Current product group in modal
  const currentModalGroup = isAuditing && filteredGroups[currentAuditIndex] ? filteredGroups[currentAuditIndex] : null;

  // Build evaluated groups for report
  const evaluatedGroups = useMemo(() => {
    return filteredGroups.map((g, idx) => {
      const evaluatedRows = g.rows.map((row) => {
        const key = getProductKey(row);
        const hasCount = counts[key] !== undefined;
        const countedQty = hasCount ? counts[key] : row.quantity;
        const diff = countedQty - row.quantity;
        const shortageQty = diff < 0 ? Math.abs(diff) : 0;
        const surplusQty = diff > 0 ? diff : 0;
        const shortageCostPiasters = shortageQty * row.buyPricePiasters;
        const shortageSellPiasters = shortageQty * row.sellPricePiasters;
        const surplusCostPiasters = surplusQty * row.buyPricePiasters;
        const surplusSellPiasters = surplusQty * row.sellPricePiasters;
        const status: "MATCH" | "SHORTAGE" | "SURPLUS" =
          diff === 0 ? "MATCH" : diff < 0 ? "SHORTAGE" : "SURPLUS";

        return {
          row,
          key,
          hasCount,
          systemQty: row.quantity,
          countedQty,
          diff,
          shortageQty,
          surplusQty,
          shortageCostPiasters,
          shortageSellPiasters,
          surplusCostPiasters,
          surplusSellPiasters,
          status,
        };
      });

      const totalSystemQty = evaluatedRows.reduce((acc, r) => acc + r.systemQty, 0);
      const totalCountedQty = evaluatedRows.reduce((acc, r) => acc + r.countedQty, 0);
      const anyCounted = evaluatedRows.some((r) => r.hasCount);
      const allCounted = evaluatedRows.every((r) => r.hasCount);
      const totalDiff = totalCountedQty - totalSystemQty;

      const totalShortageQty = evaluatedRows.reduce((acc, r) => acc + r.shortageQty, 0);
      const totalShortageCost = evaluatedRows.reduce((acc, r) => acc + r.shortageCostPiasters, 0);
      const totalShortageSell = evaluatedRows.reduce((acc, r) => acc + r.shortageSellPiasters, 0);

      const totalSurplusQty = evaluatedRows.reduce((acc, r) => acc + r.surplusQty, 0);
      const totalSurplusCost = evaluatedRows.reduce((acc, r) => acc + r.surplusCostPiasters, 0);
      const totalSurplusSell = evaluatedRows.reduce((acc, r) => acc + r.surplusSellPiasters, 0);

      const hasDiff = evaluatedRows.some((r) => r.status !== "MATCH");
      const status: "MATCH" | "SHORTAGE" | "SURPLUS" | "DIFF" =
        !hasDiff
          ? "MATCH"
          : totalDiff < 0
          ? "SHORTAGE"
          : totalDiff > 0
          ? "SURPLUS"
          : "DIFF";

      return {
        index: idx + 1,
        group: g,
        rows: evaluatedRows,
        totalSystemQty,
        totalCountedQty,
        anyCounted,
        allCounted,
        totalDiff,
        totalShortageQty,
        totalShortageCost,
        totalShortageSell,
        totalSurplusQty,
        totalSurplusCost,
        totalSurplusSell,
        hasDiff,
        status,
      };
    });
  }, [filteredGroups, counts]);

  // If viewing a saved report, display its archived groups, otherwise display live groups
  const displayReportGroups: any[] = viewingSavedReportGroups !== null ? viewingSavedReportGroups : evaluatedGroups;

  const filteredReportGroups = displayReportGroups.filter((item: any) => {
    if (reportScope === "COUNTED_ONLY" && !item.anyCounted) return false;
    if (reportFilter === "ALL") return true;
    if (reportFilter === "DIFF") return item.hasDiff;
    if (reportFilter === "SHORTAGE") return item.totalShortageQty > 0;
    if (reportFilter === "SURPLUS") return item.totalSurplusQty > 0;
    if (reportFilter === "MATCH") return !item.hasDiff;
    return true;
  });

  // Flat evaluated rows for total calculations
  const activeReportGroups = reportScope === "COUNTED_ONLY"
    ? displayReportGroups.filter((g: any) => g.anyCounted)
    : displayReportGroups;

  const totalAuditedProductsCount = activeReportGroups.length;
  const matchProductsCount = activeReportGroups.filter((i: any) => !i.hasDiff).length;
  const diffProductsCount = activeReportGroups.filter((i: any) => i.hasDiff).length;

  const totalShortageUnits = activeReportGroups.reduce((acc: number, i: any) => acc + (i.totalShortageQty || 0), 0);
  const totalShortageCostPiasters = activeReportGroups.reduce((acc: number, i: any) => acc + (i.totalShortageCost || 0), 0);
  const totalShortageSellPiasters = activeReportGroups.reduce((acc: number, i: any) => acc + (i.totalShortageSell || 0), 0);

  const totalSurplusUnits = activeReportGroups.reduce((acc: number, i: any) => acc + (i.totalSurplusQty || 0), 0);
  const totalSurplusCostPiasters = activeReportGroups.reduce((acc: number, i: any) => acc + (i.totalSurplusCost || 0), 0);
  const totalSurplusSellPiasters = activeReportGroups.reduce((acc: number, i: any) => acc + (i.totalSurplusSell || 0), 0);

  const netDiffCostPiasters = totalSurplusCostPiasters - totalShortageCostPiasters;
  const netDiffSellPiasters = totalSurplusSellPiasters - totalShortageSellPiasters;

  // Open modal for saving without changing system inventory balances
  function openSaveOnlyModal() {
    const d = new Date();
    const mName = d.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
    setReportMonthName(mName);
    setReportCustomTitle(`جرد شهر ${mName}`);
    setSaveActionType("SAVE_ONLY");
    setShowSaveReportModal(true);
  }

  // Open modal for applying adjustments AND saving to archive
  function openApplyAndSaveModal() {
    const d = new Date();
    const mName = d.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
    setReportMonthName(mName);
    setReportCustomTitle(`جرد شهر ${mName} (معتمد ومُحدّث للأرصدة)`);
    setSaveActionType("APPLY_AND_SAVE");
    setShowSaveReportModal(true);
  }

  // Confirm save report action
  async function handleConfirmSaveReport() {
    if (!reportMonthName.trim()) {
      alert("يرجى كتابة اسم الشهر أو الفترة للتقرير (مثال: سبتمبر 2026).");
      return;
    }
    const title = reportCustomTitle.trim() || `جرد شهر ${reportMonthName.trim()}`;

    setIsSavingReport(true);
    setError("");
    try {
      // 1. If applying adjustments, update balances in DB first
      if (saveActionType === "APPLY_AND_SAVE") {
        const adjustments: {
          productId: number;
          variantId?: number | null;
          warehouseId: number;
          countedQuantity: number;
        }[] = [];

        for (const g of evaluatedGroups) {
          for (const r of g.rows) {
            if (r.hasCount && r.diff !== 0) {
              adjustments.push({
                productId: r.row.productId,
                variantId: r.row.variantId ?? null,
                warehouseId: r.row.warehouseId,
                countedQuantity: r.countedQty,
              });
            }
          }
        }

        if (adjustments.length > 0) {
          await invoke<number>("apply_inventory_audit_adjustments", {
            token: session.token,
            adjustments,
          });
          await refresh();
        }
      }

      // 2. Save report to DB
      await invoke<number>("save_inventory_audit_report", {
        token: session.token,
        report: {
          title,
          monthName: reportMonthName.trim(),
          warehouseName: selectedWarehouse === "ALL" ? "كل المخازن" : selectedWarehouse,
          categoryName: selectedCategory === "ALL" ? "كل التصنيفات" : selectedCategory,
          totalProductsCount: activeReportGroups.length,
          matchedProductsCount: matchProductsCount,
          diffProductsCount: diffProductsCount,
          totalShortageUnits: totalShortageUnits,
          totalShortageCostPiasters: totalShortageCostPiasters,
          totalShortageSellPiasters: totalShortageSellPiasters,
          totalSurplusUnits: totalSurplusUnits,
          totalSurplusCostPiasters: totalSurplusCostPiasters,
          totalSurplusSellPiasters: totalSurplusSellPiasters,
          balancesAdjusted: saveActionType === "APPLY_AND_SAVE",
          reportDataJson: JSON.stringify({
            evaluatedGroups: activeReportGroups,
            savedAt: new Date().toISOString(),
          }),
        },
      });

      setShowSaveReportModal(false);
      setNotice(
        saveActionType === "APPLY_AND_SAVE"
          ? `تم بنجاح اعتماد وتحديث أرصدة السيستم وحفظ التقرير لشهر "${reportMonthName}" في الأرشيف!`
          : `تم بنجاح حفظ تقرير الجرد لشهر "${reportMonthName}" كتقرير رقابي في الأرشيف دون المساس بأرصدة المخزون.`
      );
      await fetchSavedReports();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSavingReport(false);
    }
  }

  // Apply adjustments for an already saved unadjusted report
  async function handleApplySavedReportAdjustments() {
    if (!viewingSavedReport || !viewingSavedReportGroups) return;
    const adjustments: {
      productId: number;
      variantId?: number | null;
      warehouseId: number;
      countedQuantity: number;
    }[] = [];

    for (const g of viewingSavedReportGroups) {
      for (const r of g.rows) {
        if (r.hasCount && r.diff !== 0) {
          adjustments.push({
            productId: r.row.productId,
            variantId: r.row.variantId ?? null,
            warehouseId: r.row.warehouseId,
            countedQuantity: r.countedQty,
          });
        }
      }
    }

    if (adjustments.length === 0) {
      alert("لا توجد أي فروقات لاعتمادها في هذا التقرير.");
      return;
    }

    if (!window.confirm(`هل أنت متأكد من اعتماد نتائج هذا التقرير المحفوظ وتحديث أرصدة السيستم لعدد ${adjustments.length} صنف؟`)) {
      return;
    }

    setIsApplying(true);
    try {
      await invoke("apply_inventory_audit_adjustments", {
        token: session.token,
        adjustments,
      });
      await invoke("mark_inventory_audit_report_adjusted", {
        token: session.token,
        id: viewingSavedReport.id,
      });
      setViewingSavedReport({ ...viewingSavedReport, balancesAdjusted: true });
      setNotice("تم بنجاح اعتماد وتحديث أرصدة السيستم لهذا التقرير!");
      await refresh();
      await fetchSavedReports();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsApplying(false);
    }
  }

  function handleResetAll() {
    if (window.confirm("هل أنت متأكد من تصفير بيانات الجرد الحالية والبدء من جديد؟")) {
      setCounts({});
      setAuditFinished(false);
      setIsAuditing(false);
      setCurrentAuditIndex(0);
      setTempVariantInputs({});
      setViewingSavedReport(null);
      setViewingSavedReportGroups(null);
    }
  }

  const countedProductsCount = evaluatedGroups.filter((g) => g.anyCounted).length;

  return (
    <div className="stack">
      {/* 1. REPORT VIEW (AFTER FINISHING AUDIT) */}
      {auditFinished ? (
        <section className="panel" data-print-document="inventory-audit" style={{ padding: "20px" }}>
          <div className="print-only-header" style={{ display: "none", textAlign: "center", marginBottom: "20px" }}>
            <h1 style={{ margin: 0, fontSize: "24px" }}>
              {viewingSavedReport ? viewingSavedReport.title : "تقرير جرد المخزون والمطابقة الفعلية"}
            </h1>
            <p style={{ margin: "4px 0", color: "#666", fontSize: "14px" }}>
              {viewingSavedReport
                ? `الشهر: ${viewingSavedReport.monthName} | تاريخ الحفظ: ${viewingSavedReport.createdAt} | بواسطة: ${viewingSavedReport.createdByName} | حالة الأرصدة: ${viewingSavedReport.balancesAdjusted ? "مُعتمدة ومُحدثة بالسيستم" : "تقرير رقابي (لم تُعدل الأرصدة)"}`
                : `تاريخ الجرد: ${formatDateTime(new Date().toISOString())} | بواسطة: ${session.full_name}`}
            </p>
          </div>

          {/* If viewing a saved report, display top archive banner */}
          {viewingSavedReport && (
            <div className="print-hide" style={{
              background: viewingSavedReport.balancesAdjusted ? "#eff6ff" : "#fffbeb",
              border: `1px solid ${viewingSavedReport.balancesAdjusted ? "#bfdbfe" : "#fef3c7"}`,
              borderRadius: "10px",
              padding: "12px 16px",
              marginBottom: "16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "18px" }}>📂</span>
                  <strong style={{ fontSize: "16px", color: "#34231c" }}>
                    تقرير مؤرشف: {viewingSavedReport.title} ({viewingSavedReport.monthName})
                  </strong>
                  {viewingSavedReport.balancesAdjusted ? (
                    <span style={{ background: "#dbeafe", color: "#1e40af", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                      ⚡ معتمد ومُحدّث للأرصدة
                    </span>
                  ) : (
                    <span style={{ background: "#fef3c7", color: "#92400e", padding: "3px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                      🔒 تقرير رقابي (لم يتم المساس بأرصدة المخزن الحالية)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: "#785038", marginTop: "4px" }}>
                  تاريخ الحفظ: {viewingSavedReport.createdAt} | القائم بالجرد: {viewingSavedReport.createdByName} | المخزن: {viewingSavedReport.warehouseName} | التصنيف: {viewingSavedReport.categoryName}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                {!viewingSavedReport.balancesAdjusted && session.role === "ADMIN" && diffProductsCount > 0 && (
                  <button
                    type="button"
                    className="primary"
                    disabled={isApplying}
                    onClick={() => void handleApplySavedReportAdjustments()}
                    style={{ fontWeight: 800, background: "#2563eb", borderColor: "#1d4ed8", fontSize: "13px" }}
                  >
                    {isApplying ? "جارٍ التحديث..." : "⚡ اعتماد وتحديث أرصدة السيستم الآن لهذا التقرير"}
                  </button>
                )}
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setViewingSavedReport(null);
                    setViewingSavedReportGroups(null);
                    setAuditSubTab("REPORTS_ARCHIVE");
                  }}
                  style={{ fontWeight: 700, fontSize: "13px" }}
                >
                  ⬅️ العودة لسجل التقارير
                </button>
              </div>
            </div>
          )}

          <div className="section-head print-hide" style={{ alignItems: "center", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid #e9e1d9", paddingBottom: "16px", marginBottom: "20px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "22px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📊 {viewingSavedReport ? viewingSavedReport.title : "تقرير نتائج جرد المخزون"}</span>
              </h2>
              <p style={{ margin: "4px 0 0", color: "#785038", fontSize: "14px" }}>
                {viewingSavedReport
                  ? `أرشيف جرد شهر ${viewingSavedReport.monthName} - مقارنة الكميات الفعلية بالسيستم وحساب الفروقات المالية.`
                  : "عرض مجمع لكل منتج رئيسي مع تفاصيل متغيراته (ألوان ومقاسات) ومقارنة الكميات الفعلية بالسيستم."}
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              {!viewingSavedReport ? (
                <>
                  <button
                    type="button"
                    className="secondary"
                    onClick={openSaveOnlyModal}
                    style={{
                      fontWeight: 800,
                      background: "#f0fdf4",
                      color: "#166534",
                      borderColor: "#86efac",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                    title="حفظ التقرير باسم الشهر في الأرشيف دون المساس بأرصدة المخزون بالسيستم"
                  >
                    💾 حفظ التقرير فقط (الحفاظ على المخزون)
                  </button>
                  {session.role === "ADMIN" && diffProductsCount > 0 && (
                    <button
                      type="button"
                      className="primary"
                      onClick={openApplyAndSaveModal}
                      style={{ fontWeight: 800, background: "#2563eb", borderColor: "#1d4ed8", display: "flex", alignItems: "center", gap: "6px" }}
                      title="تعديل أرصدة السيستم لتطابق الجرد وتسجيل حركات التسوية الجردية وحفظ التقرير"
                    >
                      ⚡ اعتماد وتحديث الأرصدة وحفظ التقرير
                    </button>
                  )}
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setIsAuditing(true)}
                    style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    ✏️ استئناف / متابعة الجرد
                  </button>
                </>
              ) : null}

              <button
                type="button"
                className="secondary"
                onClick={() => {
                  // Expand all report groups before printing so variants are visible
                  const allIds = new Set(filteredReportGroups.map((g: any) => g.group.productId));
                  setExpandedReportGroupIds(allIds);
                  setTimeout(() => void printDocumentFromPage("inventory-audit", "تقرير الجرد"), 100);
                }}
                style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}
              >
                🖨️ طباعة تقرير الجرد
              </button>

              {!viewingSavedReport && (
                <button
                  type="button"
                  className="secondary"
                  onClick={handleResetAll}
                  style={{ color: "#b91c1c", borderColor: "#fca5a5", fontSize: "12px" }}
                >
                  🔄 جرد جديد
                </button>
              )}
            </div>
          </div>

          {/* SUMMARY CARDS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px", marginBottom: "24px" }}>
            <div style={{ background: "#fdfbf7", border: "1px solid #ebd8c8", borderRadius: "12px", padding: "14px" }}>
              <span style={{ fontSize: "12px", color: "#8b7b70", fontWeight: 700, display: "block" }}>📦 إجمالي المجرود</span>
              <strong style={{ fontSize: "22px", color: "#241c18", marginTop: "4px", display: "block" }}>
                {totalAuditedProductsCount} <small style={{ fontSize: "12px", fontWeight: 400 }}>منتج رئيسي</small>
              </strong>
              <small style={{ color: "#785038", fontSize: "11px" }}>مطابق: {matchProductsCount} | به فروقات: {diffProductsCount}</small>
            </div>

            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "14px" }}>
              <span style={{ fontSize: "12px", color: "#166534", fontWeight: 700, display: "block" }}>✅ مطابق تماماً</span>
              <strong style={{ fontSize: "22px", color: "#15803d", marginTop: "4px", display: "block" }}>
                {matchProductsCount} <small style={{ fontSize: "12px", fontWeight: 400 }}>منتج</small>
              </strong>
              <small style={{ color: "#166534", fontSize: "11px" }}>نسبة التطابق: {totalAuditedProductsCount > 0 ? Math.round((matchProductsCount / totalAuditedProductsCount) * 100) : 0}%</small>
            </div>

            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "12px", padding: "14px" }}>
              <span style={{ fontSize: "12px", color: "#991b1b", fontWeight: 700, display: "block" }}>🔴 إجمالي العجز</span>
              <strong style={{ fontSize: "22px", color: "#dc2626", marginTop: "4px", display: "block" }}>
                {totalShortageUnits} <small style={{ fontSize: "12px", fontWeight: 400 }}>قطعة</small>
              </strong>
              <div style={{ fontSize: "11px", color: "#b91c1c", marginTop: "4px" }}>
                <div>بالتكلفة: <strong>{money(totalShortageCostPiasters)}</strong></div>
                <div>بسعر البيع: <strong>{money(totalShortageSellPiasters)}</strong></div>
              </div>
            </div>

            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "12px", padding: "14px" }}>
              <span style={{ fontSize: "12px", color: "#1e40af", fontWeight: 700, display: "block" }}>🔵 إجمالي الزيادة</span>
              <strong style={{ fontSize: "22px", color: "#2563eb", marginTop: "4px", display: "block" }}>
                {totalSurplusUnits} <small style={{ fontSize: "12px", fontWeight: 400 }}>قطعة</small>
              </strong>
              <div style={{ fontSize: "11px", color: "#1e40af", marginTop: "4px" }}>
                <div>بالتكلفة: <strong>{money(totalSurplusCostPiasters)}</strong></div>
                <div>بسعر البيع: <strong>{money(totalSurplusSellPiasters)}</strong></div>
              </div>
            </div>

            <div style={{
              background: netDiffSellPiasters >= 0 ? "#f0fdf4" : "#fff1f2",
              border: `1px solid ${netDiffSellPiasters >= 0 ? "#86efac" : "#fca5a5"}`,
              borderRadius: "12px",
              padding: "14px"
            }}>
              <span style={{ fontSize: "12px", color: "#543729", fontWeight: 700, display: "block" }}>⚖️ صافي الفارق المالي</span>
              <strong style={{ fontSize: "22px", color: netDiffSellPiasters >= 0 ? "#16a34a" : "#dc2626", marginTop: "4px", display: "block" }}>
                {netDiffSellPiasters >= 0 ? `+${money(netDiffSellPiasters)}` : money(netDiffSellPiasters)}
              </strong>
              <small style={{ color: "#785038", fontSize: "11px" }}>
                صافي التكلفة: {netDiffCostPiasters >= 0 ? `+${money(netDiffCostPiasters)}` : money(netDiffCostPiasters)}
              </small>
            </div>
          </div>

          {/* FILTER TABS & ACTIONS */}
          <div className="print-hide" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <button
                type="button"
                className={reportFilter === "ALL" ? "primary" : "secondary"}
                onClick={() => setReportFilter("ALL")}
                style={{ fontSize: "12px", padding: "6px 12px" }}
              >
                الكل ({activeReportGroups.length})
              </button>
              <button
                type="button"
                className={reportFilter === "DIFF" ? "primary" : "secondary"}
                onClick={() => setReportFilter("DIFF")}
                style={{ fontSize: "12px", padding: "6px 12px", color: reportFilter === "DIFF" ? "#fff" : "#b45309" }}
              >
                ⚠️ به فروقات ({diffProductsCount})
              </button>
              <button
                type="button"
                className={reportFilter === "SHORTAGE" ? "primary" : "secondary"}
                onClick={() => setReportFilter("SHORTAGE")}
                style={{ fontSize: "12px", padding: "6px 12px", color: reportFilter === "SHORTAGE" ? "#fff" : "#dc2626" }}
              >
                🔴 عجز ({activeReportGroups.filter((g) => g.totalShortageQty > 0).length})
              </button>
              <button
                type="button"
                className={reportFilter === "SURPLUS" ? "primary" : "secondary"}
                onClick={() => setReportFilter("SURPLUS")}
                style={{ fontSize: "12px", padding: "6px 12px", color: reportFilter === "SURPLUS" ? "#fff" : "#2563eb" }}
              >
                🔵 زيادة ({activeReportGroups.filter((g) => g.totalSurplusQty > 0).length})
              </button>
              <button
                type="button"
                className={reportFilter === "MATCH" ? "primary" : "secondary"}
                onClick={() => setReportFilter("MATCH")}
                style={{ fontSize: "12px", padding: "6px 12px", color: reportFilter === "MATCH" ? "#fff" : "#16a34a" }}
              >
                ✅ مطابق ({matchProductsCount})
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  if (expandedReportGroupIds.size === filteredReportGroups.length) {
                    setExpandedReportGroupIds(new Set());
                  } else {
                    setExpandedReportGroupIds(new Set(filteredReportGroups.map((g) => g.group.productId)));
                  }
                }}
                style={{ fontSize: "11px", padding: "5px 12px" }}
              >
                {expandedReportGroupIds.size === filteredReportGroups.length ? "طي كل تفاصيل المتغيرات" : "توسيع كل تفاصيل المتغيرات"}
              </button>

              <span style={{ fontSize: "12px", color: "#785038", fontWeight: 700 }}>نطاق العرض:</span>
              <button
                type="button"
                className={reportScope === "COUNTED_ONLY" ? "primary" : "secondary"}
                onClick={() => setReportScope("COUNTED_ONLY")}
                style={{ fontSize: "11px", padding: "5px 10px" }}
              >
                المجرود فقط ({countedProductsCount})
              </button>
              <button
                type="button"
                className={reportScope === "ALL_IN_FILTER" ? "primary" : "secondary"}
                onClick={() => setReportScope("ALL_IN_FILTER")}
                style={{ fontSize: "11px", padding: "5px 10px" }}
              >
                كافة المنتجات ({filteredGroups.length})
              </button>
            </div>
          </div>

          {/* REPORT TABLE */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>#</th>
                  <th>اسم المنتج الرئيسي</th>
                  <th>التصنيف</th>
                  <th>الباركود</th>
                  <th>المخزن</th>
                  <th style={{ background: "#faf5ef", textAlign: "center" }}>الكمية بالسيستم</th>
                  <th style={{ background: "#f5eee6", textAlign: "center" }}>الجرد الفعلي</th>
                  <th style={{ background: "#fee2e2", textAlign: "center" }}>العجز (كمية / قيمة)</th>
                  <th style={{ background: "#dbeafe", textAlign: "center" }}>الزيادة (كمية / قيمة)</th>
                  <th style={{ textAlign: "center" }}>الحالة الكلية</th>
                </tr>
              </thead>
              <tbody>
                {filteredReportGroups.map((item: any) => {
                  const hasMultipleVariants = item.group.rows.length > 1 || item.group.rows.some((r: any) => r.color || r.size);
                  const isExpanded = expandedReportGroupIds.has(item.group.productId);

                  return (
                    <Fragment key={item.group.productId}>
                      <tr style={{ background: item.totalShortageQty > 0 ? "#fffaf9" : item.totalSurplusQty > 0 ? "#fbfdff" : undefined }}>
                        <td><strong style={{ color: "#8b7b70" }}>#{item.index}</strong></td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <strong style={{ fontSize: "14px" }}>{item.group.name}</strong>
                            {hasMultipleVariants && (
                              <button
                                type="button"
                                className="print-hide"
                                onClick={() => {
                                  setExpandedReportGroupIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(item.group.productId)) next.delete(item.group.productId);
                                    else next.add(item.group.productId);
                                    return next;
                                  });
                                }}
                                style={{
                                  background: isExpanded ? "#ebd8c8" : "#f5eee6",
                                  border: "1px solid #decbb8",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  cursor: "pointer",
                                  color: "#543729",
                                  fontWeight: 700,
                                }}
                              >
                                {item.group.rows.length} متغيرات {isExpanded ? "▲" : "▼"}
                              </button>
                            )}
                          </div>
                        </td>
                        <td><small>{item.group.category}</small></td>
                        <td><code>{item.group.barcode || "—"}</code></td>
                        <td><small>{item.group.warehouses.join("، ")}</small></td>
                        <td style={{ textAlign: "center", background: "#faf5ef" }}>
                          <strong style={{ fontSize: "15px" }}>{item.totalSystemQty}</strong>
                        </td>
                        <td style={{ textAlign: "center", background: "#f5eee6" }}>
                          <strong style={{ fontSize: "16px", color: "#785038" }}>
                            {item.anyCounted ? item.totalCountedQty : "—"}
                          </strong>
                        </td>
                        <td style={{ textAlign: "center", background: item.totalShortageQty > 0 ? "#fef2f2" : "#faf5ef" }}>
                          {item.totalShortageQty > 0 ? (
                            <div>
                              <strong style={{ color: "#dc2626", fontSize: "15px" }}>-{item.totalShortageQty}</strong>
                              <div style={{ fontSize: "11px", color: "#b91c1c" }}>
                                {money(item.totalShortageSell)}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: "center", background: item.totalSurplusQty > 0 ? "#eff6ff" : "#faf5ef" }}>
                          {item.totalSurplusQty > 0 ? (
                            <div>
                              <strong style={{ color: "#2563eb", fontSize: "15px" }}>+{item.totalSurplusQty}</strong>
                              <div style={{ fontSize: "11px", color: "#1d4ed8" }}>
                                {money(item.totalSurplusSell)}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: "#9ca3af" }}>—</span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {!item.anyCounted ? (
                            <span style={{ color: "#9ca3af", fontSize: "12px" }}>لم يُجرد بعد</span>
                          ) : !item.hasDiff ? (
                            <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "12px", background: "#dcfce7", color: "#15803d", fontWeight: 700 }}>
                              ✅ مطابق
                            </span>
                          ) : item.totalShortageQty > 0 && item.totalSurplusQty === 0 ? (
                            <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "12px", background: "#fee2e2", color: "#dc2626", fontWeight: 700 }}>
                              🔴 عجز ({item.totalShortageQty})
                            </span>
                          ) : item.totalSurplusQty > 0 && item.totalShortageQty === 0 ? (
                            <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "12px", background: "#dbeafe", color: "#2563eb", fontWeight: 700 }}>
                              🔵 زيادة (+{item.totalSurplusQty})
                            </span>
                          ) : (
                            <span style={{ padding: "3px 8px", borderRadius: "6px", fontSize: "12px", background: "#fef3c7", color: "#b45309", fontWeight: 700 }}>
                              ⚠️ تفاوت (-{item.totalShortageQty} / +{item.totalSurplusQty})
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* NESTED VARIANTS SUB-TABLE */}
                      {hasMultipleVariants && isExpanded && (
                        <tr style={{ background: "#fdfbf8" }}>
                          <td colSpan={10} style={{ padding: "12px 24px" }}>
                            <div style={{
                              background: "#fff",
                              border: "1px solid #ebd8c8",
                              borderRadius: "10px",
                              padding: "12px",
                              boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                            }}>
                              <div style={{ fontSize: "12px", fontWeight: 700, color: "#785038", marginBottom: "8px" }}>
                                🏷️ تفاصيل المتغيرات والأرصدة لمنتج: <strong>{item.group.name}</strong>
                              </div>
                              <table style={{ width: "100%", fontSize: "13px" }}>
                                <thead>
                                  <tr style={{ background: "#faf5ef", borderBottom: "1px solid #e9e1d9" }}>
                                    <th style={{ padding: "6px 10px" }}>اللون والمقاس</th>
                                    <th style={{ padding: "6px 10px" }}>المخزن</th>
                                    <th style={{ padding: "6px 10px" }}>الباركود</th>
                                    <th style={{ padding: "6px 10px" }}>سعر البيع</th>
                                    <th style={{ padding: "6px 10px", textAlign: "center" }}>السيستم</th>
                                    <th style={{ padding: "6px 10px", textAlign: "center" }}>الفعلي بالجرد</th>
                                    <th style={{ padding: "6px 10px", textAlign: "center" }}>الفارق</th>
                                    <th style={{ padding: "6px 10px", textAlign: "center" }}>الحالة</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {item.rows.map((vr: any) => (
                                    <tr key={vr.key} style={{ borderBottom: "1px solid #f3ece4" }}>
                                      <td style={{ padding: "6px 10px" }}>
                                        <strong>
                                          {[vr.row.color, vr.row.size ? `مقاس ${vr.row.size}` : ""].filter(Boolean).join(" · ") || "افتراضي"}
                                        </strong>
                                        {vr.row.location && (
                                          <div style={{ fontSize: "11px", color: "#1d4ed8", fontWeight: 700 }}>📍 {vr.row.location}</div>
                                        )}
                                      </td>
                                      <td style={{ padding: "6px 10px" }}><small>{vr.row.warehouse}</small></td>
                                      <td style={{ padding: "6px 10px" }}><code>{vr.row.barcode || "—"}</code></td>
                                      <td style={{ padding: "6px 10px" }}>{money(vr.row.sellPricePiasters)}</td>
                                      <td style={{ padding: "6px 10px", textAlign: "center" }}><strong>{vr.systemQty}</strong></td>
                                      <td style={{ padding: "6px 10px", textAlign: "center" }}>
                                        <strong>{vr.hasCount ? vr.countedQty : "—"}</strong>
                                      </td>
                                      <td style={{ padding: "6px 10px", textAlign: "center" }}>
                                        {vr.diff === 0 ? (
                                          <span style={{ color: "#15803d" }}>0</span>
                                        ) : vr.diff < 0 ? (
                                          <span style={{ color: "#dc2626", fontWeight: 700 }}>
                                            {vr.diff} ({money(vr.shortageSellPiasters)})
                                          </span>
                                        ) : (
                                          <span style={{ color: "#2563eb", fontWeight: 700 }}>
                                            +{vr.diff} ({money(vr.surplusSellPiasters)})
                                          </span>
                                        )}
                                      </td>
                                      <td style={{ padding: "6px 10px", textAlign: "center" }}>
                                        {!vr.hasCount ? (
                                          <span style={{ color: "#9ca3af", fontSize: "11px" }}>لم يُجرد</span>
                                        ) : vr.status === "MATCH" ? (
                                          <span style={{ color: "#15803d", fontWeight: 700, fontSize: "11px" }}>✅ مطابق</span>
                                        ) : vr.status === "SHORTAGE" ? (
                                          <span style={{ color: "#dc2626", fontWeight: 700, fontSize: "11px" }}>🔴 عجز</span>
                                        ) : (
                                          <span style={{ color: "#2563eb", fontWeight: 700, fontSize: "11px" }}>🔵 زيادة</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {!filteredReportGroups.length && (
              <Empty text="لا توجد منتجات مطابقة لهذا الفلتر في تقرير الجرد." />
            )}
          </div>
        </section>
      ) : auditSubTab === "REPORTS_ARCHIVE" ? (
        /* 2. SAVED AUDIT REPORTS ARCHIVE VIEW */
        <section className="panel" style={{ padding: "20px" }}>
          {/* SUB-TABS & ACTIONS */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setAuditSubTab("LIVE_AUDIT");
                  setViewingSavedReport(null);
                  setViewingSavedReportGroups(null);
                }}
                style={{ fontWeight: 700, padding: "8px 16px" }}
              >
                📋 جلسة الجرد الحالية
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setAuditSubTab("REPORTS_ARCHIVE");
                  setViewingSavedReport(null);
                  setViewingSavedReportGroups(null);
                  void fetchSavedReports();
                }}
                style={{ fontWeight: 700, padding: "8px 16px", display: "flex", alignItems: "center", gap: "6px" }}
              >
                📂 سجل تقارير الجرد السابقة ({savedReports.length})
              </button>
            </div>
            <button
              type="button"
              className="secondary"
              onClick={() => void fetchSavedReports()}
              style={{ fontWeight: 700, fontSize: "13px" }}
            >
              🔄 تحديث السجل
            </button>
          </div>

          <div className="section-head" style={{ alignItems: "center", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid #e9e1d9", paddingBottom: "16px", marginBottom: "20px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "22px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📂 سجل وأرشيف تقارير الجرد الشهرية</span>
              </h2>
              <p style={{ margin: "4px 0 0", color: "#785038", fontSize: "14px" }}>
                يمكنك في أي وقت فتح ومراجعة أي تقرير جرد تم حفظه، فحص الفروقات، وطباعته أو اعتماد الأرصدة.
              </p>
            </div>
          </div>

          {loadingReports ? (
            <div style={{ textAlign: "center", padding: "40px", color: "#785038" }}>جارٍ تحميل تقارير الجرد...</div>
          ) : savedReports.length === 0 ? (
            <Empty text="لا توجد تقارير جرد محفوظة بالأرشيف حتى الآن. بعد الانتهاء من أي جرد، يمكنك حفظه باسم الشهر للرجوع إليه هنا." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>#</th>
                    <th>اسم التقرير والشهر</th>
                    <th>تاريخ ووقت الحفظ</th>
                    <th>القائم بالجرد</th>
                    <th>المخزن والتصنيف</th>
                    <th style={{ textAlign: "center" }}>الأصناف</th>
                    <th style={{ textAlign: "center" }}>المطابق والفروقات</th>
                    <th style={{ textAlign: "center" }}>صافي العجز والزيادة</th>
                    <th style={{ textAlign: "center" }}>حالة الأرصدة بالسيستم</th>
                    <th style={{ textAlign: "center", width: "160px" }}>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {savedReports.map((rpt, idx) => (
                    <tr key={rpt.id}>
                      <td><strong style={{ color: "#8b7b70" }}>#{idx + 1}</strong></td>
                      <td>
                        <strong style={{ fontSize: "14px", color: "#34231c" }}>{rpt.title}</strong>
                        <div style={{ fontSize: "12px", color: "#785038" }}>📅 {rpt.monthName}</div>
                      </td>
                      <td><small>{rpt.createdAt}</small></td>
                      <td><strong>{rpt.createdByName}</strong></td>
                      <td><small>{rpt.warehouseName} · {rpt.categoryName}</small></td>
                      <td style={{ textAlign: "center" }}><strong>{rpt.totalProductsCount}</strong> منتج</td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ color: "#15803d", fontWeight: 700 }}>{rpt.matchedProductsCount} مطابق</span>
                        {rpt.diffProductsCount > 0 ? (
                          <span style={{ color: "#dc2626", fontWeight: 700, marginRight: "6px" }}> · {rpt.diffProductsCount} به فرق</span>
                        ) : (
                          <span style={{ color: "#15803d", marginRight: "6px" }}> · 0 فروقات</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {rpt.totalShortageUnits > 0 && (
                          <div style={{ color: "#dc2626", fontSize: "12px", fontWeight: 700 }}>
                            عجز: -{rpt.totalShortageUnits} ({money(rpt.totalShortageSellPiasters)})
                          </div>
                        )}
                        {rpt.totalSurplusUnits > 0 && (
                          <div style={{ color: "#2563eb", fontSize: "12px", fontWeight: 700 }}>
                            زيادة: +{rpt.totalSurplusUnits} ({money(rpt.totalSurplusSellPiasters)})
                          </div>
                        )}
                        {rpt.totalShortageUnits === 0 && rpt.totalSurplusUnits === 0 && (
                          <span style={{ color: "#15803d", fontWeight: 700 }}>مطابق تماماً</span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {rpt.balancesAdjusted ? (
                          <span style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, background: "#dbeafe", color: "#1e40af" }}>
                            ⚡ تم تحديث الأرصدة
                          </span>
                        ) : (
                          <span style={{ padding: "4px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 800, background: "#fef3c7", color: "#92400e" }}>
                            🔒 تقرير رقابي فقط
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <button
                            type="button"
                            className="primary"
                            onClick={() => void handleOpenSavedReport(rpt.id)}
                            style={{ fontSize: "12px", padding: "5px 10px", fontWeight: 700 }}
                          >
                            👁️ فتح التقرير
                          </button>
                          {session.role === "ADMIN" && (
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => void handleDeleteSavedReport(rpt.id, rpt.title)}
                              style={{ fontSize: "12px", padding: "5px 8px", color: "#dc2626", borderColor: "#fca5a5" }}
                              title="حذف هذا التقرير من الأرشيف"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        /* 3. INITIAL PRODUCTS AUDIT SELECTION & OVERVIEW */
        <section className="panel" style={{ padding: "20px" }}>
          {/* SUB-TABS & ADMIN TOGGLE */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className={auditSubTab === "LIVE_AUDIT" ? "primary" : "secondary"}
                onClick={() => {
                  setAuditSubTab("LIVE_AUDIT");
                  setViewingSavedReport(null);
                  setViewingSavedReportGroups(null);
                }}
                style={{ fontWeight: 700, padding: "8px 16px" }}
              >
                📋 جلسة الجرد الحالية
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setAuditSubTab("REPORTS_ARCHIVE");
                  setViewingSavedReport(null);
                  setViewingSavedReportGroups(null);
                  void fetchSavedReports();
                }}
                style={{ fontWeight: 700, padding: "8px 16px", display: "flex", alignItems: "center", gap: "6px" }}
              >
                📂 سجل تقارير الجرد السابقة ({savedReports.length})
              </button>
            </div>

            {session.role === "ADMIN" && (
              <label style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                background: showSystemQtyDuringAudit ? "#f0fdf4" : "#faf6f0",
                border: `1px solid ${showSystemQtyDuringAudit ? "#86efac" : "#decbb8"}`,
                borderRadius: "8px",
                padding: "6px 12px",
                fontSize: "13px",
                fontWeight: 700,
                color: showSystemQtyDuringAudit ? "#166534" : "#543729"
              }} title="عند التعطيل (وضع الجرد الأعمى)، لن تظهر كميات السيستم أو الفروقات للموظف أثناء الجرد، وستظهر فقط في التقرير بعد انتهاء الجرد">
                <input
                  type="checkbox"
                  checked={showSystemQtyDuringAudit}
                  onChange={(e) => void handleToggleShowSystemQty(e.target.checked)}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <span>🔒 عرض كمية السيستم والعجز/الزيادة أثناء الجرد (أدمن فقط)</span>
              </label>
            )}
          </div>

          <div className="section-head" style={{ alignItems: "center", flexWrap: "wrap", gap: "12px", borderBottom: "1px solid #e9e1d9", paddingBottom: "16px", marginBottom: "20px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "22px", display: "flex", alignItems: "center", gap: "8px" }}>
                <span>📋 جرد المخزون والمطابقة الفعلية</span>
              </h2>
              <p style={{ margin: "4px 0 0", color: "#785038", fontSize: "14px" }}>
                المنتجات معروضة كمنتج رئيسي مجمع مع متغيراته. اختر أي منتج لبدء الجرد من عنده.
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              {countedProductsCount > 0 && (
                <>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => setAuditFinished(true)}
                    style={{ fontWeight: 800, background: "#2563eb", borderColor: "#1d4ed8", display: "flex", alignItems: "center", gap: "6px" }}
                  >
                    📊 عرض تقرير نتائج الجرد ({countedProductsCount})
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    onClick={handleResetAll}
                    style={{ color: "#b91c1c", borderColor: "#fca5a5", fontSize: "12px" }}
                  >
                    🔄 تصفير الجرد
                  </button>
                </>
              )}
              <button
                type="button"
                className="primary"
                onClick={() => startAuditFrom(0)}
                disabled={filteredGroups.length === 0}
                style={{ fontWeight: 800, padding: "8px 18px", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}
              >
                🚀 بدء الجرد من أول القائمة
              </button>
            </div>
          </div>

          {/* FILTER TOOLBAR */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 2fr) minmax(160px, 1fr) minmax(160px, 1fr)", gap: "12px", marginBottom: "18px", alignItems: "end" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "4px", color: "#543729" }}>
                🔍 بحث بالاسم أو الباركود أو المقاس/اللون:
              </label>
              <input
                placeholder="ابحث باسم المنتج، المقاس، اللون، الباركود..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPageNumber(1);
                }}
                style={{ padding: "9px 12px", fontSize: "13px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "4px", color: "#543729" }}>
                التصنيف:
              </label>
              <BrandSelect
                label="التصنيف"
                value={selectedCategory}
                onValueChange={(val) => {
                  setSelectedCategory(val);
                  setPageNumber(1);
                }}
                placeholder="كل التصنيفات"
                options={[
                  { value: "ALL", label: "كل التصنيفات" },
                  ...categories.map((c) => ({ value: c.name, label: c.name })),
                ]}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "4px", color: "#543729" }}>
                المخزن:
              </label>
              <BrandSelect
                label="المخزن"
                value={selectedWarehouse}
                onValueChange={(val) => {
                  setSelectedWarehouse(val);
                  setPageNumber(1);
                }}
                placeholder="كل المخازن"
                options={[
                  { value: "ALL", label: "كل المخازن" },
                  ...warehouses.map((w) => ({ value: w.name, label: w.name })),
                ]}
              />
            </div>
          </div>

          {/* PRODUCT GROUP LIST TABLE */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: "60px", textAlign: "center" }}># الرقم</th>
                  <th>اسم المنتج الرئيسي</th>
                  <th>التصنيف</th>
                  <th>المواصفات / المتغيرات</th>
                  <th>المخزن</th>
                  <th>الباركود</th>
                  <th>سعر البيع</th>
                  <th style={{ textAlign: "center" }}>
                    {showSystemQtyDuringAudit ? "الرصيد بالسيستم" : "الرصيد بالسيستم (🔒 مخفي)"}
                  </th>
                  <th style={{ textAlign: "center" }}>حالة الجرد</th>
                  <th style={{ textAlign: "center", width: "180px" }}>بدء الجرد التتابعي</th>
                </tr>
              </thead>
              <tbody>
                {paginatedGroups.map((group, localIdx) => {
                  const globalIdx = (pageNumber - 1) * pageSize + localIdx;
                  const hasMultipleVariants = group.rows.length > 1 || group.rows.some((r) => r.color || r.size);
                  const isExpanded = expandedGroupIds.has(group.productId);

                  const countedRows = group.rows.filter((r) => counts[getProductKey(r)] !== undefined);
                  const allRowsCounted = countedRows.length === group.rows.length;

                  const totalCounted = group.rows.reduce((sum, r) => sum + (counts[getProductKey(r)] ?? r.quantity), 0);
                  const totalDiff = totalCounted - group.totalQuantity;

                  return (
                    <Fragment key={group.productId}>
                      <tr style={{ background: countedRows.length > 0 ? "#faf7f2" : undefined }}>
                        <td style={{ textAlign: "center" }}>
                          <span style={{
                            display: "inline-block",
                            width: "32px",
                            height: "24px",
                            lineHeight: "24px",
                            borderRadius: "6px",
                            background: "#f0e5d8",
                            color: "#543729",
                            fontWeight: 800,
                            fontSize: "12px"
                          }}>
                            {globalIdx + 1}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <strong>{group.name}</strong>
                            {hasMultipleVariants && (
                              <button
                                type="button"
                                onClick={() => {
                                  setExpandedGroupIds((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(group.productId)) next.delete(group.productId);
                                    else next.add(group.productId);
                                    return next;
                                  });
                                }}
                                style={{
                                  background: isExpanded ? "#ebd8c8" : "#f5eee6",
                                  border: "1px solid #decbb8",
                                  padding: "2px 8px",
                                  borderRadius: "6px",
                                  fontSize: "11px",
                                  cursor: "pointer",
                                  color: "#543729",
                                  fontWeight: 700,
                                }}
                              >
                                {group.rows.length} متغيرات {isExpanded ? "▲" : "▼"}
                              </button>
                            )}
                          </div>
                        </td>
                        <td><small>{group.category}</small></td>
                        <td>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                            {group.colors.map((c) => (
                              <span key={c} style={{ background: "#f0e5d8", color: "#543729", padding: "1px 6px", borderRadius: "4px", fontSize: "11px" }}>
                                {c}
                              </span>
                            ))}
                            {group.sizes.map((sz) => (
                              <span key={sz} style={{ background: "#e8ded4", color: "#34231c", padding: "1px 6px", borderRadius: "4px", fontSize: "11px", fontWeight: 700 }}>
                                {sz}
                              </span>
                            ))}
                            {!group.colors.length && !group.sizes.length && (
                              <span style={{ color: "#9ca3af", fontSize: "12px" }}>—</span>
                            )}
                          </div>
                        </td>
                        <td><small>{group.warehouses.join("، ")}</small></td>
                        <td><code>{group.barcode || "—"}</code></td>
                        <td><strong>{money(group.sellPricePiasters)}</strong></td>
                        <td style={{ textAlign: "center" }}>
                          {showSystemQtyDuringAudit ? (
                            <strong style={{ fontSize: "15px", color: group.totalQuantity <= group.lowStockThreshold ? "#dc2626" : "#241c18" }}>
                              {group.totalQuantity}
                            </strong>
                          ) : (
                            <span style={{ color: "#9ca3af", fontSize: "12px", fontWeight: 700 }}>🔒 مخفي</span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {countedRows.length === 0 ? (
                            <span style={{ color: "#9ca3af", fontSize: "12px" }}>لم يُجرد بعد</span>
                          ) : !showSystemQtyDuringAudit ? (
                            <span style={{
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 700,
                              background: allRowsCounted ? "#dcfce7" : "#fef3c7",
                              color: allRowsCounted ? "#15803d" : "#b45309",
                            }}>
                              {allRowsCounted ? `✅ تم الجرد (${totalCounted} قطعة)` : `جرد ${countedRows.length} من ${group.rows.length}`}
                            </span>
                          ) : allRowsCounted ? (
                            <span style={{
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 700,
                              background: totalDiff === 0 ? "#dcfce7" : totalDiff < 0 ? "#fee2e2" : "#dbeafe",
                              color: totalDiff === 0 ? "#15803d" : totalDiff < 0 ? "#dc2626" : "#2563eb",
                            }}>
                              {totalDiff === 0 ? `مطابق (${totalCounted})` : totalDiff < 0 ? `عجز ${totalDiff} (الفعلي: ${totalCounted})` : `زيادة +${totalDiff} (الفعلي: ${totalCounted})`}
                            </span>
                          ) : (
                            <span style={{
                              padding: "3px 8px",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: 700,
                              background: "#fef3c7",
                              color: "#b45309",
                            }}>
                              جرد {countedRows.length} من {group.rows.length}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className={countedRows.length > 0 ? "secondary" : "primary"}
                            onClick={() => startAuditFrom(globalIdx)}
                            style={{ fontSize: "12px", padding: "6px 12px", width: "100%", fontWeight: 700 }}
                          >
                            {countedRows.length > 0 ? "✏️ تعديل الجرد" : "🚀 بدء الجرد من هنا"}
                          </button>
                        </td>
                      </tr>

                      {/* INLINE EXPANDED DETAILS */}
                      {hasMultipleVariants && isExpanded && (
                        <tr style={{ background: "#fcfaf7" }}>
                          <td colSpan={10} style={{ padding: "10px 20px" }}>
                            <div style={{
                              background: "#fff",
                              border: "1px solid #ebd8c8",
                              borderRadius: "10px",
                              padding: "12px",
                            }}>
                              <span style={{ fontSize: "12px", fontWeight: 700, color: "#785038", display: "block", marginBottom: "8px" }}>
                                🏷️ المتغيرات المتاحة لمنتج <strong>{group.name}</strong>:
                              </span>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "8px" }}>
                                {group.rows.map((vr) => {
                                  const vKey = getProductKey(vr);
                                  const vCounted = counts[vKey];
                                  const isVCounted = vCounted !== undefined;
                                  const vDiff = isVCounted ? vCounted - vr.quantity : 0;

                                  return (
                                    <div key={vKey} style={{
                                      border: "1px solid #e9e1d9",
                                      borderRadius: "8px",
                                      padding: "8px 12px",
                                      background: isVCounted ? "#faf8f5" : "#fff",
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      fontSize: "12px"
                                    }}>
                                      <div>
                                        <strong>{[vr.color, vr.size ? `مقاس ${vr.size}` : ""].filter(Boolean).join(" · ") || "افتراضي"}</strong>
                                        <div style={{ color: "#785038", fontSize: "11px" }}>
                                          {vr.warehouse} {vr.location ? `· 📍 ${vr.location}` : ""}
                                        </div>
                                      </div>
                                      <div style={{ textAlign: "left" }}>
                                        {showSystemQtyDuringAudit && <div>السيستم: <b>{vr.quantity}</b></div>}
                                        {isVCounted && (
                                          <div style={{
                                            fontWeight: 700,
                                            color: !showSystemQtyDuringAudit ? "#15803d" : vDiff === 0 ? "#15803d" : vDiff < 0 ? "#dc2626" : "#2563eb",
                                            fontSize: "11px"
                                          }}>
                                            {!showSystemQtyDuringAudit
                                              ? `الفعلي: ${vCounted} قطعة`
                                              : `الفعلي: ${vCounted} (${vDiff === 0 ? "مطابق" : vDiff < 0 ? `عجز ${vDiff}` : `+${vDiff}`})`}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {!filteredGroups.length && (
              <Empty text="لا توجد منتجات مطابقة لخيارات البحث أو الفلترة." />
            )}
          </div>

          {/* PAGINATION */}
          {filteredGroups.length > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "14px", borderTop: "1px solid #efe8e1" }}>
              <div style={{ fontSize: "13px", color: "#785038" }}>
                عرض {((pageNumber - 1) * pageSize) + 1} - {Math.min(pageNumber * pageSize, filteredGroups.length)} من إجمالي <strong>{filteredGroups.length}</strong> منتج رئيسي
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <label style={{ fontSize: "13px", color: "#543729" }}>عدد المنتجات بالصفحة:</label>
                <div style={{ minWidth: "120px" }}>
                  <BrandSelect
                    label="عدد المنتجات"
                    value={String(pageSize)}
                    onValueChange={(val) => {
                      setPageSize(Number(val));
                      setPageNumber(1);
                    }}
                    placeholder="الصفحة"
                    options={[
                      { value: "15", label: "15 منتج" },
                      { value: "25", label: "25 منتج" },
                      { value: "50", label: "50 منتج" },
                      { value: "100", label: "100 منتج" },
                    ]}
                  />
                </div>
                <button
                  type="button"
                  className="secondary"
                  disabled={pageNumber <= 1}
                  onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                  style={{ padding: "6px 14px", fontSize: "13px" }}
                >
                  السابق
                </button>
                <span style={{ fontSize: "14px", fontWeight: "bold", color: "#3a2419", padding: "0 6px" }}>
                  {pageNumber} / {totalPages}
                </span>
                <button
                  type="button"
                  className="secondary"
                  disabled={pageNumber >= totalPages}
                  onClick={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
                  style={{ padding: "6px 14px", fontSize: "13px" }}
                >
                  التالي
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* 3. STEP-BY-STEP COUNTING MODAL DIALOG */}
      {isAuditing && currentModalGroup && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(30, 20, 15, 0.65)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "16px"
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "680px",
            maxHeight: "90vh",
            boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            border: "1px solid #e0ceb9",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column"
          }}>
            {/* MODAL HEADER */}
            <div style={{
              background: "linear-gradient(135deg, #785038 0%, #543729 100%)",
              color: "#fff",
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <span style={{ fontSize: "12px", opacity: 0.85, display: "block" }}>جلسة جرد المخزون التفاعلية</span>
                <strong style={{ fontSize: "18px" }}>
                  المنتج رقم ({currentAuditIndex + 1}) من أصل {filteredGroups.length}
                </strong>
              </div>
              <button
                type="button"
                onClick={() => {
                  saveCurrentGroupCounts();
                  setIsAuditing(false);
                }}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "#fff",
                  fontSize: "18px",
                  cursor: "pointer",
                  borderRadius: "50%",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ✕
              </button>
            </div>

            {/* PROGRESS BAR */}
            <div style={{ background: "#e8ded4", height: "6px", width: "100%" }}>
              <div style={{
                background: "#c99a59",
                height: "100%",
                width: `${((currentAuditIndex + 1) / filteredGroups.length) * 100}%`,
                transition: "width 0.2s ease"
              }} />
            </div>

            {/* MODAL BODY (SCROLLABLE) */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto", flex: 1 }}>
              {/* PRODUCT INFO CARD */}
              <div style={{
                background: "#faf6f0",
                border: "1px solid #ebd8c8",
                borderRadius: "12px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "10px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                  <div>
                    <span style={{ fontSize: "11px", color: "#8b7b70", fontWeight: 700 }}>اسم المنتج الرئيسي:</span>
                    <h3 style={{ margin: "2px 0 0", fontSize: "20px", color: "#2c1c14" }}>
                      {currentModalGroup.name}
                    </h3>
                  </div>
                  <span style={{
                    padding: "4px 10px",
                    background: "#ebd8c8",
                    color: "#543729",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 800
                  }}>
                    #{currentAuditIndex + 1}
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "12px", color: "#543729" }}>
                  <div>🏢 المخزن: <strong>{currentModalGroup.warehouses.join("، ")}</strong></div>
                  {currentModalGroup.locations.length > 0 && (
                    <div>📍 المكان: <strong>{currentModalGroup.locations.join("، ")}</strong></div>
                  )}
                  <div>🏷️ التصنيف: <strong>{currentModalGroup.category}</strong></div>
                  {currentModalGroup.barcode && (
                    <div>🔢 باركود رئيسي: <code>{currentModalGroup.barcode}</code></div>
                  )}
                  <div>سعر البيع: <strong style={{ color: "#24742c" }}>{money(currentModalGroup.sellPricePiasters)}</strong></div>
                  {showSystemQtyDuringAudit && (
                    <div style={{ background: "#fff", padding: "2px 8px", borderRadius: "6px", border: "1px solid #ebd8c8" }}>
                      إجمالي السيستم: <strong style={{ color: "#785038" }}>{currentModalGroup.totalQuantity} قطعة</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* VARIANTS COUNTING SECTION */}
              {(() => {
                const hasVariants = currentModalGroup.rows.length > 1 || currentModalGroup.rows.some((r) => r.color || r.size);

                if (!hasVariants) {
                  // SINGLE BASE PRODUCT WITHOUT VARIANTS
                  const row = currentModalGroup.rows[0];
                  const key = getProductKey(row);
                  const currentInput = tempVariantInputs[key] ?? "";
                  const inputVal = Math.max(0, parseInt(currentInput, 10) || 0);
                  const hasVal = currentInput.trim() !== "";
                  const diff = hasVal ? inputVal - row.quantity : 0;

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <label style={{ fontSize: "14px", fontWeight: 800, color: "#34231c", display: "block" }}>
                          ✍️ اكتب الإجمالي المتوفر حالياً في المحل (الجرد الفعلي):
                        </label>
                        {row.location && (
                          <span style={{ fontSize: "12px", color: "#1d4ed8", fontWeight: 700 }}>
                            📍 المكان: {row.location}
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0"
                        ref={(el) => { variantInputRefs.current[0] = el; }}
                        placeholder="أدخل عدد القطع المتوفرة..."
                        value={currentInput}
                        onChange={(e) => setTempVariantInputs({ [key]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleNextProduct();
                          }
                        }}
                        autoFocus
                        style={{
                          fontSize: "26px",
                          fontWeight: 800,
                          textAlign: "center",
                          padding: "12px",
                          borderRadius: "10px",
                          border: "2px solid #c99a59",
                          background: "#fffdfa",
                          color: "#241c18"
                        }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "#8b7b70" }}>
                        <span>💡 اضغط زر <strong>Enter</strong> لحفظ الكمية والانتقال للمنتج التالي فوراً</span>
                        {counts[key] !== undefined && (
                          <span style={{ color: "#785038", fontWeight: 700 }}>
                            المحفوظ سابقاً: {counts[key]} قطعة
                          </span>
                        )}
                      </div>

                      {hasVal && (
                        !showSystemQtyDuringAudit ? (
                          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px", borderRadius: "8px", textAlign: "center", color: "#15803d", fontWeight: 700, fontSize: "13px" }}>
                            ✅ تم تسجيل الكمية الفعلية: {inputVal} قطعة
                          </div>
                        ) : diff === 0 ? (
                          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px", borderRadius: "8px", textAlign: "center", color: "#15803d", fontWeight: 700, fontSize: "13px" }}>
                            ✅ مطابق تماماً لرصيد السيستم ({inputVal} قطعة)
                          </div>
                        ) : diff < 0 ? (
                          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: "10px", borderRadius: "8px", color: "#dc2626", fontSize: "13px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                              <span>🔴 يوجد عجز: {Math.abs(diff)} قطعة</span>
                              <span>قيمة البيع: -{money(Math.abs(diff) * row.sellPricePiasters)}</span>
                            </div>
                            <small style={{ color: "#991b1b", display: "block", marginTop: "2px" }}>قيمة التكلفة للعجز: -{money(Math.abs(diff) * row.buyPricePiasters)}</small>
                          </div>
                        ) : (
                          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "10px", borderRadius: "8px", color: "#2563eb", fontSize: "13px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                              <span>🔵 توجد زيادة: +{diff} قطعة</span>
                              <span>قيمة البيع: +{money(diff * row.sellPricePiasters)}</span>
                            </div>
                            <small style={{ color: "#1e40af", display: "block", marginTop: "2px" }}>قيمة التكلفة للزيادة: +{money(diff * row.buyPricePiasters)}</small>
                          </div>
                        )
                      )}
                    </div>
                  );
                }

                // PRODUCT HAS VARIANTS: SHOW ALL VARIANTS UNDER PARENT PRODUCT
                let sumEntered = 0;
                let anyEntered = false;

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <label style={{ fontSize: "14px", fontWeight: 800, color: "#34231c" }}>
                        🎨 جرد متغيرات المنتج ({currentModalGroup.rows.length} متغير):
                      </label>
                      <small style={{ color: "#785038", fontSize: "12px" }}>
                        تنقل بين الحقول بزر <strong>Enter</strong>
                      </small>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                      {currentModalGroup.rows.map((vr, vrIdx) => {
                        const vKey = getProductKey(vr);
                        const vInput = tempVariantInputs[vKey] ?? "";
                        const hasVVal = vInput.trim() !== "";
                        const vVal = Math.max(0, parseInt(vInput, 10) || 0);
                        if (hasVVal) {
                          sumEntered += vVal;
                          anyEntered = true;
                        }
                        const vDiff = hasVVal ? vVal - vr.quantity : 0;

                        return (
                          <div
                            key={vKey}
                            style={{
                              background: hasVVal ? "#fffefc" : "#faf8f5",
                              border: `1px solid ${hasVVal ? "#c99a59" : "#e9e1d9"}`,
                              borderRadius: "10px",
                              padding: "12px 14px",
                              display: "grid",
                              gridTemplateColumns: "1.4fr 1.1fr 1fr",
                              gap: "12px",
                              alignItems: "center"
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                {vr.color && (
                                  <span style={{ background: "#f0e5d8", color: "#543729", padding: "2px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 700 }}>
                                    🎨 {vr.color}
                                  </span>
                                )}
                                {vr.size && (
                                  <span style={{ background: "#e8ded4", color: "#34231c", padding: "2px 8px", borderRadius: "6px", fontSize: "12px", fontWeight: 800 }}>
                                    📏 مقاس {vr.size}
                                  </span>
                                )}
                                {!vr.color && !vr.size && (
                                  <strong>افتراضي</strong>
                                )}
                              </div>
                              <div style={{ fontSize: "11px", color: "#785038", marginTop: "4px" }}>
                                {vr.warehouse} {vr.location ? `· 📍 المكان: ${vr.location}` : ""} {vr.barcode ? `· باركود: ${vr.barcode}` : ""}
                              </div>
                              <div style={{ fontSize: "11px", color: "#543729", marginTop: "2px" }}>
                                سعر البيع: <strong>{money(vr.sellPricePiasters)}</strong>
                              </div>
                            </div>

                            <div style={{ textAlign: "center" }}>
                              {showSystemQtyDuringAudit ? (
                                <>
                                  <div style={{ fontSize: "11px", color: "#8b7b70" }}>الرصيد بالسيستم:</div>
                                  <strong style={{ fontSize: "16px", color: "#543729" }}>{vr.quantity} قطعة</strong>
                                  {counts[vKey] !== undefined && (
                                    <div style={{ fontSize: "10px", color: "#8b7b70", marginTop: "2px" }}>
                                      السابق: {counts[vKey]}
                                    </div>
                                  )}
                                </>
                              ) : (
                                <>
                                  {counts[vKey] !== undefined ? (
                                    <div style={{ fontSize: "12px", color: "#785038", fontWeight: 700 }}>
                                      المُسجل: {counts[vKey]} قطعة
                                    </div>
                                  ) : (
                                    <div style={{ fontSize: "11px", color: "#9ca3af" }}>لم يُسجل بعد</div>
                                  )}
                                </>
                              )}
                            </div>

                            <div>
                              <input
                                type="number"
                                min="0"
                                ref={(el) => { variantInputRefs.current[vrIdx] = el; }}
                                placeholder="الكمية باليد..."
                                value={vInput}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTempVariantInputs((prev) => ({ ...prev, [vKey]: val }));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    if (vrIdx < currentModalGroup.rows.length - 1) {
                                      variantInputRefs.current[vrIdx + 1]?.focus();
                                      variantInputRefs.current[vrIdx + 1]?.select();
                                    } else {
                                      handleNextProduct();
                                    }
                                  }
                                }}
                                style={{
                                  fontSize: "18px",
                                  fontWeight: 800,
                                  textAlign: "center",
                                  padding: "8px",
                                  borderRadius: "8px",
                                  border: "2px solid #decbb8",
                                  width: "100%"
                                }}
                              />
                              {hasVVal && (
                                <div style={{ textAlign: "center", marginTop: "4px" }}>
                                  {!showSystemQtyDuringAudit ? (
                                    <span style={{ color: "#15803d", fontSize: "11px", fontWeight: 700 }}>
                                      ✅ تم الإدخال: {vVal} قطعة
                                    </span>
                                  ) : vDiff === 0 ? (
                                    <span style={{ color: "#15803d", fontSize: "11px", fontWeight: 700 }}>✅ مطابق</span>
                                  ) : vDiff < 0 ? (
                                    <span style={{ color: "#dc2626", fontSize: "11px", fontWeight: 700 }}>
                                      🔴 عجز {vDiff}
                                    </span>
                                  ) : (
                                    <span style={{ color: "#2563eb", fontSize: "11px", fontWeight: 700 }}>
                                      🔵 زيادة +{vDiff}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* OVERALL PRODUCT SUMMARY */}
                    <div style={{
                      background: "#faf6f0",
                      border: "1px solid #ebd8c8",
                      borderRadius: "10px",
                      padding: "12px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: "6px"
                    }}>
                      {showSystemQtyDuringAudit && (
                        <div style={{ fontSize: "13px" }}>
                          إجمالي رصيد السيستم: <strong>{currentModalGroup.totalQuantity} قطعة</strong>
                        </div>
                      )}
                      <div style={{ fontSize: "13px" }}>
                        إجمالي الجرد الفعلي: <strong style={{ color: "#785038", fontSize: "15px" }}>{anyEntered ? `${sumEntered} قطعة` : "لم يُدخل بعد"}</strong>
                      </div>
                      {showSystemQtyDuringAudit && anyEntered && (
                        <div style={{ fontSize: "13px" }}>
                          الفارق الإجمالي:{" "}
                          <strong style={{
                            color: sumEntered === currentModalGroup.totalQuantity ? "#15803d" : sumEntered < currentModalGroup.totalQuantity ? "#dc2626" : "#2563eb"
                          }}>
                            {sumEntered === currentModalGroup.totalQuantity ? "مطابق تماماً" : sumEntered < currentModalGroup.totalQuantity ? `عجز (${sumEntered - currentModalGroup.totalQuantity})` : `زيادة (+${sumEntered - currentModalGroup.totalQuantity})`}
                          </strong>
                        </div>
                      )}
                      {!showSystemQtyDuringAudit && (
                        <small style={{ color: "#8b7b70" }}>
                          (ستظهر كميات السيستم والفروقات بالتقرير النهائي)
                        </small>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* MODAL FOOTER BUTTONS */}
            <div style={{
              background: "#faf6f0",
              borderTop: "1px solid #e9e1d9",
              padding: "14px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px"
            }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={handlePrevProduct}
                  disabled={currentAuditIndex === 0}
                  style={{ padding: "8px 16px", fontWeight: 700 }}
                >
                  السابق
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={handleNextProduct}
                  style={{ padding: "8px 20px", fontWeight: 800 }}
                >
                  {currentAuditIndex < filteredGroups.length - 1 ? "حفظ والتالي" : "حفظ وإنهاء"}
                </button>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={handleFinishAudit}
                  style={{
                    background: "#2563eb",
                    color: "#fff",
                    borderColor: "#1d4ed8",
                    fontWeight: 700,
                    padding: "8px 16px"
                  }}
                >
                  🏁 إنهاء الجرد وعرض التقرير
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    saveCurrentGroupCounts();
                    setIsAuditing(false);
                  }}
                  style={{ padding: "8px 12px" }}
                >
                  حفظ وخروج
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SAVE REPORT MODAL */}
      {showSaveReportModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(30, 20, 15, 0.65)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          padding: "16px"
        }}>
          <div style={{
            background: "#fff",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "520px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            border: "1px solid #e0ceb9",
            overflow: "hidden"
          }}>
            <div style={{
              background: saveActionType === "APPLY_AND_SAVE" ? "linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)" : "linear-gradient(135deg, #785038 0%, #543729 100%)",
              color: "#fff",
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <strong style={{ fontSize: "17px" }}>
                {saveActionType === "APPLY_AND_SAVE" ? "⚡ اعتماد وتحديث أرصدة السيستم وحفظ التقرير" : "💾 حفظ تقرير الجرد بالأرشيف"}
              </strong>
              <button
                type="button"
                onClick={() => setShowSaveReportModal(false)}
                style={{
                  background: "rgba(255,255,255,0.2)",
                  border: "none",
                  color: "#fff",
                  fontSize: "16px",
                  cursor: "pointer",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {saveActionType === "SAVE_ONLY" ? (
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "12px", borderRadius: "8px", fontSize: "13px", color: "#166534" }}>
                  <strong>🔒 حفظ رقابي فقط (الحفاظ على أرصدة المخزون الحالية):</strong>
                  <div style={{ marginTop: "4px" }}>
                    سيتم حفظ هذا التقرير ببياناته وفروقاته في الأرشيف باسم الشهر للرجوع إليه وطباعته في أي وقت، <strong>ولن يتم المساس أو تعديل أي رصيد مخزن بالسيستم</strong>.
                  </div>
                </div>
              ) : (
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px", borderRadius: "8px", fontSize: "13px", color: "#1e40af" }}>
                  <strong>⚡ اعتماد وتحديث أرصدة السيستم:</strong>
                  <div style={{ marginTop: "4px" }}>
                    سيتم تعديل رصيد المخزن الفعلي في السيستم لكل صنف به فرق، وتسجيل حركات تسوية جردية (ADJUSTMENT)، وحفظ التقرير كتقرير معتمد في الأرشيف.
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "4px", color: "#34231c" }}>
                  📅 اسم الشهر / الفترة: <span style={{ color: "#dc2626" }}>*</span>
                </label>
                <input
                  type="text"
                  value={reportMonthName}
                  onChange={(e) => {
                    setReportMonthName(e.target.value);
                    if (!reportCustomTitle || reportCustomTitle.startsWith("جرد شهر ")) {
                      setReportCustomTitle(saveActionType === "APPLY_AND_SAVE" ? `جرد شهر ${e.target.value} (معتمد)` : `جرد شهر ${e.target.value}`);
                    }
                  }}
                  placeholder="مثال: سبتمبر 2026، أكتوبر 2026..."
                  style={{ width: "100%", padding: "9px 12px", fontSize: "14px", fontWeight: 700 }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "4px", color: "#34231c" }}>
                  🏷️ عنوان التقرير (يظهر بالطباعة والأرشيف):
                </label>
                <input
                  type="text"
                  value={reportCustomTitle}
                  onChange={(e) => setReportCustomTitle(e.target.value)}
                  placeholder="مثال: جرد شهر سبتمبر 2026"
                  style={{ width: "100%", padding: "9px 12px", fontSize: "14px" }}
                />
              </div>

              <div style={{ background: "#faf6f0", border: "1px solid #ebd8c8", borderRadius: "8px", padding: "12px", fontSize: "12px", color: "#543729" }}>
                <div>📦 إجمالي الأصناف المجرودة: <strong>{totalAuditedProductsCount} منتج</strong></div>
                <div>✅ أصناف مطابقة: <strong>{matchProductsCount}</strong> | ⚠️ أصناف بها فروقات: <strong>{diffProductsCount}</strong></div>
                {totalShortageUnits > 0 && <div style={{ color: "#dc2626" }}>🔴 إجمالي العجز: -{totalShortageUnits} قطعة ({money(totalShortageSellPiasters)})</div>}
                {totalSurplusUnits > 0 && <div style={{ color: "#2563eb" }}>🔵 إجمالي الزيادة: +{totalSurplusUnits} قطعة ({money(totalSurplusSellPiasters)})</div>}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "6px" }}>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowSaveReportModal(false)}
                  disabled={isSavingReport}
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => void handleConfirmSaveReport()}
                  disabled={isSavingReport || !reportMonthName.trim()}
                  style={{
                    fontWeight: 800,
                    background: saveActionType === "APPLY_AND_SAVE" ? "#2563eb" : "#166534",
                    borderColor: saveActionType === "APPLY_AND_SAVE" ? "#1d4ed8" : "#14532d",
                  }}
                >
                  {isSavingReport
                    ? "جارٍ الحفظ..."
                    : saveActionType === "APPLY_AND_SAVE"
                    ? "⚡ تأكيد التحديث وحفظ التقرير"
                    : "💾 تأكيد الحفظ بدون تعديل الأرصدة"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OnlineOrders({
  products,
  customerChoices = [],
  session,
  onGoToInvoice,
  setNotice,
  setError,
  refresh,
  active = true,
}: {
  products: Product[];
  customerChoices?: CustomerChoice[];
  session: Session;
  onGoToInvoice: (invoiceNumber: number) => void;
  setNotice: (msg: string) => void;
  setError: (msg: string) => void;
  refresh: () => Promise<void> | void;
  active?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"orders" | "create">("orders");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "CONFIRMED" | "CANCELLED">("ALL");
  const [orders, setOrders] = useState<OnlineOrderView[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [viewSlipOrder, setViewSlipOrder] = useState<OnlineOrderDetail | null>(null);
  const [confirmOrderTarget, setConfirmOrderTarget] = useState<OnlineOrderView | null>(null);
  const [cancelOrderTarget, setCancelOrderTarget] = useState<OnlineOrderView | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // New Order State
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ProductGroup | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("الكل");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogPage, setCatalogPage] = useState(1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [lastAdded, setLastAdded] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [shippingFee, setShippingFee] = useState("50");
  const [depositAmount, setDepositAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("CASH_ON_DELIVERY");
  const [notes, setNotes] = useState("");
  const [editPrice, setEditPrice] = useState(false);
  const [editName, setEditName] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const matchedCustomer = useMemo(() => {
    const p = customerPhone.trim();
    const n = customerName.trim().toLowerCase();
    if (p) {
      const match = customerChoices.find((c) => c.phone.trim() === p);
      if (match) return match;
    }
    if (n && n.length >= 2) {
      const match = customerChoices.find((c) => c.name.trim().toLowerCase() === n);
      if (match) return match;
    }
    return null;
  }, [customerChoices, customerPhone, customerName]);

  function handleCustomerNameChange(name: string) {
    setCustomerName(name);
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return;
    const existing = customerChoices.find((c) => c.name.trim().toLowerCase() === trimmed);
    if (existing) {
      if (existing.phone) setCustomerPhone(existing.phone);
      if (!customerAddress) {
        const prevOrder = orders.find(
          (o) => o.customerPhone === existing.phone || o.customerName.trim().toLowerCase() === trimmed
        );
        if (prevOrder && prevOrder.customerAddress) {
          setCustomerAddress(prevOrder.customerAddress);
        }
      }
    }
  }

  function handleCustomerPhoneChange(phone: string) {
    setCustomerPhone(phone);
    const trimmed = phone.trim();
    if (!trimmed) return;
    const existing = customerChoices.find((c) => c.phone.trim() === trimmed);
    if (existing) {
      if (existing.name) setCustomerName(existing.name);
      if (!customerAddress) {
        const prevOrder = orders.find((o) => o.customerPhone === trimmed);
        if (prevOrder && prevOrder.customerAddress) {
          setCustomerAddress(prevOrder.customerAddress);
        }
      }
    }
  }

  const loadOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      const res = await invoke<OnlineOrderView[]>("list_online_orders", {
        token: session.token,
        statusFilter: statusFilter === "ALL" ? null : statusFilter,
      });
      setOrders(res);
    } catch (e: any) {
      setError(typeof e === "string" ? e : (e?.message || "فشل تحميل طلبات الأونلاين"));
    } finally {
      setLoadingOrders(false);
    }
  }, [session.token, statusFilter, setError]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  // Catalog items for the Create Order Tab
  const groupedProducts = useMemo(() => groupProductRows(products), [products]);
  const categories = useMemo(() => ["الكل", ...new Set(groupedProducts.map((p) => p.category))], [groupedProducts]);
  const filteredCatalog = useMemo(() => {
    return groupedProducts.filter((product) => {
      const matchCat = categoryFilter === "الكل" || product.category === categoryFilter;
      const searchable = [product.name, product.barcode, ...product.colors, ...product.sizes].join(" ");
      return matchCat && searchable.toLowerCase().includes(catalogSearch.toLowerCase().trim());
    });
  }, [groupedProducts, categoryFilter, catalogSearch]);
  const validCatalogPage = Math.min(catalogPage, Math.max(1, Math.ceil(filteredCatalog.length / CATALOG_PAGE_SIZE)));
  const visibleCatalog = filteredCatalog.slice((validCatalogPage - 1) * CATALOG_PAGE_SIZE, validCatalogPage * CATALOG_PAGE_SIZE);

  function addToCart(product: Product) {
    if (product.quantity < 1) return;
    setCart((current) => {
      const index = current.findIndex(
        (line) =>
          line.product.productId === product.productId &&
          line.product.variantId === product.variantId &&
          line.product.warehouseId === product.warehouseId
      );
      if (index < 0) {
        return [...current, { product, quantity: 1, price: product.sellPricePiasters, discount: 0, name: product.name }];
      }
      return current.map((line, i) =>
        i === index ? { ...line, quantity: line.quantity + 1 } : line
      );
    });
  }

  function chooseProduct(product: ProductGroup) {
    const available = product.rows.filter((row) => row.quantity > 0);
    if (available.length === 1) {
      addToCart(available[0]);
    } else if (available.length > 1) {
      setSelectedProduct(product);
    }
  }

  const handleBarcodeScan = useCallback((rawVal: string) => {
    const val = rawVal.trim();
    if (!val) return false;

    // 1. Direct match on specific product variant barcode
    const variantMatch = products.find(
      (p) => p.barcode && p.barcode.trim() === val && p.quantity > 0
    );
    if (variantMatch) {
      addToCart(variantMatch);
      const desc = variantMatch.name + (variantMatch.color || variantMatch.size ? ` (${variantMatch.color || ""} / ${variantMatch.size || ""})` : "");
      setLastAdded(desc);
      setCatalogSearch("");
      return true;
    }

    // 2. Direct match on grouped product barcode
    const groupMatch = groupedProducts.find(
      (g) => g.barcode && g.barcode.trim() === val
    );
    if (groupMatch) {
      chooseProduct(groupMatch);
      setLastAdded(groupMatch.name);
      setCatalogSearch("");
      return true;
    }

    return false;
  }, [products, groupedProducts]);

  useEffect(() => {
    if (!active || activeTab !== "create") return;
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.code === "KeyF" || e.key.toLowerCase() === "f" || e.key === "ب")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === "Escape" && selectedProduct) {
        e.preventDefault();
        setSelectedProduct(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [active, activeTab, selectedProduct]);

  useEffect(() => {
    if (active && activeTab === "create") {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [active, activeTab]);

  useEffect(() => {
    if (!active || activeTab !== "create") return;

    let buffer = "";
    let lastKeyTime = 0;

    function handleGlobalScanner(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isOtherInput =
        target &&
        target !== searchInputRef.current &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA");
      if (isOtherInput) return;

      const now = Date.now();
      if (now - lastKeyTime > 120) {
        buffer = "";
      }
      lastKeyTime = now;

      if (e.key === "Enter") {
        if (buffer.length >= 3) {
          if (handleBarcodeScan(buffer)) {
            e.preventDefault();
            buffer = "";
          }
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    }

    window.addEventListener("keydown", handleGlobalScanner);
    return () => window.removeEventListener("keydown", handleGlobalScanner);
  }, [active, activeTab, handleBarcodeScan]);

  function updateCartLine(index: number, partial: Partial<CartLine>) {
    setCart((curr) => curr.map((line, i) => (i === index ? { ...line, ...partial } : line)));
  }

  function removeCartLine(index: number) {
    setCart((curr) => curr.filter((_, i) => i !== index));
  }

  function clearCart() {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setShippingFee("50");
    setDepositAmount("");
    setDiscountAmount("0");
    setPaymentMethod("CASH_ON_DELIVERY");
    setNotes("");
    setEditPrice(false);
    setEditName(false);
  }

  // Totals for Create Tab
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartItemDiscount = cart.reduce((sum, item) => sum + item.discount * item.quantity, 0);
  const shippingFeePiasters = piastres(shippingFee);
  const extraDiscountPiasters = piastres(discountAmount);
  const totalDiscountPiasters = cartItemDiscount + extraDiscountPiasters;
  const cartGrandTotal = Math.max(0, cartSubtotal + shippingFeePiasters - totalDiscountPiasters);
  const depositPiasters = Math.min(cartGrandTotal, Math.max(0, piastres(depositAmount)));
  const remainingToCollect = Math.max(0, cartGrandTotal - depositPiasters);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  async function handleCreateOrder(e: FormEvent) {
    e.preventDefault();
    if (cart.length === 0) {
      setError("أضف منتجًا واحدًا على الأقل لطلب الأونلاين");
      return;
    }
    if (!customerName.trim()) {
      setError("اسم العميل مطلوب");
      return;
    }
    if (!customerPhone.trim()) {
      setError("رقم هاتف العميل مطلوب");
      return;
    }

    try {
      setSubmitting(true);
      const input = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerAddress: customerAddress.trim() || null,
        shippingFeePiasters: shippingFeePiasters,
        depositPiasters: depositPiasters > 0 ? depositPiasters : 0,
        paymentMethod: paymentMethod || "CASH_ON_DELIVERY",
        notes: notes.trim() || null,
        sellerId: session.userId ? Number(session.userId) : null,
        employeeId: null,
        lines: cart.map((line) => ({
          productId: line.product.productId,
          variantId: line.product.variantId,
          warehouseId: line.product.warehouseId,
          quantity: line.quantity,
          sellPricePiasters: line.price,
          discountEachPiasters: line.discount,
          nameOverride: line.name === line.product.name ? null : line.name,
        })),
      };

      const orderNumber = await invoke<number>("create_online_order", {
        token: session.token,
        input,
      });

      clearCart();
      setNotice(`تم حفظ طلب الأونلاين بنجاح برقم #${orderNumber} (قيد الانتظار - لم يتم خصم المخزون بعد).`);
      setActiveTab("orders");
      await refresh();
      await loadOrders();
    } catch (err: any) {
      setError(typeof err === "string" ? err : (err?.message || "فشل إنشاء طلب الأونلاين"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirmOrder() {
    if (!confirmOrderTarget) return;
    try {
      setActionBusy(true);
      const invoiceNumber = await invoke<number>("confirm_online_order", {
        token: session.token,
        orderId: confirmOrderTarget.id,
      });

      setConfirmOrderTarget(null);
      setNotice(`✅ تم تأكيد وخروج الأوردر #${confirmOrderTarget.orderNumber}! تم خصم المخزون وإنشاء الفاتورة رقم #${invoiceNumber}.`);
      await refresh();
      await loadOrders();
    } catch (err: any) {
      setError(typeof err === "string" ? err : (err?.message || "فشل تأكيد وخروج الأوردر"));
    } finally {
      setActionBusy(false);
    }
  }

  async function handleCancelOrder() {
    if (!cancelOrderTarget) return;
    try {
      setActionBusy(true);
      await invoke("cancel_online_order", {
        token: session.token,
        orderId: cancelOrderTarget.id,
      });

      setCancelOrderTarget(null);
      setNotice(`تم إلغاء طلب الأونلاين #${cancelOrderTarget.orderNumber}.`);
      await loadOrders();
    } catch (err: any) {
      setError(typeof err === "string" ? err : (err?.message || "فشل إلغاء طلب الأونلاين"));
    } finally {
      setActionBusy(false);
    }
  }

  async function openSlipModal(order: OnlineOrderView) {
    try {
      const details = await invoke<OnlineOrderDetail>("get_online_order_details", {
        token: session.token,
        orderId: order.id,
      });
      setViewSlipOrder(details);
    } catch (err: any) {
      setError(typeof err === "string" ? err : (err?.message || "فشل جلب تفاصيل الأوردر"));
    }
  }

  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase().trim();
    return orders.filter((o) => {
      const s = `${o.orderNumber} ${o.customerName} ${o.customerPhone} ${o.customerAddress || ""} ${o.notes || ""}`.toLowerCase();
      return s.includes(q);
    });
  }, [orders, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice(startIndex, startIndex + pageSize);
  }, [filteredOrders, startIndex, pageSize]);

  const pendingCount = useMemo(() => orders.filter((o) => o.status === "PENDING").length, [orders]);
  const confirmedCount = useMemo(() => orders.filter((o) => o.status === "CONFIRMED").length, [orders]);
  const cancelledCount = useMemo(() => orders.filter((o) => o.status === "CANCELLED").length, [orders]);
  const confirmedSalesPiasters = useMemo(() => {
    return orders.filter((o) => o.status === "CONFIRMED").reduce((sum, o) => sum + o.totalPiasters, 0);
  }, [orders]);

  return (
    <div className="online-page">
      {/* Top Header & Navigation Tabs */}
      <div className="online-nav-tabs">
        <button
          type="button"
          className={`online-tab-btn ${activeTab === "orders" ? "active" : ""}`}
          onClick={() => setActiveTab("orders")}
        >
          <span>📦 إدارة ومتابعة الطلبات</span>
          <span className="online-tab-badge">{orders.length}</span>
        </button>
        <button
          type="button"
          className={`online-tab-btn ${activeTab === "create" ? "active" : ""}`}
          onClick={() => setActiveTab("create")}
        >
          <span>🛒 نقطة بيع الأونلاين (طلب جديد)</span>
          {cart.length > 0 && <span className="online-tab-badge">{cartItemsCount}</span>}
        </button>
      </div>

      {activeTab === "orders" && (
        <section className="panel stack">
          <div className="section-head" style={{ marginBottom: 0 }}>
            <div>
              <h2>طلبات ومبيعات الأونلاين</h2>
              <p>متابعة أوردرات الشحن وتأكيد خروجها لاعتماد الفاتورة وخصم المخزون.</p>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                className="secondary"
                onClick={() => void loadOrders()}
                disabled={loadingOrders}
              >
                <LuRefreshCw style={{ marginLeft: "6px" }} />
                {loadingOrders ? "جارٍ التحديث…" : "تحديث"}
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => setActiveTab("create")}
              >
                + طلب أونلاين جديد
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="stats" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
            <div className="stat">
              <span>⏳ بانتظار التأكيد (لم يخرج)</span>
              <strong style={{ color: "#b78103" }}>{pendingCount}</strong>
            </div>
            <div className="stat">
              <span>✅ تم التأكيد والبيع</span>
              <strong style={{ color: "#2e7d32" }}>{confirmedCount}</strong>
            </div>
            <div className="stat">
              <span>🚫 طلبات ملغية</span>
              <strong style={{ color: "#8b7b70" }}>{cancelledCount}</strong>
            </div>
            <div className="stat">
              <span>💰 مبيعات معتمدة تم تحصيلها</span>
              <strong style={{ color: "#785038" }}>{money(confirmedSalesPiasters)}</strong>
            </div>
          </div>

          {/* Filters and Search Bar */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className={`secondary small ${statusFilter === "ALL" ? "primary" : ""}`}
                onClick={() => setStatusFilter("ALL")}
              >
                الكل ({orders.length})
              </button>
              <button
                type="button"
                className={`secondary small ${statusFilter === "PENDING" ? "primary" : ""}`}
                style={statusFilter === "PENDING" ? { background: "#b78103", borderColor: "#b78103", color: "#fff" } : {}}
                onClick={() => setStatusFilter("PENDING")}
              >
                قيد الانتظار ({pendingCount})
              </button>
              <button
                type="button"
                className={`secondary small ${statusFilter === "CONFIRMED" ? "primary" : ""}`}
                style={statusFilter === "CONFIRMED" ? { background: "#2e7d32", borderColor: "#2e7d32", color: "#fff" } : {}}
                onClick={() => setStatusFilter("CONFIRMED")}
              >
                تم التأكيد والخروج ({confirmedCount})
              </button>
              <button
                type="button"
                className={`secondary small ${statusFilter === "CANCELLED" ? "primary" : ""}`}
                style={statusFilter === "CANCELLED" ? { background: "#785038", borderColor: "#785038", color: "#fff" } : {}}
                onClick={() => setStatusFilter("CANCELLED")}
              >
                الملغية ({cancelledCount})
              </button>
            </div>

            <div style={{ minWidth: "280px", maxWidth: "420px", flex: 1 }}>
              <input
                className="search"
                type="search"
                placeholder="ابحث برقم الأوردر، اسم العميل، الهاتف..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ height: "42px", padding: "8px 14px", fontSize: "14px" }}
              />
            </div>
          </div>

          {/* Orders Table */}
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>رقم الطلب</th>
                  <th>التاريخ</th>
                  <th>العميل والهاتف</th>
                  <th>العنوان والشحن</th>
                  <th>الأصناف</th>
                  <th>المبلغ المطلوب</th>
                  <th>الدفع</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <div className="empty">
                        <span>📦</span>
                        <p>لا توجد طلبات أونلاين مطابقة</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong style={{ color: "#785038", fontSize: "14px" }}>
                          #{order.orderNumber}
                        </strong>
                      </td>
                      <td>{formatDateTime(order.createdAt)}</td>
                      <td>
                        <div>
                          <strong>{order.customerName}</strong>
                          <small style={{ display: "block", color: "#666", direction: "ltr", textAlign: "right" }}>
                            {order.customerPhone}
                          </small>
                        </div>
                      </td>
                      <td>
                        <div style={{ maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis" }}>
                          <span>{order.customerAddress || "—"}</span>
                          <small style={{ display: "block", color: "#8b7b70" }}>
                            شحن: {money(order.shippingFeePiasters)}
                          </small>
                        </div>
                      </td>
                      <td>
                        <span className="pill">{order.itemsCount} قطعة</span>
                      </td>
                      <td>
                        <strong style={{ fontSize: "14px" }}>{money(order.totalPiasters)}</strong>
                        {order.depositPiasters > 0 && (
                          <small style={{ display: "block", color: "#b94d3f", fontWeight: 700, marginTop: "2px" }}>
                            عربون: {money(order.depositPiasters)}
                            <span style={{ display: "block", color: "#256d32" }}>
                              المتبقي: {money(Math.max(0, order.totalPiasters - order.depositPiasters))}
                            </span>
                          </small>
                        )}
                      </td>
                      <td>
                        <small style={{ fontWeight: 600 }}>
                          {order.paymentMethod === "INSTAPAY"
                            ? "إنستاباي"
                            : order.paymentMethod === "WALLET"
                            ? "محفظة إلكترونية"
                            : "عند الاستلام"}
                        </small>
                      </td>
                      <td>
                        {order.status === "PENDING" && (
                          <span className="online-status-pill pending">⏳ قيد الانتظار</span>
                        )}
                        {order.status === "CONFIRMED" && (
                          <span className="online-status-pill confirmed">
                            ✅ معتمد (فاتورة #{order.invoiceNumber})
                          </span>
                        )}
                        {order.status === "CANCELLED" && (
                          <span className="online-status-pill cancelled">🚫 ملغي</span>
                        )}
                      </td>
                      <td>
                        <div className="action-cell">
                          <button
                            type="button"
                            className="secondary small"
                            onClick={() => void openSlipModal(order)}
                            title="عرض تفاصيل الطلب وبوليصة الشحن"
                          >
                            <LuEye style={{ marginLeft: "4px" }} /> بوليصة
                          </button>

                          {order.status === "PENDING" && (
                            <>
                              {session.role === "ADMIN" ? (
                                <button
                                  type="button"
                                  className="primary small"
                                  style={{ background: "#2e7d32", borderColor: "#2e7d32" }}
                                  onClick={() => setConfirmOrderTarget(order)}
                                  title="تأكيد خروج الأوردر وخصم المخزون وإنشاء الفاتورة"
                                >
                                  <LuCheck style={{ marginLeft: "4px" }} /> تأكيد وخروج
                                </button>
                              ) : (
                                <small style={{ color: "#b78103", fontWeight: 700, alignSelf: "center" }}>
                                  بانتظار المدير
                                </small>
                              )}

                              <button
                                type="button"
                                className="danger-button small"
                                onClick={() => setCancelOrderTarget(order)}
                                title="إلغاء الطلب"
                              >
                                <LuX style={{ marginLeft: "4px" }} /> إلغاء
                              </button>
                            </>
                          )}

                          {order.status === "CONFIRMED" && order.invoiceNumber && (
                            <button
                              type="button"
                              className="secondary small"
                              onClick={() => onGoToInvoice(order.invoiceNumber!)}
                              title="الانتقال إلى الفاتورة الرسمية"
                            >
                              🧾 الفاتورة #{order.invoiceNumber}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredOrders.length > 0 && (
            <div className="pagination" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginTop: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <span>
                  عرض {filteredOrders.length === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, filteredOrders.length)} من إجمالي {filteredOrders.length} طلب
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <small style={{ color: "#785038", fontWeight: 700 }}>لكل صفحة:</small>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "1px solid #e0d7ce",
                      background: "#fff",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#594032"
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="pagination-buttons">
                  <button
                    type="button"
                    disabled={validCurrentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    السابق
                  </button>

                  {(() => {
                    const pages: (number | string)[] = [];
                    if (totalPages <= 7) {
                      for (let i = 1; i <= totalPages; i++) pages.push(i);
                    } else {
                      pages.push(1);
                      if (validCurrentPage > 3) pages.push("...");
                      const start = Math.max(2, validCurrentPage - 1);
                      const end = Math.min(totalPages - 1, validCurrentPage + 1);
                      for (let i = start; i <= end; i++) {
                        if (!pages.includes(i)) pages.push(i);
                      }
                      if (validCurrentPage < totalPages - 2) pages.push("...");
                      if (!pages.includes(totalPages)) pages.push(totalPages);
                    }
                    return pages.map((page, idx) => {
                      if (typeof page === "string") {
                        return <span key={`ellipsis-${idx}`} style={{ padding: "0 4px", color: "#8b7b70" }}>…</span>;
                      }
                      return (
                        <button
                          key={page}
                          type="button"
                          className={page === validCurrentPage ? "active" : ""}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      );
                    });
                  })()}

                  <button
                    type="button"
                    disabled={validCurrentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    التالي
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {activeTab === "create" && (
        <div className="online-create-grid">
          {/* Catalog Panel */}
          <section className="panel stack">
            <div className="section-head" style={{ marginBottom: 0 }}>
              <div>
                <h2>كتالوج المنتجات</h2>
                <p>اختر المنتجات لإضافتها لطلب الأونلاين.</p>
              </div>
            </div>

            <div className="catalog-toolbar" style={{ gap: "10px" }}>
              <input
                ref={searchInputRef}
                className="search full"
                type="search"
                placeholder="ابحث بالاسم أو امسح الباركود بالسكانر… (Ctrl + F)"
                value={catalogSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setCatalogSearch(val);
                  setCatalogPage(1);
                  handleBarcodeScan(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!handleBarcodeScan(catalogSearch)) {
                      if (filteredCatalog.length === 1) {
                        chooseProduct(filteredCatalog[0]);
                        setLastAdded(filteredCatalog[0].name);
                        setCatalogSearch("");
                      }
                    }
                  }
                }}
                autoFocus
                style={{ height: "46px" }}
              />
            </div>

            {lastAdded && (
              <div className="added-hint" role="status" style={{ margin: "4px 0 10px" }}>
                <span>✅ تمت إضافة <strong>{lastAdded}</strong> إلى سلة الطلب بالماسح الضوئي (Scanner).</span>
                <button type="button" onClick={() => setLastAdded("")}>إغلاق ×</button>
              </div>
            )}

            <div className="category-tabs" style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`secondary small ${categoryFilter === cat ? "primary" : ""}`}
                  onClick={() => { setCategoryFilter(cat); setCatalogPage(1); }}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="picks" style={{ minHeight: "350px", maxHeight: "600px", overflowY: "auto" }}>
              {visibleCatalog.map((product) => {
                const totalStock = product.rows.reduce((sum, r) => sum + r.quantity, 0);
                return (
                  <button
                    key={product.productId}
                    type="button"
                    className="pick"
                    disabled={totalStock < 1}
                    onClick={() => chooseProduct(product)}
                    style={{ opacity: totalStock < 1 ? 0.6 : 1 }}
                  >
                    <strong>{product.name}</strong>
                    <small>{product.category}</small>
                    <b>{money(product.sellPricePiasters)}</b>
                    <span className={totalStock > 0 ? "good" : "low"}>
                      {totalStock > 0 ? `متاح ${totalStock}` : "نفد المخزون"}
                    </span>
                  </button>
                );
              })}
            </div>
            {filteredCatalog.length === 0 && <Empty text="لا توجد منتجات مطابقة. جرّب تصنيفًا أو بحثًا آخر." />}
            <CatalogPagination totalItems={filteredCatalog.length} page={validCatalogPage} onPageChange={setCatalogPage} />
          </section>

          {/* Order Details & Cart Panel */}
          <form className="panel stack" onSubmit={handleCreateOrder}>
            <div className="online-warning-banner">
              <span>⚠️</span>
              <div>
                <strong>تنبيه لنظام الأونلاين:</strong>
                <div style={{ marginTop: "2px" }}>
                  هذا الطلب سيُحفظ كمسودة قيد الانتظار، <strong>ولن يتم خصم المخزون أو تسجيل الأرباح في الحسابات</strong> إلا بعد أن يقوم المدير بتأكيد وخروج الأوردر.
                </div>
              </div>
            </div>

            <div className="section-head" style={{ marginBottom: 0 }}>
              <div>
                <h3>بيانات العميل والشحن</h3>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  className="link-button"
                  style={{ color: "#b94d3f" }}
                  onClick={clearCart}
                >
                  تفريغ السلة
                </button>
              )}
            </div>

            <div className="form-grid compact" style={{ marginBottom: 0 }}>
              <label>
                اسم العميل *
                <input
                  type="text"
                  required
                  placeholder="مثال: أحمد محمود"
                  value={customerName}
                  list="online-customer-name-options"
                  onChange={(e) => handleCustomerNameChange(e.target.value)}
                />
                <datalist id="online-customer-name-options">
                  {customerChoices.map((customer) => (
                    <option key={customer.id} value={customer.name}>
                      {customer.phone}
                    </option>
                  ))}
                </datalist>
              </label>
              <label>
                رقم الهاتف *
                <input
                  type="tel"
                  required
                  placeholder="مثال: 01012345678"
                  value={customerPhone}
                  list="online-customer-phone-options"
                  onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                />
                <datalist id="online-customer-phone-options">
                  {customerChoices.map((customer) => (
                    <option key={customer.id} value={customer.phone}>
                      {customer.name}
                    </option>
                  ))}
                </datalist>
              </label>
            </div>
            {matchedCustomer && (
              <div style={{ color: "#256d32", fontSize: "12px", fontWeight: "bold", marginTop: "4px" }}>
                <span>✓ عميل مسجل سابقاً ({matchedCustomer.name} - {matchedCustomer.phone})</span>
              </div>
            )}

            <label>
              العنوان بالتفصيل *
              <input
                type="text"
                required
                placeholder="المحافظة، المدينة، اسم الشارع، رقم العمارة/الشقة"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
              />
            </label>

            <div className="form-grid compact" style={{ marginBottom: 0 }}>
              <label>
                مصاريف الشحن (ج.م)
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={shippingFee}
                  onChange={(e) => setShippingFee(e.target.value)}
                />
              </label>
              <label>
                العربون المدفوع (ج.م)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
              </label>
              <label>
                طريقة تحصيل المتبقي
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #e0d7ce", borderRadius: "9px" }}
                >
                  <option value="CASH_ON_DELIVERY">الدفع عند الاستلام (كاش)</option>
                  <option value="INSTAPAY">إنستاباي (InstaPay)</option>
                  <option value="WALLET">محفظة إلكترونية (Vodafone Cash...)</option>
                  <option value="CASH">دفع مسبق نقدي</option>
                </select>
              </label>
            </div>

            <label>
              ملاحظات الشحن / العميل
              <textarea
                rows={2}
                placeholder="تعليمات خاصة بشركة الشحن أو ميعاد التسليم..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>

            <div className="divider" style={{ margin: "10px 0" }} />

            {/* Cart Items */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h4 style={{ margin: 0 }}>أصناف الطلب ({cartItemsCount})</h4>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", margin: 0, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editPrice}
                      onChange={(e) => setEditPrice(e.target.checked)}
                    />
                    تعديل أسعار البيع
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", margin: 0, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={editName}
                      onChange={(e) => setEditName(e.target.checked)}
                    />
                    تعديل الاسم
                  </label>
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="empty" style={{ padding: "20px 0" }}>
                  <p>السلة فارغة. اختر من كتالوج المنتجات لإضافتها للطلب.</p>
                </div>
              ) : (
                <div className="cart" style={{ maxHeight: "250px", overflowY: "auto" }}>
                  {cart.map((line, index) => (
                    <div className="cart-line" key={index} style={{ gridTemplateColumns: "1fr 80px 80px 80px 30px" }}>
                      <div>
                        {editName ? (
                          <input
                            type="text"
                            value={line.name}
                            onChange={(e) => updateCartLine(index, { name: e.target.value })}
                            style={{
                              width: "100%",
                              padding: "4px 8px",
                              fontSize: "13px",
                              fontWeight: "bold",
                              border: "1px solid #dfd5ca",
                              borderRadius: "6px",
                              marginBottom: "4px",
                            }}
                          />
                        ) : (
                          <strong>{line.name}</strong>
                        )}
                        <small style={{ display: "block", color: "#785038" }}>
                          {line.product.color || "بدون لون"} · {line.product.size || "بدون مقاس"}
                        </small>
                      </div>
                      <div>
                        <label>الكمية</label>
                        <input
                          type="number"
                          min="1"
                          max={line.product.quantity}
                          value={line.quantity}
                          onChange={(e) => updateCartLine(index, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                        />
                      </div>
                      <div>
                        <label>السعر</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          disabled={!editPrice}
                          value={line.price / 100}
                          onChange={(e) => updateCartLine(index, { price: piastres(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label>خصم القطعة</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.discount / 100}
                          onChange={(e) => updateCartLine(index, { discount: piastres(e.target.value) })}
                        />
                      </div>
                      <button
                        type="button"
                        className="remove"
                        onClick={() => removeCartLine(index)}
                        title="حذف من الطلب"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="sheet-totals" style={{ marginTop: "10px" }}>
              <div className="total">
                <span>إجمالي المنتجات:</span>
                <strong>{money(cartSubtotal)}</strong>
              </div>
              <div className="total">
                <span>مصاريف الشحن:</span>
                <strong>{money(shippingFeePiasters)}</strong>
              </div>
              {totalDiscountPiasters > 0 && (
                <div className="total" style={{ color: "#2e7d32" }}>
                  <span>إجمالي الخصم:</span>
                  <strong>- {money(totalDiscountPiasters)}</strong>
                </div>
              )}
              {depositPiasters > 0 && (
                <div className="total">
                  <span>إجمالي الطلب:</span>
                  <strong>{money(cartGrandTotal)}</strong>
                </div>
              )}
              {depositPiasters > 0 && (
                <div className="total" style={{ color: "#b94d3f" }}>
                  <span>العربون المدفوع:</span>
                  <strong>- {money(depositPiasters)}</strong>
                </div>
              )}
              <div className="total grand">
                <span>{depositPiasters > 0 ? "المطلوب تحصيله عند الاستلام:" : "المبلغ المطلوب تحصيله:"}</span>
                <strong style={{ color: "#785038", fontSize: "22px" }}>{money(remainingToCollect)}</strong>
              </div>
            </div>

            <button
              type="submit"
              className="primary full"
              disabled={submitting || cart.length === 0}
              style={{ padding: "14px", fontSize: "16px" }}
            >
              {submitting ? "جارٍ حفظ طلب الأونلاين…" : "📦 حفظ وإنشاء طلب الأونلاين (قيد الانتظار)"}
            </button>
          </form>
        </div>
      )}

      {/* Variant Picker Modal */}
      {selectedProduct && (
        <div
          className="variant-picker-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSelectedProduct(null);
          }}
        >
          <section className="variant-picker" role="dialog" aria-modal="true">
            <div className="variant-picker-header">
              <div>
                <h2>{selectedProduct.name}</h2>
                <p>اختر اللون والمقاس والمخزن المطلوب لطلب الأونلاين</p>
              </div>
              <button
                type="button"
                className="sheet-close"
                onClick={() => setSelectedProduct(null)}
              >
                <LuX />
              </button>
            </div>
            <div className="variant-picker-list">
              {selectedProduct.rows
                .filter((r) => r.quantity > 0)
                .map((row) => (
                  <button
                    type="button"
                    key={`${row.productId}-${row.variantId}-${row.warehouseId}`}
                    onClick={() => {
                      addToCart(row);
                      setSelectedProduct(null);
                    }}
                  >
                    <strong>
                      {row.color || "بدون لون"} · {row.size ? `مقاس ${row.size}` : "بدون مقاس"}
                    </strong>
                    <span>{row.warehouse}</span>
                    <small>متاح {row.quantity}</small>
                  </button>
                ))}
            </div>
          </section>
        </div>
      )}

      {/* Admin Confirm Order Modal */}
      {confirmOrderTarget && (
        <div
          className="online-slip-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setConfirmOrderTarget(null);
          }}
        >
          <div className="online-confirm-dialog">
            <h3>تأكيد وخروج أوردر أونلاين #{confirmOrderTarget.orderNumber}</h3>
            <p style={{ margin: "4px 0 12px", color: "#666" }}>
              العميل: <strong>{confirmOrderTarget.customerName}</strong> ({confirmOrderTarget.customerPhone})
            </p>
            <p style={{ margin: "4px 0 12px", color: "#785038", fontWeight: 700 }}>
              المبلغ المطلوب تحصيله: {money(confirmOrderTarget.totalPiasters)}
            </p>

            <div className="online-confirm-notice">
              <strong>ماذا يحدث عند التأكيد الآن؟</strong>
              <ul style={{ margin: "8px 0 0", paddingRight: "20px" }}>
                <li>سيتم فحص المخزون وخصم كميات المنتجات فعلياً.</li>
                <li>سيتم إنشاء فاتورة مبيعات معتمدة برقم رسمي.</li>
                <li>ستُدرج المبيعات والأرباح فوراً في لوحة التحكم وتقارير المبيعات.</li>
              </ul>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="secondary"
                onClick={() => setConfirmOrderTarget(null)}
                disabled={actionBusy}
              >
                تراجع
              </button>
              <button
                type="button"
                className="primary"
                style={{ background: "#2e7d32", borderColor: "#2e7d32" }}
                onClick={() => void handleConfirmOrder()}
                disabled={actionBusy}
              >
                {actionBusy ? "جارٍ التأكيد والخصم…" : "✓ نعم، تأكيد وخروج الأوردر الآن"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelOrderTarget && (
        <div
          className="online-slip-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setCancelOrderTarget(null);
          }}
        >
          <div className="online-confirm-dialog">
            <h3 style={{ color: "#b94d3f" }}>إلغاء أوردر أونلاين #{cancelOrderTarget.orderNumber}</h3>
            <p style={{ margin: "10px 0 16px", color: "#555" }}>
              هل أنت متأكد من إلغاء هذا الطلب؟ لن يتم خصم أي كميات من المخزون ولن تتأثر أي حسابات.
            </p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="secondary"
                onClick={() => setCancelOrderTarget(null)}
                disabled={actionBusy}
              >
                تراجع
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => void handleCancelOrder()}
                disabled={actionBusy}
              >
                {actionBusy ? "جارٍ الإلغاء…" : "تأكيد إلغاء الطلب"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shipping Slip & Order Details Modal */}
      {viewSlipOrder && (
        <div
          className="online-slip-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setViewSlipOrder(null);
          }}
        >
          <div className="online-slip-modal" data-print-document="online-slip">
            <div className="online-slip-header">
              <span className="eyebrow">MORSI FOR BELT</span>
              <h2>بوليصة شحن وتوصيل طلب أونلاين</h2>
              <p>طلب رقم #{viewSlipOrder.order.orderNumber}</p>
            </div>

            <div className="online-slip-info-grid">
              <div className="online-slip-info-item">
                <span>تاريخ ووقت الطلب:</span>
                <strong>{formatDateTime(viewSlipOrder.order.createdAt)}</strong>
              </div>
              <div className="online-slip-info-item">
                <span>حالة الطلب:</span>
                <strong>
                  {viewSlipOrder.order.status === "PENDING"
                    ? "⏳ قيد الانتظار"
                    : viewSlipOrder.order.status === "CONFIRMED"
                    ? `✅ معتمد (فاتورة #${viewSlipOrder.order.invoiceNumber})`
                    : "🚫 ملغي"}
                </strong>
              </div>
              <div className="online-slip-info-item">
                <span>اسم العميل المستلم:</span>
                <strong>{viewSlipOrder.order.customerName}</strong>
              </div>
              <div className="online-slip-info-item">
                <span>رقم هاتف العميل:</span>
                <strong style={{ direction: "ltr", textAlign: "right" }}>
                  {viewSlipOrder.order.customerPhone}
                </strong>
              </div>
              <div className="online-slip-info-item" style={{ gridColumn: "span 2" }}>
                <span>عنوان التوصيل:</span>
                <strong>{viewSlipOrder.order.customerAddress || "لم يُحدد"}</strong>
              </div>
              {viewSlipOrder.order.depositPiasters > 0 && (
                <div className="online-slip-info-item">
                  <span>العربون المدفوع مسبقاً:</span>
                  <strong style={{ color: "#256d32" }}>{money(viewSlipOrder.order.depositPiasters)}</strong>
                </div>
              )}
              {viewSlipOrder.order.notes && (
                <div className="online-slip-info-item" style={{ gridColumn: viewSlipOrder.order.depositPiasters > 0 ? "auto" : "span 2" }}>
                  <span>ملاحظات الشحن:</span>
                  <strong>{viewSlipOrder.order.notes}</strong>
                </div>
              )}
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>الصنف</th>
                    <th>اللون / المقاس</th>
                    <th>المخزن</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                    <th>الخصم</th>
                    <th>الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {viewSlipOrder.items.map((item) => (
                    <tr key={item.id}>
                      <td><strong>{item.nameSnapshot}</strong></td>
                      <td>{item.color || "—"} / {item.size || "—"}</td>
                      <td>{item.warehouseName}</td>
                      <td><strong>{item.quantity}</strong></td>
                      <td>{money(item.sellPricePiasters)}</td>
                      <td>{item.discountEachPiasters > 0 ? money(item.discountEachPiasters) : "—"}</td>
                      <td><strong>{money(item.lineTotalPiasters)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="online-slip-total-box">
              <div>
                <span style={{ display: "block", fontSize: "12px", color: "#666" }}>
                  إجمالي المنتجات: {money(viewSlipOrder.order.subtotalPiasters - viewSlipOrder.order.discountPiasters)} | مصاريف الشحن: {money(viewSlipOrder.order.shippingFeePiasters)}
                  {viewSlipOrder.order.depositPiasters > 0 && (
                    <span> | العربون: {money(viewSlipOrder.order.depositPiasters)}</span>
                  )}
                </span>
                <span style={{ fontSize: "14px", fontWeight: 700 }}>
                  المبلغ المطلوب تحصيله عند الاستلام:
                </span>
              </div>
              <strong>{money(Math.max(0, viewSlipOrder.order.totalPiasters - (viewSlipOrder.order.depositPiasters || 0)))}</strong>
            </div>

            <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between", gap: "10px" }} className="print-hide">
              <button
                type="button"
                className="secondary"
                onClick={() => setViewSlipOrder(null)}
              >
                إغلاق
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => void printDocumentFromPage("online-slip", "بوليصة الشحن")}
              >
                <LuPrinter style={{ marginLeft: "6px" }} /> طباعة البوليصة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== BACKUP & RESTORE COMPONENT ====================

type BackupItem = {
  fileName: string;
  filePath: string;
  sizeBytes: number;
  sizeFormatted: string;
  createdAt: string;
  backupType: string;
  note: string | null;
};

type BackupOverview = {
  backups: BackupItem[];
  backupDir: string;
  databasePath: string;
  databaseSizeBytes: number;
  databaseSizeFormatted: string;
  totalBackupsSizeBytes: number;
  totalBackupsSizeFormatted: string;
  lastBackupTime: string | null;
  autoBackupEnabled: boolean;
  autoBackupTime: string;
  autoBackupRetention: number;
};

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function downloadBase64File(base64Data: string, fileName: string) {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "application/x-sqlite3" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const BACKUP_FILTER_OPTIONS: SelectOption[] = [
  { value: "ALL", label: "جميع أنواع النسخ" },
  { value: "MANUAL", label: "👤 نسخ يدوية" },
  { value: "AUTO", label: "🤖 نسخ تلقائية يومية" },
  { value: "SAFETY", label: "🛡️ لقطات أمان قبل الاستعادة" },
  { value: "IMPORTED", label: "📥 نسخ مستوردة" },
  { value: "MIGRATION", label: "⚙️ نسخ قبل التحديث" },
];

function BackupManagement({
  session,
  setNotice,
  setError,
}: {
  session: Session;
  setNotice: (msg: string) => void;
  setError: (msg: string) => void;
}) {
  const [overview, setOverview] = useState<BackupOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [backupNote, setBackupNote] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [autoTime, setAutoTime] = useState("23:30");
  const [autoRetention, setAutoRetention] = useState(30);

  // Restore Modal
  const [restoreModalItem, setRestoreModalItem] = useState<BackupItem | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreSuccessMsg, setRestoreSuccessMsg] = useState("");

  // Factory Reset Modal
  const [factoryResetOpen, setFactoryResetOpen] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [saveSafetyBackup, setSaveSafetyBackup] = useState(true);
  const [clearAllBackups, setClearAllBackups] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState("");
  const [resetErrorMsg, setResetErrorMsg] = useState("");

  // External Import State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importNote, setImportNote] = useState("");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filters
  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      const data = await invoke<BackupOverview>("get_backup_overview", { token: session.token });
      setOverview(data);
      setAutoEnabled(data.autoBackupEnabled);
      setAutoTime(data.autoBackupTime);
      setAutoRetention(data.autoBackupRetention);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [session.token, setError]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  async function handleCreateBackup(e: FormEvent) {
    e.preventDefault();
    if (creating) return;
    try {
      setCreating(true);
      setError("");
      const item = await invoke<BackupItem>("create_backup", {
        token: session.token,
        note: backupNote.trim() ? backupNote.trim() : null,
      });
      setBackupNote("");
      setNotice(`✅ تم إنشاء النسخة الاحتياطية بنجاح (${item.fileName})`);
      await loadOverview();
    } catch (err) {
      setError(String(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault();
    if (savingSettings) return;
    try {
      setSavingSettings(true);
      setError("");
      const res = await invoke<string>("save_backup_settings", {
        token: session.token,
        autoBackupEnabled: autoEnabled,
        autoBackupTime: autoTime,
        autoBackupRetention: Number(autoRetention) || 30,
      });
      setNotice(res);
      await loadOverview();
    } catch (err) {
      setError(String(err));
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleOpenDirectory() {
    try {
      await invoke<string>("open_backups_directory", { token: session.token });
      setNotice("تم فتح مجلد النسخ الاحتياطية على جهازك 📂");
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleExport(fileName: string) {
    try {
      setNotice(`جارٍ تصدير وتحميل النسخة ${fileName}...`);
      const base64Data = await invoke<string>("export_backup_file", {
        token: session.token,
        fileName,
      });
      downloadBase64File(base64Data, fileName);
      setNotice(`✅ تم تحميل ملف النسخة الاحتياطية (${fileName}) بنجاح.`);
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleDelete(fileName: string) {
    if (!window.confirm(`هل أنت متأكد من حذف النسخة الاحتياطية "${fileName}" نهائياً من القرص؟`)) {
      return;
    }
    try {
      const res = await invoke<string>("delete_backup", {
        token: session.token,
        fileName,
      });
      setNotice(res);
      await loadOverview();
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleImport(e: FormEvent) {
    e.preventDefault();
    if (!selectedFile || importing) return;
    try {
      setImporting(true);
      setError("");
      const b64 = await fileToBase64(selectedFile);
      const res = await invoke<BackupItem>("import_external_backup", {
        token: session.token,
        fileName: selectedFile.name,
        fileBytesBase64: b64,
        note: importNote.trim() ? importNote.trim() : null,
      });
      setSelectedFile(null);
      setImportNote("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice(`✅ تم استيراد النسخة الاحتياطية بنجاح (${res.fileName})`);
      await loadOverview();
    } catch (err) {
      setError(String(err));
    } finally {
      setImporting(false);
    }
  }

  async function handleExecuteRestore() {
    if (!restoreModalItem || restoring) return;
    try {
      setRestoring(true);
      setError("");
      const res = await invoke<string>("restore_backup", {
        token: session.token,
        fileName: restoreModalItem.fileName,
      });
      setRestoreSuccessMsg(res);
    } catch (err) {
      setError(String(err));
      setRestoring(false);
    }
  }

  async function handleExecuteFactoryReset() {
    if (confirmPhrase.trim() !== "فورمات شامل") {
      setResetErrorMsg("يرجى كتابة كلمة التأكيد \"فورمات شامل\" بدقة للمتابعة");
      return;
    }
    if (!adminPassword.trim()) {
      setResetErrorMsg("يرجى إدخال كلمة مرور حساب المدير (Admin)");
      return;
    }
    try {
      setResetting(true);
      setResetErrorMsg("");
      const res = await invoke<string>("factory_reset_system", {
        token: session.token,
        password: adminPassword,
        createSafetyBackup: saveSafetyBackup,
        clearBackups: clearAllBackups,
      });
      localStorage.clear();
      sessionStorage.clear();
      setResetSuccessMsg(res);
    } catch (err) {
      setResetErrorMsg(String(err));
      setResetting(false);
    }
  }

  const filteredBackups = useMemo(() => {
    if (!overview) return [];
    return overview.backups.filter((item) => {
      if (filterType !== "ALL" && item.backupType !== filterType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = normalizeArabic(searchQuery.trim().toLowerCase());
        const matchName = normalizeArabic(item.fileName.toLowerCase()).includes(q);
        const matchNote = item.note ? normalizeArabic(item.note.toLowerCase()).includes(q) : false;
        const matchDate = item.createdAt.includes(q);
        return matchName || matchNote || matchDate;
      }
      return true;
    });
  }, [overview, filterType, searchQuery]);

  function getBackupTypeBadge(type: string) {
    switch (type) {
      case "MANUAL":
        return <span className="backup-badge badge-manual">👤 يدوية</span>;
      case "AUTO":
        return <span className="backup-badge badge-auto">🤖 تلقائية يومية</span>;
      case "SAFETY":
        return <span className="backup-badge badge-safety">🛡️ أمان قبل الاستعادة</span>;
      case "IMPORTED":
        return <span className="backup-badge badge-imported">📥 مستوردة</span>;
      case "MIGRATION":
        return <span className="backup-badge badge-migration">⚙️ قبل التحديث</span>;
      default:
        return <span className="backup-badge badge-custom">{type}</span>;
    }
  }

  return (
    <section className="panel backup-page-container">
      {/* Overview Stat Cards */}
      <div className="backup-stats-grid">
        <div className="backup-stat-card">
          <div className="backup-stat-icon gold">
            <LuShieldCheck />
          </div>
          <div className="backup-stat-content">
            <span className="backup-stat-label">حالة النسخ الاحتياطي</span>
            <strong className="backup-stat-value">
              {overview?.lastBackupTime ? "بياناتك محمية بالكامل ✅" : "لا توجد نسخ سابقة ⚠️"}
            </strong>
            <small className="backup-stat-sub">
              {overview?.lastBackupTime
                ? `آخر نسخة: ${overview.lastBackupTime}`
                : "يرجى إنشاء نسخة احتياطية أولى الآن"}
            </small>
          </div>
        </div>

        <div className="backup-stat-card">
          <div className="backup-stat-icon blue">
            <LuHardDrive />
          </div>
          <div className="backup-stat-content">
            <span className="backup-stat-label">حجم قاعدة البيانات الحالية</span>
            <strong className="backup-stat-value">{overview?.databaseSizeFormatted || "—"}</strong>
            <small className="backup-stat-sub" title={overview?.databasePath}>
              قاعدة البيانات النشطة: cashier.sqlite
            </small>
          </div>
        </div>

        <div className="backup-stat-card">
          <div className="backup-stat-icon green">
            <LuDatabaseBackup />
          </div>
          <div className="backup-stat-content">
            <span className="backup-stat-label">النسخ المحفوظة على القرص</span>
            <strong className="backup-stat-value">
              {overview?.backups.length || 0} نسخ احتياطية
            </strong>
            <small className="backup-stat-sub">
              إجمالي المساحة: {overview?.totalBackupsSizeFormatted || "0 B"}
            </small>
          </div>
        </div>

        <div className="backup-stat-card">
          <div className="backup-stat-icon brown">
            <LuFolderOpen />
          </div>
          <div className="backup-stat-content">
            <span className="backup-stat-label">مجلد الحفظ في الجهاز</span>
            <button
              type="button"
              className="primary"
              style={{ marginTop: "4px", padding: "6px 12px", fontSize: "13px" }}
              onClick={handleOpenDirectory}
              title="فتح المجلد في مستكشف الملفات"
            >
              فتح مجلد النسخ 📂
            </button>
            <small className="backup-stat-sub" style={{ marginTop: "4px" }}>
              لنسخ الملفات لفلاشة USB أو سحابة
            </small>
          </div>
        </div>
      </div>

      {/* Action Panels (3 Columns) */}
      <div className="backup-actions-grid">
        {/* Panel 1: Instant Backup */}
        <div className="backup-action-card">
          <div className="backup-card-header">
            <h3>💾 إنشاء نسخة احتياطية فورية الآن</h3>
            <p>أخذ نسخة كاملة ومطابقة 100% من قاعدة البيانات الحالية في ثوانٍ</p>
          </div>
          <form onSubmit={handleCreateBackup} className="backup-card-form">
            <label>
              ملاحظة توضيحية للنسخة (اختياري):
              <input
                type="text"
                placeholder="مثال: قبل الجرد السنوي، قبل التحديث، نهاية الأسبوع..."
                value={backupNote}
                onChange={(e) => setBackupNote(e.target.value)}
                disabled={creating}
              />
            </label>
            <button
              type="submit"
              className="primary full"
              disabled={creating}
              style={{ padding: "10px", fontSize: "14px", fontWeight: 700 }}
            >
              {creating ? "جارٍ إنشاء النسخة بأمان..." : "💾 إنشاء نسخة احتياطية الآن"}
            </button>
          </form>
        </div>

        {/* Panel 2: Daily Auto-Backup Settings */}
        <div className="backup-action-card">
          <div className="backup-card-header">
            <h3>🤖 النسخ الاحتياطي التلقائي اليومي</h3>
            <p>جدولة نسخ احتياطي تلقائي كل يوم مع تنظيف النسخ القديمة لعدم ملء القرص</p>
          </div>
          <form onSubmit={handleSaveSettings} className="backup-card-form">
            <div className="backup-checkbox-row" style={{ marginBottom: "8px" }}>
              <label
                className="checkbox-label"
                style={{
                  display: "inline-flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                  margin: 0,
                }}
              >
                <input
                  type="checkbox"
                  checked={autoEnabled}
                  onChange={(e) => setAutoEnabled(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer", margin: 0 }}
                />
                <span style={{ fontWeight: 700, fontSize: "13px" }}>تفعيل النسخ اليومي التلقائي</span>
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <label>
                وقت النسخ اليومي:
                <input
                  type="time"
                  dir="ltr"
                  style={{ direction: "ltr", textAlign: "center" }}
                  value={autoTime}
                  onChange={(e) => setAutoTime(e.target.value)}
                  disabled={!autoEnabled}
                  required
                />
              </label>

              <label>
                الاحتفاظ بآخر (يوماً):
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={autoRetention}
                  onChange={(e) => setAutoRetention(Number(e.target.value))}
                  disabled={!autoEnabled}
                  required
                />
              </label>
            </div>

            <button
              type="submit"
              className="secondary full"
              disabled={savingSettings}
              style={{ marginTop: "8px", padding: "10px" }}
            >
              {savingSettings ? "جارٍ الحفظ..." : "⚙️ حفظ إعدادات النسخ التلقائي"}
            </button>
          </form>
        </div>

        {/* Panel 3: Import External Backup */}
        <div className="backup-action-card">
          <div className="backup-card-header">
            <h3>📥 استيراد نسخة من ملف خارجي</h3>
            <p>استيراد ملف (.sqlite أو .db) من فلاشة USB أو جهاز آخر لإدراجه في القائمة</p>
          </div>
          <form onSubmit={handleImport} className="backup-card-form">
            <label>
              اختر ملف النسخة الاحتياطية (.sqlite / .db):
              <input
                ref={fileInputRef}
                type="file"
                accept=".sqlite,.db"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  } else {
                    setSelectedFile(null);
                  }
                }}
                disabled={importing}
              />
            </label>

            {selectedFile && (
              <div style={{ fontSize: "12px", color: "#2e7d32", margin: "4px 0" }}>
                ✓ تم تحديد الملف: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(0)} KB)
              </div>
            )}

            <label>
              ملاحظة على الملف المستورد (اختياري):
              <input
                type="text"
                placeholder="مثال: نسخة من لابتوب المحل القديم..."
                value={importNote}
                onChange={(e) => setImportNote(e.target.value)}
                disabled={importing || !selectedFile}
              />
            </label>

            <button
              type="submit"
              className="secondary full"
              disabled={importing || !selectedFile}
              style={{ padding: "10px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
            >
              <LuUpload /> {importing ? "جارٍ التحقق والاستيراد..." : "حفظ الملف في سجل النسخ"}
            </button>
          </form>
        </div>
      </div>

      {/* Backups Table Section */}
      <div className="backup-table-section">
        <div className="backup-table-toolbar">
          <div className="backup-table-title">
            <h2>سجل ومحفوظات النسخ الاحتياطية ({filteredBackups.length})</h2>
            <p>يمكنك تحميل أي نسخة لجهازك، أو استعادتها بأمان كامل مع أخذ لقطة أمان تلقائية</p>
          </div>

          <div className="backup-table-filters">
            <input
              type="search"
              placeholder="بحث في اسم النسخة، الملاحظة، أو التاريخ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="backup-search-input"
            />

            <div className="backup-filter-select-wrap">
              <BrandSelect
                label="نوع النسخة"
                value={filterType}
                onValueChange={(val) => setFilterType(val || "ALL")}
                placeholder="جميع أنواع النسخ"
                options={BACKUP_FILTER_OPTIONS}
              />
            </div>

            <button
              type="button"
              className="secondary backup-refresh-btn"
              onClick={() => void loadOverview()}
              disabled={loading}
              title="تحديث القائمة"
            >
              <LuRefreshCw className={loading ? "spin-icon" : ""} />
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table className="backup-table">
            <thead>
              <tr>
                <th>نوع النسخة</th>
                <th>اسم ملف النسخة</th>
                <th>تاريخ الإنشاء</th>
                <th>الحجم</th>
                <th>الملاحظة والوصف</th>
                <th style={{ textAlign: "center" }}>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredBackups.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "30px", color: "#888" }}>
                    {loading ? "جارٍ تحميل سجل النسخ الاحتياطية..." : "لا توجد نسخ احتياطية مطابقة للبحث أو الفلتر."}
                  </td>
                </tr>
              ) : (
                filteredBackups.map((item) => (
                  <tr key={item.fileName}>
                    <td>{getBackupTypeBadge(item.backupType)}</td>
                    <td>
                      <code className="backup-filename" title={item.filePath}>
                        {item.fileName}
                      </code>
                    </td>
                    <td style={{ whiteSpace: "nowrap", direction: "ltr", textAlign: "right" }}>
                      {item.createdAt}
                    </td>
                    <td style={{ fontWeight: 700, color: "#444" }}>{item.sizeFormatted}</td>
                    <td style={{ color: "#555" }}>{item.note || "—"}</td>
                    <td>
                      <div className="backup-row-actions">
                        <button
                          type="button"
                          className="secondary small"
                          onClick={() => void handleExport(item.fileName)}
                          title="تحميل وتصدير النسخة إلى الجهاز أو الفلاشة"
                        >
                          <LuDownload /> تحميل
                        </button>
                        <button
                          type="button"
                          className="danger small"
                          onClick={() => setRestoreModalItem(item)}
                          title="استعادة قاعدة البيانات من هذه النسخة الاحتياطية"
                          style={{ fontWeight: 700 }}
                        >
                          <LuRotateCcw /> استعادة
                        </button>
                        <button
                          type="button"
                          className="danger-subtle small"
                          onClick={() => void handleDelete(item.fileName)}
                          title="حذف هذه النسخة من القرص"
                        >
                          <LuTrash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Danger Zone: Factory Reset (Admin Only) */}
      {session.role === "ADMIN" && (
        <div className="backup-danger-zone">
          <div className="backup-danger-card">
            <div className="backup-danger-content">
              <div className="backup-danger-icon">
                <LuTriangleAlert />
              </div>
              <div className="backup-danger-text">
                <div className="backup-danger-tag">منطقة الخطر الشديد • إجراء لا يمكن الرجوع عنه</div>
                <h3>إعادة ضبط المصنع وفورمات كامل للنظام (Factory Reset)</h3>
                <p>
                  مسح شامل لجميع البيانات (المنتجات، المخازن، الفواتير، العملاء، الموردين، والموظفين) وإعادة النظام كما ولدته أمه إلى وضع التثبيت الأول تماماً.
                </p>
              </div>
            </div>
            <div className="backup-danger-action">
              <button
                type="button"
                className="danger factory-reset-btn"
                onClick={() => {
                  setConfirmPhrase("");
                  setAdminPassword("");
                  setSaveSafetyBackup(true);
                  setClearAllBackups(false);
                  setResetErrorMsg("");
                  setResetSuccessMsg("");
                  setFactoryResetOpen(true);
                }}
              >
                <LuTrash2 /> فورمات كامل للسيستم وضبط المصنع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safety Restore Modal */}
      {restoreModalItem && (
        <div className="backup-restore-overlay" onClick={() => !restoring && setRestoreModalItem(null)}>
          <div className="backup-restore-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="backup-restore-header">
              <div className="restore-alert-badge">⚠️ تحذير أمني</div>
              <h2>تأكيد استعادة النسخة الاحتياطية</h2>
              <p>يرجى قراءة التعليمات بعناية قبل المتابعة</p>
            </div>

            <div className="backup-restore-details">
              <div className="restore-detail-row">
                <span>اسم ملف النسخة:</span>
                <strong>{restoreModalItem.fileName}</strong>
              </div>
              <div className="restore-detail-row">
                <span>تاريخ النسخة:</span>
                <strong>{restoreModalItem.createdAt}</strong>
              </div>
              <div className="restore-detail-row">
                <span>حجم الملف:</span>
                <strong>{restoreModalItem.sizeFormatted}</strong>
              </div>
              {restoreModalItem.note && (
                <div className="restore-detail-row">
                  <span>الملاحظة:</span>
                  <strong>{restoreModalItem.note}</strong>
                </div>
              )}
            </div>

            <div className="restore-safety-box">
              <div className="safety-title">
                <LuShieldCheck style={{ fontSize: "18px", color: "#2e7d32" }} />
                <strong>حماية البيانات بنسبة 100% (Safety Snapshot):</strong>
              </div>
              <p>
                لا داعي للقلق؛ سيقوم النظام <strong>تلقائياً وفوراً</strong> بإنشاء نسخة أمان من قاعدة البيانات
                الحالية قبل البدء في استبدال البيانات، حتى لا تفقد أي حركة بيع أو بيانات سابقة بالخطأ.
              </p>
              <p style={{ marginTop: "6px", color: "#854d0e" }}>
                🔄 فور اكتمال الاستعادة، سيتم <strong>إعادة تشغيل البرنامج تلقائياً</strong> لتحميل البيانات المستعادة بالكامل.
              </p>
            </div>

            {restoreSuccessMsg && (
              <div className="message success" role="status" style={{ margin: "14px 0" }}>
                {restoreSuccessMsg}
              </div>
            )}

            <div className="backup-restore-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setRestoreModalItem(null)}
                disabled={restoring}
              >
                إلغاء والتراجع
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => void handleExecuteRestore()}
                disabled={restoring}
                style={{ padding: "10px 20px", fontWeight: 700 }}
              >
                {restoring ? "جارٍ أخذ لقطة الأمان واستعادة البيانات... ⏳" : "تأكيد واستعادة هذه النسخة الآن ⚠️"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Factory Reset Modal */}
      {factoryResetOpen && (
        <div className="backup-restore-overlay" onClick={() => !resetting && setFactoryResetOpen(false)}>
          <div className="backup-restore-dialog factory-reset-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="backup-restore-header factory-reset-header">
              <div className="restore-alert-badge factory-reset-badge">
                <LuTriangleAlert /> تحذير شديد الخطورة • مسح شامل
              </div>
              <h2>فورمات كامل وإعادة ضبط المصنع للنظام</h2>
              <p>هذا الإجراء سيقوم بإرجاع السيستم تماماً كأول يوم تم تثبيته فيه ("كما ولدته أمه")</p>
            </div>

            <div className="factory-reset-consequences">
              <h4>⚠️ ماذا سيحدث عند تنفيذ هذه العملية؟</h4>
              <ul>
                <li>🗑️ <strong>مسح كافة المنتجات والأصناف:</strong> الباركودات، المقاسات، الألوان، وأرصدة المخازن بالكامل.</li>
                <li>🧾 <strong>مسح سجل المبيعات والفواتير:</strong> جميع الفواتير الصادرة، المرتجعات، وطلبات الأونلاين وتقارير الجرد.</li>
                <li>👥 <strong>مسح حسابات العملاء والموردين:</strong> كشوف الحسابات السابقة، المديونيات، وسجلات التحصيل والدفع.</li>
                <li>👔 <strong>مسح الموظفين وسجلات العمل:</strong> الحضور والانصراف، السلف، المكافآت، الخصومات، والرواتب.</li>
                <li>🔄 <strong>تسجيل الخروج وإعادة التشغيل:</strong> سيتم إغلاق التطبيق وإعادة فتحه على شاشة تهيئة النظام الأولى لإنشاء حساب المدير الجديد من الصفر.</li>
              </ul>
            </div>

            <div className="factory-reset-options">
              <label className="checkbox-label reset-option-label">
                <input
                  type="checkbox"
                  checked={saveSafetyBackup}
                  onChange={(e) => setSaveSafetyBackup(e.target.checked)}
                  disabled={resetting}
                />
                <div>
                  <strong>🛡️ أخذ نسخة أمان تلقائية (Safety Backup) قبل المسح (موصى به بشدة)</strong>
                  <span>حفظ نسخة كاملة من بياناتك الحالية داخل مجلد النسخ الاحتياطية على جهازك للرجوع إليها في أي وقت مستقبلاً.</span>
                </div>
              </label>

              <label className="checkbox-label reset-option-label reset-option-danger">
                <input
                  type="checkbox"
                  checked={clearAllBackups}
                  onChange={(e) => setClearAllBackups(e.target.checked)}
                  disabled={resetting}
                />
                <div>
                  <strong>🗑️ مسح مجلد النسخ الاحتياطية السابقة أيضاً من القرص</strong>
                  <span>حذف كافة ملفات النسخ المحفوظة على جهازك نهائياً (تنظيف 100% للجهاز في حال رغبتك ببيعه أو نقله).</span>
                </div>
              </label>
            </div>

            <div className="factory-reset-inputs">
              <label>
                <span>1. اكتب عبارة <code className="confirm-keyword">فورمات شامل</code> في المربع أدناه للمتابعة:</span>
                <input
                  type="text"
                  placeholder="اكتب هنا: فورمات شامل"
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  disabled={resetting}
                  className="reset-confirm-input"
                  dir="rtl"
                />
              </label>

              <label>
                <span>2. أدخل كلمة مرور حساب المدير (Admin) لتأكيد هويتك وأمان العملية:</span>
                <input
                  type="password"
                  placeholder="كلمة مرور المدير الحالية..."
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={resetting}
                  className="reset-password-input"
                  dir="ltr"
                />
              </label>
            </div>

            {resetErrorMsg && (
              <div className="message error" role="alert" style={{ margin: "10px 0" }}>
                ❌ {resetErrorMsg}
              </div>
            )}

            {resetSuccessMsg && (
              <div className="message success" role="status" style={{ margin: "10px 0" }}>
                ✅ {resetSuccessMsg}
              </div>
            )}

            <div className="backup-restore-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setFactoryResetOpen(false)}
                disabled={resetting}
              >
                إلغاء والتراجع بأمان
              </button>
              <button
                type="button"
                className="danger factory-reset-confirm-btn"
                onClick={() => void handleExecuteFactoryReset()}
                disabled={resetting || confirmPhrase.trim() !== "فورمات شامل" || !adminPassword.trim()}
              >
                {resetting ? "جارٍ المسح وإعادة ضبط المصنع... ⏳" : "💥 تأكيد المسح وفورمات النظام بالكامل"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

