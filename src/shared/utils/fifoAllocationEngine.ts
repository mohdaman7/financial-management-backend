import { Types } from 'mongoose';
import { CurrencyPrecision } from './currencyPrecision';
import { InvoiceModel } from '../../modules/finance/infrastructure/models/Invoice.model';
import { ReceiptModel } from '../../modules/finance/infrastructure/models/Receipt.model';

export interface FifoInvoiceInput {
  id: string;
  mongoId: string;
  customerId?: string;
  customerName?: string;
  grandTotal: number;
  advancePaid: number;
  date: string;
  createdAt: Date;
}

export interface FifoReceiptInput {
  id: string;
  mongoId: string;
  customerId?: string;
  customerName?: string;
  amount: number;
  date: string;
  createdAt: Date;
}

export interface CustomerIdentity {
  id: string;
  name: string;
  companyName?: string;
}

export interface InvoiceAllocationResult {
  paid: number;
  remaining: number;
  status: 'Paid' | 'Partially Paid' | 'Pending';
  advancePaid: number;
  resolvedCustomerId?: string;
}

export interface ReceiptAllocationResult {
  allocated: number;
  unallocated: number;
}

export interface FifoAllocationResult {
  invoiceAllocations: Map<string, InvoiceAllocationResult>;
  receiptAllocations: Map<string, ReceiptAllocationResult>;
  customerCredits: Map<string, number>;
}

