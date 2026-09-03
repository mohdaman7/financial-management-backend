# 📘 Frontend Developer Integration Guide (A to Z): Backend FIFO Financial Engine Migration

**Application:** Skyfall ERP & CRM  
**Module:** Financial Accounting, FIFO Credit Allocation, Customer Ledger & Dashboard Engine  
**Backend API Version:** `v1`  
**Base URL (Production / Render):** `https://skyfall-financial-backend.onrender.com/api/v1`  
**Base URL (Local Development):** `http://localhost:5000/api/v1`  

---

## 📑 Table of Contents
1. [Executive Summary: Why the Frontend Solver Is Deprecated](#1-executive-summary-why-the-frontend-solver-is-deprecated)
2. [Authentication & Multi-Tenancy Headers](#2-authentication--multi-tenancy-headers)
3. [Complete 7-API Endpoints Reference](#3-complete-7-api-endpoints-reference)
   - [API 1: `GET /invoices` (Enhanced)](#api-1-get-api-v1-invoices)
   - [API 2: `GET /invoices/outstanding` (NEW)](#api-2-get-api-v1-invoices-outstanding)
   - [API 3: `GET /receipts` (Enhanced)](#api-3-get-api-v1-receipts)
   - [API 4: `GET /customers/:id/financial-summary` (Enhanced)](#api-4-get-api-v1-customers-id-financial-summary)
   - [API 5: `GET /customers/:id/ledger` (Enhanced)](#api-5-get-api-v1-customers-id-ledger)
   - [API 6: `GET /finance/advance-payments` (Enhanced)](#api-6-get-api-v1-finance-advance-payments)
   - [API 7: `GET /dashboard/financial-summary` (NEW)](#api-7-get-api-v1-dashboard-financial-summary)
   - [Bonus API: `POST /customers/:id/allocate-credit`](#bonus-api-post-api-v1-customers-id-allocate-credit)
4. [Complete TypeScript Type Definitions](#4-complete-typescript-type-definitions)
5. [Drop-In Frontend API Service (`financialApi.ts`)](#5-drop-in-frontend-api-service-financialapits)
6. [Component-by-Component Migration Guide](#6-component-by-component-migration-guide)
7. [UI Invariants, Status Badges & Edge Cases](#7-ui-invariants-status-badges--edge-cases)

---

## 1. 📌 Executive Summary: Why the Frontend Solver Is Deprecated

Previously, the frontend ran a client-side solver (`financial-solver.ts`) that fetched raw invoices and receipts, sorted them, and calculated paid amounts, overdue statuses, advance credit, and running ledger balances in the browser.

### 🚫 Why Client-Side Solving Failed:
- **Pagination Inconsistencies:** If invoices were paginated, older unallocated receipts were missed, resulting in inaccurate balances.
- **Invoice Creation Deposits Desync:** When an invoice was created with an advance deposit (`advance_paid: 300`), the frontend solver had to guess if receipts overlapped.
- **Performance Drift:** As transactions grew, sorting and looping on every keystroke slowed down the UI.

### ✅ What Changed:
The backend is now the **single source of truth**. All financial calculations, credit allocations, running ledger continuous arithmetic, overdue days calculations, and dashboard aggregations are computed server-side with deterministic banker's 2-decimal precision (`CurrencyPrecision`).

> [!IMPORTANT]
> **Action Required:** Remove or deprecate imports of `financial-solver.ts` in the frontend and replace them with the 7 backend API endpoints below.

---

## 2. 🔐 Authentication & Multi-Tenancy Headers

All API requests require the following HTTP headers:

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
x-company-id: <COMPANY_ID>
Content-Type: application/json
```

---

## 3. 📋 Complete 7-API Endpoints Reference

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                 API ENDPOINT DIRECTORY                                   │
├────┬────────────────────────────────────────┬────────┬───────────────────────────────────┤
│ #  │ Endpoint Path                          │ Method │ Purpose                           │
├────┼────────────────────────────────────────┼────────┼───────────────────────────────────┤
│ 1  │ /api/v1/invoices                       │ GET    │ Invoices with paid/remaining/stat │
│ 2  │ /api/v1/invoices/outstanding           │ GET    │ Overdue & Due Soon invoices       │
│ 3  │ /api/v1/receipts                       │ GET    │ Receipts with applied/advance     │
│ 4  │ /api/v1/customers/:id/financial-summary│ GET    │ Customer KPI metrics & balances   │
│ 5  │ /api/v1/customers/:id/ledger           │ GET    │ Chronological running ledger      │
│ 6  │ /api/v1/finance/advance-payments       │ GET    │ Advance payment tracking & FIFO   │
│ 7  │ /api/v1/dashboard/financial-summary    │ GET    │ Global dashboard financial KPIs   │
└────┴────────────────────────────────────────┴────────┴───────────────────────────────────┘
```

---

### API 1: `GET /api/v1/invoices`
**Purpose:** Fetch the list of invoices. The backend pre-computes `advance_paid`, `paid`, `remaining`, `total`, and `status`.

#### Request Parameters (Query String)
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `page` | `number` | No | Page number (default: `1`) |
| `limit` | `number` | No | Page size (default: `50`) |
| `search` | `string` | No | Filter by invoice number, customer name, passenger |
| `status` | `string` | No | Filter by `Paid`, `Partially Paid`, `Pending`, `Cancelled` |
| `customer_id`| `string` | No | Filter by Customer MongoDB ObjectId |
| `start_date` | `string` | No | ISO Date `YYYY-MM-DD` |
| `end_date` | `string` | No | ISO Date `YYYY-MM-DD` |

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "66d6a8f1b2c3d4e5f6a7b8c9",
      "invoice_number": "SKY-2026-ST9231",
      "customer_id": "66d6a8f1b2c3d4e5f6a7b801",
      "customer_name": "Angad KT",
      "service": "Tajweed Global Investor Visa",
      "issue_date": "2026-09-03",
      "due_date": "2026-09-10",
      "total": 2339.00,
      "grand_total": 2339.00,
      "advance_paid": 300.00,
      "paid": 300.00,
      "remaining": 2039.00,
      "balance_amount": 2039.00,
      "status": "Partially Paid",
      "lead_by": "Ahmed",
      "lead_owner": "Ahmed",
      "items": [
        {
          "description": "Investor Visa Fee",
          "qty": 1,
          "rate": 2227.62,
          "tax": 5,
          "netAmount": 2227.62
        }
      ]
    }
  ],
  "pagination": {
    "total_records": 1,
    "page": 1,
    "limit": 50,
    "total_pages": 1
  }
}
```

---

### API 2: `GET /api/v1/invoices/outstanding`
**Purpose:** Fetch open invoices (`outstanding > 0`). The backend automatically computes `daysOverdue` and assigns `status: "Overdue"` or `status: "Due Soon"`.

#### Request Parameters (Query String)
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `search` | `string` | No | Search by customer name or invoice number |
| `status` | `string` | No | `Overdue` or `Due Soon` |
| `start_date` | `string` | No | Filter by invoice issue date |
| `end_date` | `string` | No | Filter by invoice issue date |

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "invoiceId": "INV-2026-0042",
      "customerName": "Al-Futtaim Group",
      "customerId": "66d6a8f1b2c3d4e5f6a7b802",
      "invoiceDate": "2026-08-01",
      "dueDate": "2026-08-15",
      "totalAmount": 15000.00,
      "paidAmount": 5000.00,
      "outstanding": 10000.00,
      "daysOverdue": 19,
      "status": "Overdue"
    },
    {
      "invoiceId": "SKY-2026-ST9231",
      "customerName": "Angad KT",
      "customerId": "66d6a8f1b2c3d4e5f6a7b801",
      "invoiceDate": "2026-09-03",
      "dueDate": "2026-09-10",
      "totalAmount": 2339.00,
      "paidAmount": 300.00,
      "outstanding": 2039.00,
      "daysOverdue": 0,
      "status": "Due Soon"
    }
  ],
  "summary": {
    "totalOutstanding": 12039.00,
    "totalInvoices": 2,
    "overdueCount": 1
  }
}
```

---

### API 3: `GET /api/v1/receipts`
**Purpose:** Fetch receipts with pre-computed `applied` and `advance` (unallocated credit).

#### Request Parameters (Query String)
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `page` | `number` | No | Page number (default: `1`) |
| `limit` | `number` | No | Page size (default: `50`) |
| `search` | `string` | No | Search reference number or customer name |
| `customer_id`| `string` | No | Filter by Customer MongoDB ObjectId |
| `start_date` | `string` | No | ISO Date `YYYY-MM-DD` |
| `end_date` | `string` | No | ISO Date `YYYY-MM-DD` |

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "66d6a8f1b2c3d4e5f6a7b820",
      "reference_number": "REC-0007",
      "customer_id": "66d6a8f1b2c3d4e5f6a7b801",
      "customer_name": "Angad KT",
      "payment_date": "2026-09-01",
      "payment_mode": "Bank Transfer",
      "amount": 2000.00,
      "applied": 2000.00,
      "advance": 0.00,
      "status": "Received",
      "notes": "Payment for INV-2026-0010"
    },
    {
      "id": "66d6a8f1b2c3d4e5f6a7b821",
      "reference_number": "REC-0008",
      "customer_id": "66d6a8f1b2c3d4e5f6a7b801",
      "customer_name": "Angad KT",
      "payment_date": "2026-09-03",
      "payment_mode": "Cash",
      "amount": 500.00,
      "applied": 0.00,
      "advance": 500.00,
      "status": "Received",
      "notes": "Advance payment deposit"
    }
  ],
  "pagination": {
    "total_records": 2,
    "page": 1,
    "limit": 50,
    "total_pages": 1
  }
}
```

---

### API 4: `GET /api/v1/customers/:id/financial-summary`
**Purpose:** Retrieve the 4 real-time KPI card values for a specific customer. Automatically factors in customer receipts AND any invoice creation advance deposits (`advance_paid`).

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "customerId": "66d6a8f1b2c3d4e5f6a7b801",
    "customerName": "Angad KT",
    "currency": "AED",
    "totalBilledDebit": 2339.00,
    "totalReceivedCredit": 2800.00,
    "outstandingDues": 0.00,
    "remainingAdvanceCredit": 461.00,
    "accountStatus": "SETTLED_AND_CREDIT_AVAILABLE",
    "metricsCount": {
      "totalInvoices": 1,
      "totalReceipts": 2
    },
    "lastTransactionDate": "2026-09-03"
  }
}
```

> **Calculation Explanation:**
> - `totalBilledDebit` = Sum of all invoices (2339.00)
> - `totalReceivedCredit` = Sum of receipts (2000 + 500 = 2500) + invoice creation deposit (`advance_paid`: 300) = **2800.00**
> - `remainingAdvanceCredit` = 2800.00 - 2339.00 = **461.00**
> - `accountStatus` = `SETTLED_AND_CREDIT_AVAILABLE`

---

### API 5: `GET /api/v1/customers/:id/ledger`
**Purpose:** Fetch the customer's chronological statement of account. The backend computes continuous `runningBalance` line-by-line and creates explicit receipt rows for invoice deposits (`DEP-{invoice_number}`).

#### Request Parameters (Query String)
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `startDate` | `string` | No | Filter start date `YYYY-MM-DD` |
| `endDate` | `string` | No | Filter end date `YYYY-MM-DD` |
| `type` | `string` | No | Filter by `'invoice'` or `'receipt'` |
| `page` | `number` | No | Page number |
| `limit` | `number` | No | Page size |

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": [
    {
      "id": "66d6a8f1b2c3d4e5f6a7b8c9",
      "date": "2026-09-03",
      "refNo": "SKY-2026-ST9231",
      "type": "invoice",
      "description": "Tajweed Global Investor Visa",
      "debit": 2339.00,
      "credit": 0.00,
      "runningBalance": 2339.00,
      "status": "partially_paid"
    },
    {
      "id": "dep-66d6a8f1b2c3d4e5f6a7b8c9",
      "date": "2026-09-03",
      "refNo": "DEP-SKY-2026-ST9231",
      "type": "receipt",
      "description": "Advance Deposit — Paid at Invoice Creation (SKY-2026-ST9231)",
      "debit": 0.00,
      "credit": 300.00,
      "runningBalance": 2039.00,
      "status": "received"
    },
    {
      "id": "66d6a8f1b2c3d4e5f6a7b820",
      "date": "2026-09-03",
      "refNo": "REC-0007",
      "type": "receipt",
      "description": "Bank Transfer - Advance Payment",
      "debit": 0.00,
      "credit": 2000.00,
      "runningBalance": 39.00,
      "status": "received"
    },
    {
      "id": "66d6a8f1b2c3d4e5f6a7b821",
      "date": "2026-09-03",
      "refNo": "REC-0008",
      "type": "receipt",
      "description": "Cash - Advance Payment",
      "debit": 0.00,
      "credit": 500.00,
      "runningBalance": -461.00,
      "status": "advance_credit"
    }
  ],
  "summary": {
    "openingBalance": 0.00,
    "totalDebit": 2339.00,
    "totalCredit": 2800.00,
    "closingBalance": -461.00
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "totalRecords": 4,
    "totalPages": 1
  }
}
```

> **Running Balance Note:**
> - `runningBalance > 0` = Customer owes money (Debit balance).
> - `runningBalance < 0` = Customer has advance credit with the company (Credit balance).

---

### API 6: `GET /api/v1/finance/advance-payments`
**Purpose:** Fetch advance payments with server-side FIFO allocation breakdown.

#### Request Parameters (Query String)
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `status` | `string` | No | `unallocated`, `partially_allocated`, `fully_allocated` |
| `search` | `string` | No | Customer name or transaction reference |
| `startDate` | `string` | No | `YYYY-MM-DD` |
| `endDate` | `string` | No | `YYYY-MM-DD` |
| `page` | `number` | No | Page number |
| `limit` | `number` | No | Page size |

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalReceived": 2800.00,
      "allocatedAmount": 2339.00,
      "unallocatedBalance": 461.00,
      "currency": "AED"
    },
    "pagination": {
      "totalRecords": 2,
      "currentPage": 1,
      "totalPages": 1,
      "limit": 50
    },
    "advances": [
      {
        "id": "ADV-01",
        "advanceId": "ADV-01",
        "customerName": "Angad KT",
        "customerId": "66d6a8f1b2c3d4e5f6a7b801",
        "date": "2026-09-01",
        "dateReceived": "2026-09-01",
        "paymentMethod": "Bank Transfer",
        "reference": "REC-0007",
        "referenceTransaction": "REC-0007",
        "amount": 2000.00,
        "totalReceived": 2000.00,
        "allocatedAmount": 2000.00,
        "balance": 0.00,
        "unallocatedBalance": 0.00,
        "status": "Fully Allocated"
      },
      {
        "id": "ADV-02",
        "advanceId": "ADV-02",
        "customerName": "Angad KT",
        "customerId": "66d6a8f1b2c3d4e5f6a7b801",
        "date": "2026-09-03",
        "dateReceived": "2026-09-03",
        "paymentMethod": "Cash",
        "reference": "REC-0008",
        "referenceTransaction": "REC-0008",
        "amount": 500.00,
        "totalReceived": 500.00,
        "allocatedAmount": 39.00,
        "balance": 461.00,
        "unallocatedBalance": 461.00,
        "status": "Partially Allocated"
      }
    ]
  }
}
```

---

### API 7: `GET /api/v1/dashboard/financial-summary`
**Purpose:** Fetch global aggregated financial KPIs across the entire company for the dashboard overview.

#### Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "totalRevenue": 23149.95,
    "totalReceived": 2800.00,
    "outstanding": 20349.95,
    "advanceTotal": 0.00,
    "todaySales": 5767.95,
    "monthSales": 23149.95,
    "paidCount": 1,
    "totalInvoices": 5,
    "avgRevenue": 4629.99,
    "conversionRate": "20.0",
    "chartData": [
      { "day": "Mon", "revenue": 0.00, "bookings": 0.00 },
      { "day": "Tue", "revenue": 0.00, "bookings": 0.00 },
      { "day": "Wed", "revenue": 23149.95, "bookings": 2339.00 },
      { "day": "Thu", "revenue": 0.00, "bookings": 0.00 },
      { "day": "Fri", "revenue": 0.00, "bookings": 0.00 },
      { "day": "Sat", "revenue": 0.00, "bookings": 0.00 },
      { "day": "Sun", "revenue": 0.00, "bookings": 0.00 }
    ],
    "employeeSales": [
      { "name": "Ahmed", "value": 5767.95 },
      { "name": "Sameer", "value": 17382.00 }
    ]
  }
}
```

---

### Bonus API: `POST /api/v1/customers/:id/allocate-credit`
**Purpose:** Manually allocate customer advance credit against a specific invoice.

#### Request Body
```json
{
  "invoiceId": "66d6a8f1b2c3d4e5f6a7b8c9",
  "allocatedAmount": 461.00,
  "notes": "Settling remaining balance from advance credit"
}
```

#### Response (`200 OK`)
```json
{
  "success": true,
  "message": "Credit successfully allocated against invoice.",
  "data": {
    "customerId": "66d6a8f1b2c3d4e5f6a7b801",
    "invoiceId": "66d6a8f1b2c3d4e5f6a7b8c9",
    "allocatedAmount": 461.00,
    "invoiceRemainingBalance": 0.00,
    "invoiceStatus": "Paid",
    "customerRemainingAdvanceCredit": 0.00
  }
}
```

---

## 4. 📦 Complete TypeScript Type Definitions

Create `src/types/financialApi.types.ts` and paste this complete type definitions block:

```typescript
// src/types/financialApi.types.ts

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  summary?: any;
  pagination?: PaginationMeta;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginationMeta {
  page?: number;
  currentPage?: number;
  limit: number;
  total_records?: number;
  totalRecords?: number;
  total_pages?: number;
  totalPages?: number;
}

// 1. Invoices
export type InvoiceStatus = 'Paid' | 'Partially Paid' | 'Pending' | 'Cancelled' | 'Overdue' | 'Due Soon';

export interface InvoiceItem {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name: string;
  service?: string;
  issue_date: string;
  due_date: string;
  total: number;
  grand_total: number;
  advance_paid: number;
  paid: number;
  remaining: number;
  balance_amount: number;
  status: InvoiceStatus;
  lead_by?: string;
  lead_owner?: string;
  items?: Array<{
    description: string;
    qty: number;
    rate: number;
    tax?: number;
    netAmount: number;
  }>;
}

// 2. Outstanding Invoices
export interface OutstandingInvoiceItem {
  invoiceId: string;
  customerName: string;
  customerId: string;
  invoiceDate: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
  daysOverdue: number;
  status: 'Overdue' | 'Due Soon';
}

export interface OutstandingInvoicesResponse {
  data: OutstandingInvoiceItem[];
  summary: {
    totalOutstanding: number;
    totalInvoices: number;
    overdueCount: number;
  };
}

// 3. Receipts
export interface ReceiptItem {
  id: string;
  reference_number: string;
  customer_id: string;
  customer_name: string;
  payment_date: string;
  payment_mode: string;
  amount: number;
  applied: number;
  advance: number;
  status: string;
  notes?: string;
}

// 4. Customer Financial Summary
export type AccountStatus =
  | 'SETTLED_AND_CREDIT_AVAILABLE'
  | 'DUE_OUTSTANDING'
  | 'SETTLED';

export interface CustomerFinancialSummary {
  customerId: string;
  customerName: string;
  currency: string;
  totalBilledDebit: number;
  totalReceivedCredit: number;
  outstandingDues: number;
  remainingAdvanceCredit: number;
  accountStatus: AccountStatus;
  metricsCount: {
    totalInvoices: number;
    totalReceipts: number;
  };
  lastTransactionDate: string | null;
}

// 5. Customer Ledger
export type LedgerEntryType = 'invoice' | 'receipt';

export interface LedgerItem {
  id: string;
  date: string;
  refNo: string;
  type: LedgerEntryType;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  status: string;
}

export interface LedgerSummary {
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

// 6. Advance Payments
export interface AdvancePaymentItem {
  id: string;
  advanceId?: string;
  customerName: string;
  customerId: string;
  date: string;
  dateReceived?: string;
  paymentMethod: string;
  reference: string;
  referenceTransaction?: string;
  amount: number;
  totalReceived?: number;
  allocatedAmount: number;
  balance: number;
  unallocatedBalance?: number;
  status: 'Unallocated' | 'Partially Allocated' | 'Fully Allocated' | string;
}

export interface AdvancePaymentsSummary {
  totalReceived: number;
  allocatedAmount: number;
  unallocatedBalance: number;
  currency: string;
}

// 7. Dashboard Financial Summary
export interface DashboardFinancialSummary {
  totalRevenue: number;
  totalReceived: number;
  outstanding: number;
  advanceTotal: number;
  todaySales: number;
  monthSales: number;
  paidCount: number;
  totalInvoices: number;
  avgRevenue: number;
  conversionRate: string;
  chartData: Array<{
    day: string;
    revenue: number;
    bookings: number;
  }>;
  employeeSales: Array<{
    name: string;
    value: number;
  }>;
}
```

---

## 5. 🛠️ Drop-In Frontend API Service (`financialApi.ts`)

Create `src/services/financialApi.ts` in your frontend repository:

```typescript
// src/services/financialApi.ts
import axios from 'axios';
import {
  ApiResponse,
  CustomerFinancialSummary,
  CustomerLedgerResponse,
  DashboardFinancialSummary,
  InvoiceItem,
  OutstandingInvoicesResponse,
  ReceiptItem,
  AdvancePaymentItem,
  AdvancePaymentsSummary,
} from '../types/financialApi.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://skyfall-financial-backend.onrender.com/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Token & Company ID interceptor
apiClient.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const companyId = typeof window !== 'undefined' ? localStorage.getItem('companyId') : null;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (companyId) {
    config.headers['x-company-id'] = companyId;
  }
  return config;
});

export const FinancialApi = {
  // 1. Invoices
  getInvoices: async (params?: { page?: number; limit?: number; search?: string; status?: string; customer_id?: string }) => {
    const res = await apiClient.get<ApiResponse<InvoiceItem[]>>('/invoices', { params });
    return res.data;
  },

  // 2. Outstanding Invoices (Overdue & Due Soon)
  getOutstandingInvoices: async (params?: { search?: string; status?: string; start_date?: string; end_date?: string }) => {
    const res = await apiClient.get<OutstandingInvoicesResponse & { success: boolean }>('/invoices/outstanding', { params });
    return res.data;
  },

  // 3. Receipts
  getReceipts: async (params?: { page?: number; limit?: number; search?: string; customer_id?: string }) => {
    const res = await apiClient.get<ApiResponse<ReceiptItem[]>>('/receipts', { params });
    return res.data;
  },

  // 4. Customer Financial Summary Cards
  getCustomerFinancialSummary: async (customerId: string) => {
    const res = await apiClient.get<ApiResponse<CustomerFinancialSummary>>(`/customers/${customerId}/financial-summary`);
    return res.data.data;
  },

  // 5. Customer Chronological Ledger
  getCustomerLedger: async (customerId: string, params?: { startDate?: string; endDate?: string; type?: string; page?: number; limit?: number }) => {
    const res = await apiClient.get<ApiResponse<any>>(`/customers/${customerId}/ledger`, { params });
    return res.data;
  },

  // 6. Advance Payments List & Summary
  getAdvancePayments: async (params?: { status?: string; search?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) => {
    const res = await apiClient.get<ApiResponse<{ summary: AdvancePaymentsSummary; advances: AdvancePaymentItem[]; pagination: any }>>('/finance/advance-payments', { params });
    return res.data.data;
  },

  // 7. Global Dashboard Financial Summary
  getDashboardSummary: async () => {
    const res = await apiClient.get<ApiResponse<DashboardFinancialSummary>>('/dashboard/financial-summary');
    return res.data.data;
  },

  // Manual Credit Allocation
  allocateCredit: async (customerId: string, payload: { invoiceId: string; allocatedAmount: number; notes?: string }) => {
    const res = await apiClient.post<ApiResponse<any>>(`/customers/${customerId}/allocate-credit`, payload);
    return res.data;
  },
};
```

---

## 6. 🔄 Component-by-Component Migration Guide

### A. Customer Details Page / Tab (`CustomerLedger.tsx`)
```diff
- // ❌ OLD (Client-side Solver)
- import { solveCustomerFinancials } from '@/lib/financial-solver';
- const { ledger, summary } = solveCustomerFinancials(invoices, receipts, customerId);

+ // ✅ NEW (Authoritative Backend)
+ import { FinancialApi } from '@/services/financialApi';
+ 
+ const fetchLedger = async () => {
+   const response = await FinancialApi.getCustomerLedger(customerId, { startDate, endDate });
+   setLedgerEntries(response.data);
+   setLedgerSummary(response.summary);
+ };
```

---

### B. Customer Summary Cards (`CustomerFinancialCards.tsx`)
```tsx
import React, { useEffect, useState } from 'react';
import { FinancialApi } from '@/services/financialApi';
import { CustomerFinancialSummary } from '@/types/financialApi.types';

export const CustomerFinancialCards: React.FC<{ customerId: string }> = ({ customerId }) => {
  const [summary, setSummary] = useState<CustomerFinancialSummary | null>(null);

  useEffect(() => {
    FinancialApi.getCustomerFinancialSummary(customerId).then(setSummary);
  }, [customerId]);

  if (!summary) return <div>Loading Financial Summary...</div>;

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* 1. Total Billed */}
      <div className="p-4 bg-white rounded-lg shadow border">
        <span className="text-gray-500 text-sm">Total Billed (Debit)</span>
        <h3 className="text-2xl font-bold text-gray-900">AED {summary.totalBilledDebit.toFixed(2)}</h3>
      </div>

      {/* 2. Total Received (Receipts + Deposits) */}
      <div className="p-4 bg-white rounded-lg shadow border">
        <span className="text-gray-500 text-sm">Total Received (Credit)</span>
        <h3 className="text-2xl font-bold text-green-600">AED {summary.totalReceivedCredit.toFixed(2)}</h3>
      </div>

      {/* 3. Outstanding Dues */}
      <div className="p-4 bg-white rounded-lg shadow border">
        <span className="text-gray-500 text-sm">Outstanding Dues</span>
        <h3 className="text-2xl font-bold text-red-600">AED {summary.outstandingDues.toFixed(2)}</h3>
      </div>

      {/* 4. Advance Credit Available */}
      <div className="p-4 bg-white rounded-lg shadow border">
        <span className="text-gray-500 text-sm">Remaining Advance Credit</span>
        <h3 className="text-2xl font-bold text-blue-600">AED {summary.remainingAdvanceCredit.toFixed(2)}</h3>
      </div>
    </div>
  );
};
```

---

### C. Invoices Table (`InvoicesTable.tsx`)
Directly read the server-calculated values:
- Use `row.total` or `row.grand_total` for invoice amount.
- Use `row.paid` for amount paid.
- Use `row.remaining` for balance left.
- Use `row.status` directly for badges (`Paid` -> Green, `Partially Paid` -> Amber, `Pending` -> Gray).

---

### D. Outstanding & Overdue Invoices Component (`OutstandingInvoices.tsx`)
```tsx
import React, { useEffect, useState } from 'react';
import { FinancialApi } from '@/services/financialApi';
import { OutstandingInvoiceItem } from '@/types/financialApi.types';

export const OutstandingInvoices: React.FC = () => {
  const [invoices, setInvoices] = useState<OutstandingInvoiceItem[]>([]);
  const [summary, setSummary] = useState<{ totalOutstanding: number; overdueCount: number } | null>(null);

  useEffect(() => {
    FinancialApi.getOutstandingInvoices().then((res) => {
      setInvoices(res.data);
      setSummary(res.summary);
    });
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Outstanding Invoices</h2>
        {summary && (
          <div className="text-sm font-semibold text-gray-700">
            Total Outstanding: <span className="text-red-600">AED {summary.totalOutstanding.toFixed(2)}</span> ({summary.overdueCount} Overdue)
          </div>
        )}
      </div>

      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th>Invoice #</th>
            <th>Customer</th>
            <th>Due Date</th>
            <th>Outstanding</th>
            <th>Days Overdue</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.invoiceId}>
              <td className="font-medium">{inv.invoiceId}</td>
              <td>{inv.customerName}</td>
              <td>{inv.dueDate}</td>
              <td className="font-bold text-red-600">AED {inv.outstanding.toFixed(2)}</td>
              <td>{inv.daysOverdue > 0 ? `${inv.daysOverdue} days` : '—'}</td>
              <td>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  inv.status === 'Overdue' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {inv.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

### E. Dashboard Overview (`DashboardPage.tsx`)
Fetch `FinancialApi.getDashboardSummary()` to populate the top KPI banner, revenue vs. bookings weekly charts, and employee performance leaderboard without executing any client calculations.

---

## 7. 🎨 UI Invariants, Status Badges & Edge Cases

### Status Color Mapping
| Backend Status Value | Recommended UI Color | Tailwind Classes |
| :--- | :--- | :--- |
| `Paid` / `SETTLED` | Green | `bg-emerald-100 text-emerald-800 border-emerald-300` |
| `Partially Paid` | Amber / Orange | `bg-amber-100 text-amber-800 border-amber-300` |
| `Pending` / `unpaid` | Slate / Gray | `bg-slate-100 text-slate-700 border-slate-300` |
| `Overdue` / `DUE_OUTSTANDING` | Red | `bg-rose-100 text-rose-800 border-rose-300` |
| `Due Soon` | Yellow | `bg-yellow-100 text-yellow-800 border-yellow-300` |
| `SETTLED_AND_CREDIT_AVAILABLE`| Blue | `bg-blue-100 text-blue-800 border-blue-300` |
| `advance_credit` / `Unallocated` | Purple / Indigo | `bg-indigo-100 text-indigo-800 border-indigo-300` |

### Edge Case Handling
1. **Invoice Creation Deposits (`advance_paid`):**
   - In the customer ledger table, invoice deposit rows have `refNo: "DEP-{invoice_number}"`.
   - Render them with a deposit badge or note icon indicating "Deposit paid at invoice creation".
2. **Negative Running Balance:**
   - In `GET /customers/:id/ledger`, a negative closing balance (e.g. `-461.00`) means the customer has excess advance credit available for future services.
3. **Currency Formatting:**
   - Always display amounts as `AED XX.XX` using `.toFixed(2)` or `Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' })`.
