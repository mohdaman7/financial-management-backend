# 🚀 Frontend Developer Integration Guide: Customer Account & Financial Ledger

**Application:** Skyfall ERP & CRM  
**Module:** Customer Account, Financial Ledger & Advance Credit Management  
**Backend API Version:** `v1`  
**Base URL (Production / Render):** `https://skyfall-financial-backend.onrender.com/api/v1`  
**Base URL (Local Development):** `http://localhost:5000/api/v1`  

---

## 1. 🔐 Authentication & Headers

All requests must include the user's JWT access token and company multi-tenancy header:

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
x-company-id: <COMPANY_ID>
Content-Type: application/json
```

---

## 2. 📋 Summary of API Endpoints

| Method | Endpoint Path | Purpose |
| :--- | :--- | :--- |
| **`GET`** | `/customers/:id/financial-summary` | Real-time KPI Card metrics (Debits, Credits, Dues, Advance Credit, Status) |
| **`GET`** | `/customers/:id/ledger` | Chronological statement of account with running balances & summary |
| **`POST`** | `/customers/:id/allocate-credit` | Apply unallocated customer advance credit to an open invoice |

---

## 3. 📦 TypeScript Interfaces & Types

Copy and paste these interfaces into your frontend types file (e.g. `src/types/customerFinancial.ts`):

```typescript
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
  lastTransactionDate: string | null; // e.g. "2026-08-15" or null
}

export type LedgerTransactionType = 'invoice' | 'receipt';

export interface LedgerItem {
  id: string;
  date: string; // "YYYY-MM-DD"
  refNo: string; // e.g. "INV-2026-001" or "REC-2026-089"
  type: LedgerTransactionType;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
  status: string; // e.g. "paid", "partially_paid", "pending", "advance_credit"
}

export interface LedgerSummary {
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalRecords: number;
  totalPages: number;
}

export interface CustomerLedgerResponse {
  success: boolean;
  data: LedgerItem[];
  summary: LedgerSummary;
  pagination: PaginationMeta;
}

export interface AllocateCreditPayload {
  invoiceId?: string;
  invoiceRef?: string;
  allocatedAmount: number;
  notes?: string;
}

export interface AllocateCreditResponseData {
  allocationId: string;
  invoiceId: string;
  allocatedAmount: number;
  invoiceRemainingDue: number;
  customerRemainingAdvanceCredit: number;
  status: 'fully_paid' | 'partially_paid';
}
```

---

## 4. 🛠️ Detailed Endpoint Specifications

### A. Customer Financial Summary
Retrieves aggregated metrics for the KPI summary cards at the top of the Customer Profile / Accounts page.

* **URL:** `GET /api/v1/customers/:id/financial-summary`
* **Path Parameter:**
  * `id` *(string, required)*: Customer ID (MongoDB ObjectId or custom ID)

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "customerId": "60d5ec49f1b2c8a1b8e4f1a1",
    "customerName": "Nithin paul volga",
    "currency": "AED",
    "totalBilledDebit": 544.00,
    "totalReceivedCredit": 1544.00,
    "outstandingDues": 0.00,
    "remainingAdvanceCredit": 1000.00,
    "accountStatus": "SETTLED_AND_CREDIT_AVAILABLE",
    "metricsCount": {
      "totalInvoices": 1,
      "totalReceipts": 1
    },
    "lastTransactionDate": "2026-08-15"
  }
}
```

#### How to Map to UI Cards:
| KPI Card | Backend Field | Formatting |
| :--- | :--- | :--- |
| **Total Billed (Debit)** | `data.totalBilledDebit` | `AED ${data.totalBilledDebit.toFixed(2)}` |
| **Total Received (Credit)**| `data.totalReceivedCredit` | `AED ${data.totalReceivedCredit.toFixed(2)}` |
| **Outstanding Dues** | `data.outstandingDues` | `AED ${data.outstandingDues.toFixed(2)}` (Highlight Red if > 0) |
| **Advance Credit Available** | `data.remainingAdvanceCredit` | `AED ${data.remainingAdvanceCredit.toFixed(2)}` (Highlight Green if > 0) |
| **Status Badge** | `data.accountStatus` | See Status Badge Matrix below |

---

### B. Customer Financial Ledger
Retrieves the complete statement of account (chronological invoices and receipts with step-by-step continuous running balance).