export class FifoAllocationEngine {
  /**
   * Normalizes customer names for consistent matching
   */
  public static normalizeCustomerName(name?: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9\s]/g, '');
  }

  /**
   * Builds canonical lookup maps to map both Mongo ObjectId strings and Customer Names
   * to a single unified customer canonical key.
   */
  public static buildCustomerIdentityMap(
    customers: CustomerIdentity[] = [],
    invoices: FifoInvoiceInput[] = [],
    receipts: FifoReceiptInput[] = []
  ): {
    idToKey: Map<string, string>;
    nameToKey: Map<string, string>;
    keyToCustomer: Map<string, { id?: string; name: string }>;
  } {
    const idToKey = new Map<string, string>();
    const nameToKey = new Map<string, string>();
    const keyToCustomer = new Map<string, { id?: string; name: string }>();

    const registerIdentity = (rawId?: string, rawName?: string) => {
      const cleanId = rawId ? rawId.toString().trim() : '';
      const cleanName = this.normalizeCustomerName(rawName);

      if (!cleanId && !cleanName) return;

      let canonicalKey =
        (cleanId ? idToKey.get(cleanId) : undefined) ||
        (cleanName ? nameToKey.get(cleanName) : undefined) ||
        cleanId ||
        cleanName;

      if (cleanId) idToKey.set(cleanId, canonicalKey);
      if (cleanName) nameToKey.set(cleanName, canonicalKey);

      if (!keyToCustomer.has(canonicalKey)) {
        keyToCustomer.set(canonicalKey, {
          id: cleanId || undefined,
          name: rawName || 'Customer',
        });
      } else {
        const existing = keyToCustomer.get(canonicalKey)!;
        if (!existing.id && cleanId) existing.id = cleanId;
      }
    };

    for (const c of customers) {
      registerIdentity(c.id, c.name);
      if (c.companyName) {
        const cleanComp = this.normalizeCustomerName(c.companyName);
        if (cleanComp) {
          const key = idToKey.get(c.id) || c.id;
          nameToKey.set(cleanComp, key);
        }
      }
    }

    for (const inv of invoices) {
      registerIdentity(inv.customerId, inv.customerName);
    }

    for (const rec of receipts) {
      registerIdentity(rec.customerId, rec.customerName);
    }

    return { idToKey, nameToKey, keyToCustomer };
  }

  /**
   * Runs FIFO allocation algorithm across standard invoices and receipts.
   */
  public static calculate(
    invoices: FifoInvoiceInput[],
    receipts: FifoReceiptInput[],
    customers: CustomerIdentity[] = []
  ): FifoAllocationResult {
    const { idToKey, nameToKey, keyToCustomer } = this.buildCustomerIdentityMap(customers, invoices, receipts);

    const getCustomerKey = (customerId?: string, customerName?: string): string => {
      if (customerId && idToKey.has(customerId)) {
        return idToKey.get(customerId)!;
      }
      const cleanName = this.normalizeCustomerName(customerName);
      if (cleanName && nameToKey.has(cleanName)) {
        return nameToKey.get(cleanName)!;
      }
      return customerId || cleanName || 'unknown_customer';
    };

    const invoiceAllocations = new Map<string, InvoiceAllocationResult>();
    const receiptAllocations = new Map<string, ReceiptAllocationResult>();
    const customerCredits = new Map<string, number>();

    // 1. Group invoices and receipts by customer key
    const customerInvoices = new Map<string, FifoInvoiceInput[]>();
    for (const inv of invoices) {
      const key = getCustomerKey(inv.customerId, inv.customerName);
      if (!customerInvoices.has(key)) customerInvoices.set(key, []);
      customerInvoices.get(key)!.push(inv);
    }

    const customerReceipts = new Map<string, FifoReceiptInput[]>();
    for (const rec of receipts) {
      const key = getCustomerKey(rec.customerId, rec.customerName);
      if (!customerReceipts.has(key)) customerReceipts.set(key, []);
      customerReceipts.get(key)!.push(rec);
    }

    // Collect all unique customer keys
    const allCustomerKeys = new Set<string>([
      ...customerInvoices.keys(),
      ...customerReceipts.keys(),
    ]);

    for (const custKey of allCustomerKeys) {
      const custInvList = (customerInvoices.get(custKey) || []).slice();
      const custRecList = (customerReceipts.get(custKey) || []).slice();
      const resolvedCust = keyToCustomer.get(custKey);
      const resolvedCustomerId = resolvedCust?.id;

      // Sort invoices chronologically (oldest first)
      custInvList.sort((a, b) => {
        const timeA = new Date(a.date || a.createdAt).getTime();
        const timeB = new Date(b.date || b.createdAt).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.id.localeCompare(b.id);
      });

      // Sort receipts chronologically (oldest first)
      custRecList.sort((a, b) => {
        const timeA = new Date(a.date || a.createdAt).getTime();
        const timeB = new Date(b.date || b.createdAt).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.id.localeCompare(b.id);
      });

      // Track initial state per invoice:
      // startingDue = grand_total - advance_paid
      // If advance_paid > grand_total, startingDue is 0, and excess is added to customer credit pool
      let unallocatedCustomerCredit = 0;

      interface InvoiceState {
        input: FifoInvoiceInput;
        grandTotal: number;
        advancePaid: number;
        allocatedFromReceipts: number;
        currentBalance: number;
      }

      const invStates: InvoiceState[] = custInvList.map((inv) => {
        const grandTotal = CurrencyPrecision.round(Math.max(0, inv.grandTotal || 0));
        const advancePaid = CurrencyPrecision.round(Math.max(0, inv.advancePaid || 0));

        let currentBalance = 0;
        if (advancePaid >= grandTotal) {
          currentBalance = 0;
          const excess = CurrencyPrecision.round(advancePaid - grandTotal);
          unallocatedCustomerCredit = CurrencyPrecision.round(unallocatedCustomerCredit + excess);
        } else {
          currentBalance = CurrencyPrecision.round(grandTotal - advancePaid);
        }

        return {
          input: inv,
          grandTotal,
          advancePaid,
          allocatedFromReceipts: 0,
          currentBalance,
        };
      });

      // 2. If there is initial excess advance credit, apply it to subsequent unpaid invoices in order
      if (unallocatedCustomerCredit > 0) {
        for (const st of invStates) {
          if (unallocatedCustomerCredit <= 0) break;
          if (st.currentBalance > 0) {
            const applyAmount = Math.min(unallocatedCustomerCredit, st.currentBalance);
            st.allocatedFromReceipts = CurrencyPrecision.round(st.allocatedFromReceipts + applyAmount);
            st.currentBalance = CurrencyPrecision.round(st.currentBalance - applyAmount);
            unallocatedCustomerCredit = CurrencyPrecision.round(unallocatedCustomerCredit - applyAmount);
          }
        }
      }

      // 3. Allocate external Receipts in FIFO order
      for (const rec of custRecList) {
        let recRemaining = CurrencyPrecision.round(Math.max(0, rec.amount || 0));
        let recAllocated = 0;

        for (const st of invStates) {
          if (recRemaining <= 0) break;
          if (st.currentBalance > 0) {
            const allocate = Math.min(recRemaining, st.currentBalance);
            st.allocatedFromReceipts = CurrencyPrecision.round(st.allocatedFromReceipts + allocate);
            st.currentBalance = CurrencyPrecision.round(st.currentBalance - allocate);
            recAllocated = CurrencyPrecision.round(recAllocated + allocate);
            recRemaining = CurrencyPrecision.round(recRemaining - allocate);
          }
        }

        receiptAllocations.set(rec.id, {
          allocated: recAllocated,
          unallocated: recRemaining,
        });

        if (rec.mongoId && rec.mongoId !== rec.id) {
          receiptAllocations.set(rec.mongoId, {
            allocated: recAllocated,
            unallocated: recRemaining,
          });
        }

        // Any leftover unallocated receipt adds to available customer credit pool
        if (recRemaining > 0) {
          unallocatedCustomerCredit = CurrencyPrecision.round(unallocatedCustomerCredit + recRemaining);
        }
      }

      customerCredits.set(custKey, unallocatedCustomerCredit);

      // 4. Finalize invoice allocation results
      for (const st of invStates) {
        const totalPaid = CurrencyPrecision.round(
          Math.min(st.grandTotal, st.advancePaid + st.allocatedFromReceipts)
        );
        const finalBalance = CurrencyPrecision.round(Math.max(0, st.grandTotal - totalPaid));

        let status: 'Paid' | 'Partially Paid' | 'Pending' = 'Pending';
        if (finalBalance === 0 && st.grandTotal > 0) {
          status = 'Paid';
        } else if (totalPaid > 0 && totalPaid < st.grandTotal) {
          status = 'Partially Paid';
        } else if (st.grandTotal === 0) {
          status = 'Paid';
        }

        const res: InvoiceAllocationResult = {
          paid: totalPaid,
          remaining: finalBalance,
          status,
          advancePaid: st.advancePaid,
          resolvedCustomerId,
        };

        invoiceAllocations.set(st.input.id, res);
        if (st.input.mongoId && st.input.mongoId !== st.input.id) {
          invoiceAllocations.set(st.input.mongoId, res);
        }
      }
    }

    return {
      invoiceAllocations,
      receiptAllocations,
      customerCredits,
    };
  }

  /**
   * Persists computed allocations to MongoDB to maintain synchronized stored states.
   */
  public static async persistAllocations(
    invoices: FifoInvoiceInput[],
    receipts: FifoReceiptInput[],
    result: FifoAllocationResult
  ): Promise<void> {
    const invoiceBulkOps = [];
    for (const inv of invoices) {
      const alloc = result.invoiceAllocations.get(inv.id) || result.invoiceAllocations.get(inv.mongoId);
      if (alloc) {
        const updateFields: any = {
          paid_amount: alloc.paid,
          balance_amount: alloc.remaining,
          status: alloc.status,
          advance_paid: alloc.advancePaid,
        };
        if (alloc.resolvedCustomerId && !inv.customerId && Types.ObjectId.isValid(alloc.resolvedCustomerId)) {
          updateFields.customer_id = new Types.ObjectId(alloc.resolvedCustomerId);
        }

        invoiceBulkOps.push({
          updateOne: {
            filter: { _id: inv.mongoId },
            update: {
              $set: updateFields,
            },
          },
        });
      }
    }

    const receiptBulkOps = [];
    for (const rec of receipts) {
      const alloc = result.receiptAllocations.get(rec.id) || result.receiptAllocations.get(rec.mongoId);
      if (alloc) {
        receiptBulkOps.push({
          updateOne: {
            filter: { _id: rec.mongoId },
            update: {
              $set: {
                unallocated_amount: alloc.unallocated,
              },
            },
          },
        });
      }
    }

    const promises = [];
    if (invoiceBulkOps.length > 0) {
      promises.push(InvoiceModel.bulkWrite(invoiceBulkOps as any));
    }
    if (receiptBulkOps.length > 0) {
      promises.push(ReceiptModel.bulkWrite(receiptBulkOps as any));
    }

    if (promises.length > 0) {
      await Promise.all(promises);
    }
  }
}
