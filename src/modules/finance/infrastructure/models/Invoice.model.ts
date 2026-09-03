import { Schema, model, Document, Types } from 'mongoose';

export interface IInvoiceLineItem {
  id?: string;
  item?: string;
  description: string;
  nbNo?: string;
  name?: string;
  transNo?: string;
  qty: number;
  rate: number;
  tax?: number;
  netAmount?: number;
  withdrawDt?: string;
  account?: string;
  govCost?: number;
  totCost?: number;
  supl?: string;
  suplFee?: number;
  pro?: string;
  proComm?: number;
  commFrom?: string;
  commRecvd?: number;
  disc?: number;
  netProfit?: number;
}

export interface IAdditionItem {
  particular: string;
  value: number;
}

export interface IDeductionItem {
  particular: string;
  value: number;
}

export interface IStatementEntry {
  date: string;
  details: string;
  debit: number;
  credit: number;
}

export interface IInvoice extends Document {
  companyId?: Types.ObjectId;
  custom_id?: string;
  invoice_number: string;
  file_no?: string;
  invoice_type: 'standard' | 'statement';
  customer_id?: Types.ObjectId;
  customer_name: string;
  care_of?: string;
  contact_name?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  passenger_name?: string;
  lead_by: string;
  lead_owner?: string;
  employee?: string;
  category: string;
  issue_date: string;
  due_date: string;
  payment_terms: string;
  remarks?: string;
  currency: string;
  status: 'Paid' | 'Pending' | 'Partially Paid' | 'Overdue' | 'Draft' | 'Cancelled' | string;

  items: IInvoiceLineItem[];
  addition_items: IAdditionItem[];
  deduction_items: IDeductionItem[];

  subtotal: number;
  vat: number;
  additions: number;
  deductions: number;
  grand_total: number;
  total_profit: number;
  paid_amount: number;
  balance_amount: number;
  advance_paid?: number;
  service?: string;

  period_start?: string;
  period_end?: string;
  opening_balance?: number;
  statement_entries: IStatementEntry[];

  created_by?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceLineItemSchema = new Schema<IInvoiceLineItem>(
  {
    id: { type: String },
    item: { type: String, default: 'General Service' },
    description: { type: String, required: true },
    nbNo: { type: String, default: '' },
    name: { type: String, default: '' },
    transNo: { type: String, default: '' },
    qty: { type: Number, required: true, min: 1, default: 1 },
    rate: { type: Number, required: true, min: 0, default: 0 },
    tax: { type: Number, default: 0 },
    netAmount: { type: Number, default: 0 },
    withdrawDt: { type: String, default: '' },
    account: { type: String, default: 'General Revenue' },
    govCost: { type: Number, default: 0 },
    totCost: { type: Number, default: 0 },
    supl: { type: String, default: '' },
    suplFee: { type: Number, default: 0 },
    pro: { type: String, default: '' },
    proComm: { type: Number, default: 0 },
    commFrom: { type: String, default: '' },
    commRecvd: { type: Number, default: 0 },
    disc: { type: Number, default: 0 },
    netProfit: { type: Number, default: 0 },
  },
  { _id: false },
);

const AdditionItemSchema = new Schema<IAdditionItem>(
  {
    particular: { type: String, required: true },
    value: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const DeductionItemSchema = new Schema<IDeductionItem>(
  {
    particular: { type: String, required: true },
    value: { type: Number, required: true, default: 0 },
  },
  { _id: false },
);

const StatementEntrySchema = new Schema<IStatementEntry>(
  {
    date: { type: String, required: true },
    details: { type: String, required: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
  },
  { _id: false },
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company' },
    custom_id: { type: String, index: true },
    invoice_number: { type: String, required: true, index: true },
    file_no: { type: String, default: '' },
    invoice_type: {
      type: String,
      enum: ['standard', 'statement'],
      default: 'standard',
    },
    customer_id: { type: Schema.Types.ObjectId, ref: 'Customer' },
    customer_name: { type: String, required: true, trim: true },
    care_of: { type: String, default: '' },
    contact_name: { type: String, default: '' },
    customer_email: { type: String, default: '' },
    customer_phone: { type: String, default: '' },
    customer_address: { type: String, default: '' },
    passenger_name: { type: String, default: '' },
    lead_by: { type: String, required: true, trim: true },
    lead_owner: { type: String, default: '' },
    employee: { type: String, default: 'Staff' },
    category: {
      type: String,
      default: 'General',
    },
    issue_date: { type: String, required: true },
    due_date: { type: String, required: true },
    payment_terms: {
      type: String,
      default: 'CASH',
    },
    remarks: { type: String, default: '' },
    currency: { type: String, default: 'AED' },
    status: {
      type: String,
      default: 'Paid',
    },

    items: { type: [InvoiceLineItemSchema], default: [] },
    addition_items: { type: [AdditionItemSchema], default: [] },
    deduction_items: { type: [DeductionItemSchema], default: [] },

    subtotal: { type: Number, default: 0 },
    vat: { type: Number, default: 0 },
    additions: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    grand_total: { type: Number, default: 0 },
    total_profit: { type: Number, default: 0 },
    paid_amount: { type: Number, default: 0 },
    balance_amount: { type: Number, default: 0 },
    advance_paid: { type: Number, default: 0 },
    service: { type: String, default: '' },

    period_start: { type: String, default: '' },
    period_end: { type: String, default: '' },
    opening_balance: { type: Number, default: 0 },
    statement_entries: { type: [StatementEntrySchema], default: [] },

    created_by: { type: String, default: 'System' },
  },
  {
    timestamps: true,
  },
);

InvoiceSchema.index({ companyId: 1, invoice_number: 1 });
InvoiceSchema.index({ companyId: 1, status: 1 });
InvoiceSchema.index({ companyId: 1, lead_by: 1 });

export const InvoiceModel = model<IInvoice>('Invoice', InvoiceSchema);
