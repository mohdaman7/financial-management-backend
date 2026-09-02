# 🛡️ Skyfall Financial & Travels ERP — Complete REST API Documentation

> **Version:** `1.0.0 (Production / v1)`  
> **Base URL:** `https://financial-management-backend.onrender.com/api/v1` (Production)  
> **Local URL:** `http://localhost:5000/api/v1`  
> **Swagger UI:** `http://localhost:5000/api/docs`  

---

## 📑 Table of Contents

1. [Architecture & Authentication](#1-architecture--authentication)
2. [Standard Response & Error Envelope](#2-standard-response--error-envelope)
3. [Module 1: Authentication & User Session](#module-1-authentication--user-session)
4. [Module 2: Multi-Company Management](#module-2-multi-company-management)
5. [Module 3: Customer CRM & Document Vault](#module-3-customer-crm--document-vault)
6. [Module 4: Services Catalog](#module-4-services-catalog)
7. [Module 5: Quotations & Proposals](#module-5-quotations--proposals)
8. [Module 6: Tax Invoices & Statement Invoices](#module-6-tax-invoices--statement-invoices)
9. [Module 7: Receipts & FIFO Payment Allocation](#module-7-receipts--fifo-payment-allocation)
10. [Module 8: Finance, Ledger & Bank Accounts](#module-8-finance-ledger--bank-accounts)
11. [Module 9: Complete 18 Reports (Sales & Finance)](#module-9-complete-18-reports)
12. [Module 10: HR Offer Letters](#module-10-hr-offer-letters)
13. [Module 11: Employees & Attendance](#module-11-employees--attendance)
14. [Module 12: Audit Logs, Notifications & Global Search](#module-12-audit-logs-notifications--search)
15. [Frontend Integration Guide (Axios & TanStack Query)](#frontend-integration-guide)

---

## 1. Architecture & Authentication

Every authenticated request from the frontend must include:
1. `Authorization: Bearer <ACCESS_TOKEN>` header.
2. `x-company-id: <COMPANY_ID>` header (Optional if user is bound to a single company; required when Super Admin switches context).

### Token Lifecycles
- **Access Token:** Short-lived JWT (15 minutes).
- **Refresh Token:** Long-lived JWT (7 days) stored securely in `httpOnly` cookie or localStorage for token rotation.

---

## 2. Standard Response & Error Envelope

### Standard Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation executed successfully",
  "meta": {
    "total": 120,
    "page": 1,
    "limit": 20,
    "totalPages": 6
  }
}
```

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid line item price or quantity",
    "details": [
      {
        "field": "items.0.rate",
        "message": "Rate must be a positive number"
      }
    ]
  }
}
```

---

## Module 1: Authentication & User Session

### `POST /auth/login`
Authenticates user and returns JWT credentials.

* **Request Body:**
```json
{
  "email": "admin@skyfall.ae",
  "password": "YourPassword123!"
}
```

* **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "60d0fe4f5311236168a109ca",
      "name": "Sameer Al-Mansoor",
      "email": "admin@skyfall.ae",
      "role": "admin",
      "isSuperAdmin": false,
      "companyId": "60d0fe4f5311236168a109cb",
      "permissions": [
        "manage_travel",
        "manage_finance",
        "manage_customers",
        "generate_invoices",
        "view_proposals"
      ]
    }
  }
}
```

### `GET /auth/me`
Retrieves profile and permissions of current authenticated session.
* **Headers:** `Authorization: Bearer <token>`
* **Response (200 OK):** Current user object with active company and permissions array.

### `POST /auth/refresh`
Rotates access token using valid refresh token.
* **Request Body:** `{ "refreshToken": "eyJhbGciOiJIUzI1Ni..." }`
* **Response (200 OK):** `{ "success": true, "data": { "accessToken": "new_token...", "refreshToken": "new_refresh..." } }`

### `POST /auth/logout`
Invalidates active session token.

---

## Module 2: Multi-Company Management

### `GET /companies`
Lists all tenant companies (Requires `super_admin` role).

### `POST /companies`
Provisions a new tenant company (Requires `super_admin`).
* **Request Body:**
```json
{
  "name": "Skyfall Travel & Tourism LLC",
  "code": "SKY-DXB",
  "taxNumber": "100234567800003",
  "address": "Office 402, Business Bay, Dubai, UAE",
  "phone": "+971 4 555 1234",
  "email": "info@skyfall.ae",
  "currency": "AED"
}
```

---

## Module 3: Customer CRM & Document Vault

### `GET /customers`
Lists customers with full search, status filtering, and pagination.
* **Query Parameters:**
  - `search` (string) — Searches name, email, phone, company name, file number.
  - `status` (string) — `lead` | `prospect` | `active` | `vip` | `dormant`.
  - `lead_by` (string) — Filter by sales rep/employee.
  - `page` (number, default: 1)
  - `limit` (number, default: 20)

### `POST /customers`
Creates a new customer profile.
* **Request Body:**
```json
{
  "name": "Al Habtoor Luxury Group",
  "email": "accounts@habtoor.ae",
  "phone": "+971 4 333 4444",
  "company_name": "Al Habtoor Group LLC",
  "file_no": "FILE-9021",
  "contact_name": "Khalid Al Habtoor",
  "care_of": "Direct Corporate",
  "lead_by": "Sameer",
  "opening_balance": 500,
  "status": "active",
  "priority": "high",
  "category": "Corporate VIP",
  "notes": "Corporate travel & Golden Visa processing client"
}
```

### `GET /customers/:id`
Returns complete customer profile, including transaction history and lifetime spend.

### `PUT /customers/:id`
Updates customer fields, status, and notes.

### `POST /customers/:id/documents` (Multipart Upload)
Uploads passport copy, visa copy, or trade license directly to private GridFS vault.
* **Body Form-Data:**
  - `file` (Binary File: PDF, PNG, JPEG)
  - `category` (string: `Passport` | `Visa` | `Trade License` | `Contract` | `Other`)
  - `document_number` (string)
  - `expiry_date` (string: `YYYY-MM-DD`)

### `GET /customers/:id/documents/:docId/download`
Streams the secure binary document for browser viewing or download.

---

## Module 4: Services Catalog

### `GET /services`
Lists catalog services with pricing, processing times, and requirements.
* **Query Parameters:** `category`, `search`, `status`.

### `POST /services`
Creates a catalog service.
* **Request Body:**
```json
{
  "name": "10-Year UAE Golden Visa Concierge",
  "category": "UAE Visa & Immigration Services",
  "government_fee": 2800,
  "company_service_charge": 1200,
  "processing_time": "3-5 Business Days",
  "steps_to_apply": [
    "Document Attestation & Verification",
    "ICP / GDRFA Initial Nomination",
    "VIP Medical Fitness & Emirates ID Typing",
    "Visa Stamping & Digital ID Issuance"
  ],
  "required_documents": ["Passport Copy", "Bank Statements 6 Months", "Title Deed / Trade License"],
  "status": "active"
}
```
* **Auto Calculated:** `total_cost = government_fee + company_service_charge` (4,000 AED).

---

## Module 5: Quotations & Proposals

### `GET /quotations` (or `/proposals`)
Lists quotations with search, date range, and acceptance status.

### `POST /quotations`
Generates a formal quotation with proportional discount and line-item UAE 5% VAT.
* **Request Body:**
```json
{
  "customer_id": "60d0fe4f5311236168a109ca",
  "customer_name": "Al Habtoor Luxury Group",
  "contact_name": "Khalid Al Habtoor",
  "file_no": "FILE-9021",
  "lead_by": "Sameer",
  "date": "2026-09-02",
  "valid_until": "2026-10-02",
  "payment_terms": "BANK_TRANSFER",
  "items": [
    {
      "description": "Golden Visa Processing",
      "qty": 1,
      "rate": 4000,
      "tax": 5
    },
    {
      "description": "VIP Medical & Emirates ID Typing",
      "qty": 2,
      "rate": 500,
      "tax": 5
    }
  ],
  "discount_amount": 500,
  "paid_amount": 1000,
  "notes": "Prices are inclusive of government fees and VIP typing charges."
}
```

* **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "60d0fe4f5311236168a109cd",
    "quote_ref": "SQ-2026-0142",
    "quoteRef": "SQ-2026-0142",
    "customer_name": "Al Habtoor Luxury Group",
    "subtotal": 5000,
    "discount_amount": 500,
    "total_tax": 225,
    "grand_total": 4725,
    "paid_amount": 1000,
    "balance_amount": 3725,
    "amount_in_words": "Four Thousand Seven Hundred Twenty-Five UAE Dirhams Only",
    "status": "sent"
  }
}
```

### `POST /quotations/:id/convert-to-invoice`
Converts an accepted proposal directly into an official Tax Invoice.

### `GET /quotations/:id/pdf`
Streams generated high-resolution PDF quotation with header logo, terms, and breakdown.

### `POST /quotations/:id/send-email`
Sends PDF quotation directly to customer email via configured SMTP.
* **Request Body:** `{ "recipient_email": "client@company.ae", "custom_message": "Please find attached..." }`

---

## Module 6: Tax Invoices & Statement Invoices

### `GET /invoices`
Lists standard and statement invoices with filters (`status`, `lead_by`, `customer_name`, `date`).

### `POST /invoices`
Creates a Tax Invoice. The backend authoritatively calculates line profit, cost rollup, UAE 5% VAT, and balances.
* **Request Body:**
```json
{
  "customer_name": "Al Habtoor Luxury Group",
  "customer_id": "60d0fe4f5311236168a109ca",
  "lead_by": "Sameer",
  "category": "Visa Services",
  "file_no": "FILE-9021",
  "care_of": "Direct Corporate",
  "payment_terms": "BANK_TRANSFER",
  "issue_date": "2026-09-02",
  "due_date": "2026-09-30",
  "items": [
    {
      "description": "Golden Visa Processing",
      "qty": 1,
      "rate": 4000,
      "tax": 5,
      "govCost": 2800,
      "suplFee": 200,
      "proComm": 150
    },
    {
      "description": "VIP Medical Typing",
      "qty": 2,
      "rate": 500,
      "tax": 5,
      "govCost": 350,
      "suplFee": 50,
      "proComm": 50
    }
  ],
  "additions": 0,
  "deductions": 0,
  "paid_amount": 0,
  "notes": "Thank you for your business."
}
```

* **Authoritative Server Calculations:**
  - `subtotal`: `5,000.00 AED`
  - `vat`: `250.00 AED` (5% standard rate)
  - `grand_total`: `5,250.00 AED`
  - `total_profit`: `1,400.00 AED` (Net item profits summed)
  - `balance_amount`: `5,250.00 AED`
  - `invoice_number`: Auto-generated sequential (`18501` or `INV-2026-XXXX`)

### `GET /invoices/:id/pdf`
Streams the official Tax Invoice PDF.

---

## Module 7: Receipts & FIFO Payment Allocation

### `GET /receipts`
Lists all payment receipt vouchers.

### `POST /receipts`
Creates a payment voucher and executes automatic multi-invoice FIFO debt waterfall allocation.
* **Request Body:**
```json
{
  "customerId": "60d0fe4f5311236168a109ca",
  "customerName": "Al Habtoor Luxury Group",
  "paymentMethod": "Bank Transfer",
  "amount": 5000,
  "bank_account": "RAKBANK Operating Account",
  "transaction_reference": "TXN-RAK-99021",
  "date": "2026-09-02",
  "notes": "Settlement of pending invoice and deposit"
}
```

* **FIFO Waterfall Allocation Behavior:**
  1. Identifies all unpaid invoices for the customer sorted oldest-to-newest (`createdAt: 1`).
  2. Credits each invoice until paid in full (`status: 'paid'`).
  3. Any excess overpayment is preserved as `unallocated_amount` (Customer Advance).
  4. Automatically records double-entry Income transaction in Finance ledger.

---

## Module 8: Finance, Ledger & Bank Accounts

### `GET /finance/transactions`
Lists double-entry ledger transactions (`income`, `expense`, `transfer`).

### `POST /finance/transactions`
Records manual expense or operating cost.
* **Request Body:**
```json
{
  "type": "expense",
  "category": "Operations",
  "description": "Office Cloud Server & Software Subscriptions",
  "amount": 1050,
  "taxAmount": 50,
  "paymentMethod": "bank_transfer",
  "date": "2026-09-02",
  "bankAccountId": "60d0fe4f5311236168a109cf"
}
```

### `GET /finance/bank-accounts`
Returns all company bank/cash accounts with dynamic balances.

### `POST /finance/bank-accounts`
Creates a bank account (`bankName`, `accountName`, `accountNumber`, `currency`, `openingBalance`).

---

## Module 9: Complete 18 Reports

All reports support `start_date` and `end_date` (format: `YYYY-MM-DD`).

### Sales Reports (9)
| Route | Report Name | Description |
| :--- | :--- | :--- |
| `GET /reports/sales/proposals` | Proposal Pipeline | Quotations summary by status and volume |
| `GET /reports/sales/invoices` | Invoices & Statements | Paid vs unpaid invoice breakdown |
| `GET /reports/sales/daily` | Daily Sales | Daily grouped revenue, VAT, and gross profit |
| `GET /reports/sales/monthly` | Monthly Sales | Month-by-month financial trajectory |
| `GET /reports/sales/by-service` | Sales by Service | Top performing service verticals |
| `GET /reports/sales/by-category` | Sales by Category | Vertical margins (Visa, Corporate, Travel) |
| `GET /reports/sales/by-customer` | Sales by Customer | Customer lifetime value & receivables |
| `GET /reports/sales/leads` | Lead Performance | CRM lead conversion rate & channel sources |
| `GET /reports/sales/credit-notes` | Credit Notes | Returns, refunds, and debit adjustments |

### Finance Reports (9)
| Route | Report Name | Description |
| :--- | :--- | :--- |
| `GET /reports/finance/outstanding` | Outstanding Receivables | Aging debt buckets (`0-30`, `31-60`, `60+` days) |
| `GET /reports/finance/customer-statement` | Customer Statement | Chronological statement with opening balance |
| `GET /reports/finance/supplier-statement` | Supplier Statement | Supplier payables, purchases, and disbursements |
| `GET /reports/finance/receipts` | Receipts Log | Inflows grouped by payment channel |
| `GET /reports/finance/expenses` | Operating Expenses | Category-wise expense distribution |
| `GET /reports/finance/profit-and-loss` | P&L Income Statement | Authoritative Revenue, Cost of Sales, Gross Margin & Net Profit |
| `GET /reports/finance/vat-return` | FTA VAT Return 201 | Box 1a Standard Supplies & Box 9 Input VAT |
| `GET /reports/finance/pro-commission` | PRO Commission | Item-level PRO employee commission totals |
| `GET /reports/finance/employee-performance`| Employee Performance | Sales conversion, targets, and commissions |

---

## Module 10: HR Offer Letters

### `GET /offer-letters`
Lists generated candidate employment offer letters.

### `POST /offer-letters`
Generates a customized employment offer letter.
* **Request Body:**
```json
{
  "candidate_name": "Zaid Al-Mansoor",
  "position": "Senior PRO & Corporate Relations Executive",
  "department": "Visa & Immigration",
  "basic_salary": 8000,
  "housing_allowance": 3000,
  "transport_allowance": 1000,
  "joining_date": "2026-10-01",
  "probation_months": 6,
  "work_location": "Dubai Head Office",
  "notes": "Standard UAE Labour Law terms apply"
}
```

### `GET /offer-letters/:id/pdf`
Streams the formatted company offer letter PDF with salary breakdown and signature blocks.

---

## Module 11: Employees & Attendance

### `GET /employees`
Lists company employees with role, department, and active user account.

### `POST /attendance/clock-in`
Records employee daily clock-in timestamp and geolocation/IP.

### `POST /attendance/clock-out`
Records employee daily clock-out and computes work duration.

---

## Module 12: Audit Logs, Notifications & Search

### `GET /audit-logs`
Returns tamper-resistant system audit history with user, action, IP, and diff.

### `GET /notifications`
Lists active user notifications and alerts.

### `GET /search?q=<query>`
Global search indexing customers, invoices, quotations, services, and receipts.

---

## Frontend Integration Guide

### 1. Axios API Client (`api-client.ts`)

```typescript
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Injects Bearer Token & Company ID
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  const companyId = localStorage.getItem('active_company_id');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (companyId) {
    config.headers['x-company-id'] = companyId;
  }
  return config;
});

// Response Interceptor: Automatic Token Refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/v1/auth/refresh', { refreshToken });
          const newToken = res.data.data.accessToken;
          localStorage.setItem('access_token', newToken);
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        } catch {
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);
```

### 2. PDF Download Helper Function
```typescript
export async function downloadPdfDocument(url: string, filename: string) {
  const response = await apiClient.get(url, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = downloadUrl;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(downloadUrl);
}
```