* **URL:** `GET /api/v1/customers/:id/ledger`
* **Query Parameters:**
  * `startDate` *(optional, string, format: YYYY-MM-DD)*: Filter starting date
  * `endDate` *(optional, string, format: YYYY-MM-DD)*: Filter ending date
  * `type` *(optional, string)*: `'invoice'`, `'receipt'`, or `'all'`
  * `page` *(optional, number, default: 1)*
  * `limit` *(optional, number, default: 50)*

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": "60d5ec49f1b2c8a1b8e4f101",
      "date": "2026-08-10",
      "refNo": "INV-2026-001",
      "type": "invoice",
      "description": "Investor Visa & Express Processing Fee",
      "debit": 544.00,
      "credit": 0.00,
      "runningBalance": 544.00,
      "status": "paid"
    },
    {
      "id": "60d5ec49f1b2c8a1b8e4f102",
      "date": "2026-08-15",
      "refNo": "REC-2026-089",
      "type": "receipt",
      "description": "Bank Transfer - Advance Payment",
      "debit": 0.00,
      "credit": 1544.00,
      "runningBalance": -1000.00,
      "status": "advance_credit"
    }
  ],
  "summary": {
    "openingBalance": 0.00,
    "totalDebit": 544.00,
    "totalCredit": 1544.00,
    "closingBalance": -1000.00
  },
  "pagination": {
    "page": 1,
    "limit": 50,
    "totalRecords": 2,
    "totalPages": 1
  }
}
```

#### Running Balance Rule:
* $\text{Running Balance} > 0$: Customer has **Outstanding Dues** owed to the company (display in regular text / amber).
* $\text{Running Balance} < 0$: Customer has **Advance Credit Surplus** (display as negative or with a Green `Credit` indicator).
* $\text{Running Balance} = 0$: Account is fully balanced.

---

### C. Allocate Advance Credit
Applies a portion or all of the customer's available advance credit balance to pay down an open or unpaid invoice.

* **URL:** `POST /api/v1/customers/:id/allocate-credit`
* **Path Parameter:**
  * `id` *(string, required)*: Customer ID
* **Request Body:**
```json
{
  "invoiceId": "60d5ec49f1b2c8a1b8e4f103",
  "invoiceRef": "INV-2026-009",
  "allocatedAmount": 500.00,
  "notes": "Allocated AED 500 from customer advance credit balance"
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "allocationId": "alloc_4412",
    "invoiceId": "60d5ec49f1b2c8a1b8e4f103",
    "allocatedAmount": 500.00,
    "invoiceRemainingDue": 0.00,
    "customerRemainingAdvanceCredit": 500.00,
    "status": "fully_paid"
  }
}
```

---

## 5. 🎨 Account Status Badges Guide

| `accountStatus` Value | Display Label | Badge Color / Variant | Description |
| :--- | :--- | :--- | :--- |
| `SETTLED_AND_CREDIT_AVAILABLE` | **Advance Credit Available** | 🟢 Green / Success | Credits exceed debits ($\text{Credit} > \text{Debit}$). Available credit is ready to be allocated. |
| `DUE_OUTSTANDING` | **Payment Due** | 🔴 Red / Destructive | Debits exceed credits ($\text{Debit} > \text{Credit}$). Customer owes money. |
| `SETTLED` | **Fully Settled** | 🔵 Blue / Secondary | All invoices and receipts balance to 0.00. |

---

## 6. ⚠️ Error Handling Matrix

| HTTP Status | Error Code (`error.code`) | User-Facing Message / Toast Action |
| :---: | :--- | :--- |
| **`400`** | `INSUFFICIENT_CREDIT` | "The allocated amount exceeds the customer's available advance credit balance." |
| **`400`** | `INVOICE_ALREADY_PAID` | "This invoice is already fully paid and cannot receive further allocations." |
| **`400`** | `VALIDATION_ERROR` | "Please verify your input fields (e.g. valid positive amount required)." |
| **`401`** | `UNAUTHORIZED` | Redirect to login session expired. |
| **`404`** | `CUSTOMER_NOT_FOUND` | "Customer profile was not found." |
| **`404`** | `INVOICE_NOT_FOUND` | "The specified invoice could not be found." |
| **`500`** | `INTERNAL_ERROR` | "A server error occurred. Please try again later." |

### Standard Error Response Format:
```json
{
  "success": false,
  "message": "Attempted to allocate more advance credit than available",
  "error": {
    "code": "INSUFFICIENT_CREDIT",
    "message": "Attempted to allocate more advance credit than available",
    "details": []
  }
}
```

---

## 7. 💻 Frontend React / TypeScript Example (Axios / TanStack Query)

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://skyfall-financial-backend.onrender.com/api/v1',
});

// Attach token & company header via interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  const companyId = localStorage.getItem('active_company_id') || 'travels';
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (companyId) config.headers['x-company-id'] = companyId;
  return config;
});

// 1. Fetch Financial Summary
export async function fetchCustomerFinancialSummary(customerId: string) {
  const res = await api.get(`/customers/${customerId}/financial-summary`);
  return res.data.data;
}

// 2. Fetch Customer Ledger Statement
export async function fetchCustomerLedger(
  customerId: string,
  params?: { startDate?: string; endDate?: string; type?: string; page?: number; limit?: number }
) {
  const res = await api.get(`/customers/${customerId}/ledger`, { params });
  return res.data;
}

// 3. Allocate Advance Credit to Open Invoice
export async function allocateAdvanceCredit(
  customerId: string,
  payload: { invoiceId?: string; invoiceRef?: string; allocatedAmount: number; notes?: string }
) {
  const res = await api.post(`/customers/${customerId}/allocate-credit`, payload);
  return res.data.data;
}
```
