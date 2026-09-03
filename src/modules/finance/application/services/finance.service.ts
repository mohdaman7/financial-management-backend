import { Types } from 'mongoose';
import { TransactionRepository } from '../../infrastructure/repositories/transaction.repository';
import { BankAccountRepository } from '../../infrastructure/repositories/bankAccount.repository';
import { ITransaction, TransactionModel } from '../../infrastructure/models/Transaction.model';
import { IBankAccount, BankAccountModel } from '../../infrastructure/models/BankAccount.model';
import { ReceiptModel } from '../../infrastructure/models/Receipt.model';
import { InvoiceModel } from '../../infrastructure/models/Invoice.model';
import { TravelInvoiceModel } from '../../../travel/infrastructure/models/TravelInvoice.model';
import { CurrencyPrecision } from '@shared/utils/currencyPrecision';
import { AppError } from '@shared/errors/AppError';

export interface BankStatementFilterDTO {
  startDate?: string;
  endDate?: string;
  search?: string;
  accountType?: 'all' | 'main' | 'petty' | 'business' | string;
  page?: number;
  limit?: number;
}

export interface BankStatementTransactionItem {
  id: string;
  date: string;
  reference: string;
  description: string;
  customerName: string;
  paymentMethod: string;
  deposit: number;
  withdrawal: number;
  runningBalance: number;
  status: string;
}

export interface BankStatementSummary {
  openingBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  closingBalance: number;
  currency: string;
}

export interface BankStatementPagination {
  totalRecords: number;
  currentPage: number;
  totalPages: number;
  limit: number;
}

export interface BankStatementResult {
  summary: BankStatementSummary;
  pagination: BankStatementPagination;
  transactions: BankStatementTransactionItem[];
}

export interface AdvancePaymentsFilterDTO {
  startDate?: string;
  endDate?: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface AdvancePaymentItem {
  id: string;
  advanceId: string;
  customerName: string;
  customerId: string;
  dateReceived: string;
  paymentMethod: string;
  referenceTransaction: string;
  totalReceived: number;
  allocatedAmount: number;
  unallocatedBalance: number;
  status: 'Unallocated' | 'Partially Allocated' | 'Fully Allocated' | string;
}

export interface AdvancePaymentsSummary {
  totalReceived: number;
  allocatedAmount: number;
  unallocatedBalance: number;
  currency: string;
}

export interface AdvancePaymentsPagination {
  totalRecords: number;
  currentPage: number;
  totalPages: number;
  limit: number;
}

export interface AdvancePaymentsResult {
  summary: AdvancePaymentsSummary;
  pagination: AdvancePaymentsPagination;
  advances: AdvancePaymentItem[];
}

export class FinanceService {
  constructor(
    private transactionRepository: TransactionRepository,
    private bankAccountRepository: BankAccountRepository,
  ) {}

  // --- Bank Accounts ---
  async createBankAccount(companyId: string, data: Partial<IBankAccount>): Promise<IBankAccount> {
    return this.bankAccountRepository.create({
      ...data,
      companyId: new Types.ObjectId(companyId),
    });
  }

  async getBankAccounts(companyId: string): Promise<IBankAccount[]> {
    return this.bankAccountRepository.findByCompany(companyId);
  }

  async updateBankAccount(id: string, data: Partial<IBankAccount>): Promise<IBankAccount> {
    const updated = await this.bankAccountRepository.update(id, data);
    if (!updated) {
      throw AppError.notFound('Bank account not found');
    }
    return updated;
  }

  async deleteBankAccount(id: string): Promise<void> {
    await this.bankAccountRepository.delete(id);
  }

  // --- Transactions ---
  async createTransaction(
    companyId: string,
    data: {
      type: 'income' | 'expense';
      category: string;
      amount: number;
      taxAmount?: number;
      date?: Date;
      paymentMethod: 'cash' | 'bank_transfer' | 'card' | 'other';
      status?: 'pending' | 'completed' | 'cancelled';
      reference?: string;
      description?: string;
      bankAccountId?: string;
    },
  ): Promise<ITransaction> {
    const transaction = await this.transactionRepository.create({
      ...data,
      companyId: new Types.ObjectId(companyId),
      date: data.date || new Date(),
      bankAccountId: data.bankAccountId ? new Types.ObjectId(data.bankAccountId) : undefined,
    });

    if (transaction.status === 'completed' && transaction.bankAccountId) {
      const bankAcc = await this.bankAccountRepository.findById(
        transaction.bankAccountId.toString(),
      );
      if (bankAcc) {
        if (transaction.type === 'income') {
          bankAcc.currentBalance += transaction.amount;
        } else {
          bankAcc.currentBalance -= transaction.amount;
        }
        await bankAcc.save();
      }
    }

    return transaction;
  }

  async getTransactionById(id: string): Promise<ITransaction> {
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) {
      throw AppError.notFound('Transaction not found');
    }
    return transaction;
  }

  async getTransactions(
    companyId: string,
    filters: { type?: string; startDate?: Date; endDate?: Date; category?: string },
  ): Promise<ITransaction[]> {
    return this.transactionRepository.findByCompany(companyId, filters);
  }

  async updateTransaction(id: string, data: Partial<ITransaction>): Promise<ITransaction> {
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) {
      throw AppError.notFound('Transaction not found');
    }

    // Reverse old transaction effect if it was completed
    if (transaction.status === 'completed' && transaction.bankAccountId) {
      const bankAcc = await this.bankAccountRepository.findById(
        transaction.bankAccountId.toString(),
      );
      if (bankAcc) {
        if (transaction.type === 'income') {
          bankAcc.currentBalance -= transaction.amount;
        } else {
          bankAcc.currentBalance += transaction.amount;
        }
        await bankAcc.save();
      }
    }

    const updated = await this.transactionRepository.update(id, data);
    if (!updated) {
      throw AppError.notFound('Transaction not found');
    }

    // Apply new transaction effect if completed
    if (updated.status === 'completed' && updated.bankAccountId) {
      const bankAcc = await this.bankAccountRepository.findById(updated.bankAccountId.toString());
      if (bankAcc) {
        if (updated.type === 'income') {
          bankAcc.currentBalance += updated.amount;
        } else {
          bankAcc.currentBalance -= updated.amount;
        }
        await bankAcc.save();
      }
    }

    return updated;
  }

  async deleteTransaction(id: string): Promise<void> {
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) {
      throw AppError.notFound('Transaction not found');
    }

    // Reverse old transaction effect if it was completed
    if (transaction.status === 'completed' && transaction.bankAccountId) {
      const bankAcc = await this.bankAccountRepository.findById(
        transaction.bankAccountId.toString(),
      );
      if (bankAcc) {
        if (transaction.type === 'income') {
          bankAcc.currentBalance -= transaction.amount;
        } else {
          bankAcc.currentBalance += transaction.amount;
        }
        await bankAcc.save();
      }
    }

    await this.transactionRepository.delete(id);
  }

  async getProfitAndLoss(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    revenueByCategory: Record<string, number>;
    expensesByCategory: Record<string, number>;
  }> {
    const txs = await this.transactionRepository.findByCompany(companyId, {
      startDate,
      endDate,
    });

    const revenueByCategory: Record<string, number> = {};
    const expensesByCategory: Record<string, number> = {};
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const tx of txs) {
      if (tx.status !== 'completed') continue;

      if (tx.type === 'income') {
        totalRevenue += tx.amount;
        revenueByCategory[tx.category] = (revenueByCategory[tx.category] || 0) + tx.amount;
      } else {
        totalExpenses += tx.amount;
        expensesByCategory[tx.category] = (expensesByCategory[tx.category] || 0) + tx.amount;
      }
    }

    return {
      totalRevenue: parseFloat(totalRevenue.toFixed(2)),
      totalExpenses: parseFloat(totalExpenses.toFixed(2)),
      netProfit: parseFloat((totalRevenue - totalExpenses).toFixed(2)),
      revenueByCategory,
      expensesByCategory,
    };
  }

  async getCashFlow(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    netCashFlow: number;
    inflow: {
      total: number;
      byMethod: Record<string, number>;
    };
    outflow: {
      total: number;
      byMethod: Record<string, number>;
    };
  }> {
    const txs = await this.transactionRepository.findByCompany(companyId, {
      startDate,
      endDate,
    });

    let totalInflow = 0;
    let totalOutflow = 0;
    const inflowByMethod: Record<string, number> = {};
    const outflowByMethod: Record<string, number> = {};

    for (const tx of txs) {
      if (tx.status !== 'completed') continue;

      if (tx.type === 'income') {
        totalInflow += tx.amount;
        inflowByMethod[tx.paymentMethod] = (inflowByMethod[tx.paymentMethod] || 0) + tx.amount;
      } else {
        totalOutflow += tx.amount;
        outflowByMethod[tx.paymentMethod] = (outflowByMethod[tx.paymentMethod] || 0) + tx.amount;
      }
    }

    return {
      netCashFlow: parseFloat((totalInflow - totalOutflow).toFixed(2)),
      inflow: {
        total: parseFloat(totalInflow.toFixed(2)),
        byMethod: inflowByMethod,
      },
      outflow: {
        total: parseFloat(totalOutflow.toFixed(2)),
        byMethod: outflowByMethod,
      },
    };
  }

  // --- Bank Account Statement Aggregation ---
  async getBankStatement(
    companyId: string | undefined,
    filters: BankStatementFilterDTO = {},
  ): Promise<BankStatementResult> {
    const companyObjectId =
      companyId && Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : undefined;

    // Resolve Currency
    let currency = 'AED';
    if (companyObjectId) {
      const bankAcc = await BankAccountModel.findOne({ companyId: companyObjectId })
        .select('currency')
        .lean()
        .exec();
      if (bankAcc && bankAcc.currency) {
        currency = bankAcc.currency;
      }
    }

    const normalizeMethod = (method?: string): string => {
      if (!method) return 'Bank Transfer';
      const clean = method.trim().toLowerCase();
      if (
        clean === 'bank_transfer' ||
        clean === 'bank' ||
        clean === 'wire' ||
        clean === 'transfer'
      ) {
        return 'Bank Transfer';
      }
      if (clean === 'card' || clean === 'credit_card' || clean === 'credit card') {
        return 'Credit Card';
      }
      if (clean === 'debit_card' || clean === 'debit card') {
        return 'Debit Card';
      }
      if (clean === 'cheque' || clean === 'check') {
        return 'Cheque';
      }
      if (clean.includes('online') || clean.includes('gateway')) {
        return 'Online Gateway';
      }
      if (clean === 'direct debit' || clean === 'direct_debit') {
        return 'Direct Debit';
      }
      return method
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    };

    const isCash = (val?: string): boolean => {
      if (!val) return false;
      const clean = val.trim().toLowerCase().replace(/[\s_-]+/g, '');
      return clean === 'cash';
    };

    const isBankEligible = (term?: string): boolean => {
      if (!term) return false;
      const lower = term.toLowerCase();
      if (isCash(lower)) return false;
      return /bank|transfer|card|online|wire|cheque|direct|gateway/i.test(lower);
    };

    interface CandidateTx {
      id: string;
      date: string;
      rawDate: Date;
      reference: string;
      description: string;
      customerName: string;
      paymentMethod: string;
      deposit: number;
      withdrawal: number;
      runningBalance: number;
      status: string;
    }

    const candidateList: CandidateTx[] = [];
    const seenRefs = new Set<string>();

    const queryCompany: Record<string, any> = companyObjectId ? { companyId: companyObjectId } : {};

    // 1. Fetch from TransactionModel (explicit financial transactions)
    const dbTxs = await TransactionModel.find({
      ...queryCompany,
      paymentMethod: { $nin: ['cash'] },
      status: { $ne: 'cancelled' },
    })
      .sort({ date: 1, createdAt: 1 })
      .lean()
      .exec();

    for (const tx of dbTxs) {
      const deposit = tx.type === 'income' ? CurrencyPrecision.round(tx.amount || 0) : 0;
      const withdrawal = tx.type === 'expense' ? CurrencyPrecision.round(tx.amount || 0) : 0;
      const dateStr = tx.date ? new Date(tx.date).toISOString().split('T')[0] : '';
      const ref = tx.reference || `TXN-${tx._id.toString().slice(-6).toUpperCase()}`;

      seenRefs.add(ref.toLowerCase());
      seenRefs.add(tx._id.toString());

      let customerName = 'Bank Customer';
      if (tx.description && tx.description.includes(' - ')) {
        const parts = tx.description.split(' - ');
        customerName = parts[parts.length - 1].trim();
      } else if (
        tx.description &&
        (tx.description.includes(' from ') || tx.description.includes(' to '))
      ) {
        customerName = tx.description.split(/ from | to /i)[1]?.trim() || tx.category;
      } else {
        customerName = tx.category || 'Bank Transaction';
      }

      candidateList.push({
        id: tx._id.toString(),
        date: dateStr,
        rawDate: tx.date ? new Date(tx.date) : new Date(),
        reference: ref,
        description:
          tx.description ||
          `${deposit > 0 ? 'Bank Deposit' : 'Bank Withdrawal'} - ${customerName}`,
        customerName,
        paymentMethod: normalizeMethod(tx.paymentMethod),
        deposit,
        withdrawal,
        runningBalance: 0,
        status:
          tx.status === 'completed'
            ? 'Cleared'
            : tx.status === 'pending'
              ? 'Pending'
              : 'Cleared',
      });
    }

    // 2. Fetch from ReceiptModel
    const dbReceipts = await ReceiptModel.find({
      ...queryCompany,
      paymentMethod: { $nin: ['Cash', 'cash'] },
      status: { $ne: 'Cancelled' },
    })
      .sort({ date: 1, createdAt: 1 })
      .lean()
      .exec();

    for (const rec of dbReceipts) {
      const ref = rec.reference || `REC-${rec._id.toString().slice(-6).toUpperCase()}`;
      if (seenRefs.has(ref.toLowerCase()) || seenRefs.has(rec._id.toString())) {
        continue;
      }
      seenRefs.add(ref.toLowerCase());
      seenRefs.add(rec._id.toString());

      const deposit = CurrencyPrecision.round(rec.amount || 0);
      const dateStr =
        rec.date || (rec.createdAt ? new Date(rec.createdAt).toISOString().split('T')[0] : '');

      candidateList.push({
        id: rec._id.toString(),
        date: dateStr,
        rawDate: rec.date
          ? new Date(rec.date)
          : rec.createdAt
            ? new Date(rec.createdAt)
            : new Date(),
        reference: ref,
        description: rec.notes || `Bank Deposit - ${rec.customerName}`,
        customerName: rec.customerName || 'Customer',
        paymentMethod: normalizeMethod(rec.paymentMethod),
        deposit,
        withdrawal: 0,
        runningBalance: 0,
        status: rec.status === 'Received' ? 'Cleared' : 'Pending',
      });
    }

    // 3. Fetch from InvoiceModel (Standard Invoices)
    const dbInvoices = await InvoiceModel.find({
      ...queryCompany,
      status: { $nin: ['Cancelled', 'cancelled', 'Void'] },
    })
      .sort({ issue_date: 1, createdAt: 1 })
      .lean()
      .exec();

    for (const inv of dbInvoices) {
      const invRef = inv.invoice_number;
      const alreadyCoveredInflow =
        seenRefs.has(invRef.toLowerCase()) ||
        seenRefs.has(`rec-${invRef}`.toLowerCase()) ||
        seenRefs.has(`pay-${invRef}`.toLowerCase()) ||
        seenRefs.has((inv.custom_id || '').toLowerCase());

      if (
        !alreadyCoveredInflow &&
        (inv.paid_amount || 0) > 0 &&
        isBankEligible(inv.payment_terms)
      ) {
        seenRefs.add(invRef.toLowerCase());
        const dateStr =
          inv.issue_date ||
          (inv.createdAt ? new Date(inv.createdAt).toISOString().split('T')[0] : '');

        candidateList.push({
          id: inv.custom_id || inv._id.toString(),
          date: dateStr,
          rawDate: inv.issue_date
            ? new Date(inv.issue_date)
            : inv.createdAt
              ? new Date(inv.createdAt)
              : new Date(),
          reference: invRef,
          description: `Bank Deposit - ${inv.customer_name}`,
          customerName: inv.customer_name || 'Customer',
          paymentMethod: normalizeMethod(inv.payment_terms),
          deposit: CurrencyPrecision.round(inv.paid_amount || 0),
          withdrawal: 0,
          runningBalance: 0,
          status: 'Cleared',
        });
      }

      // Outflow check: line items for supplier costs / withdrawals
      if (inv.items && Array.isArray(inv.items)) {
        for (let i = 0; i < inv.items.length; i++) {
          const item = inv.items[i];
          const cost = item.totCost || item.govCost || item.suplFee || 0;
          const hasSupplier = Boolean(item.supl && item.supl.trim());
          const isBankAcc = !item.account || isBankEligible(item.account);

          if (cost > 0 && (hasSupplier || item.withdrawDt) && isBankAcc) {
            const suppRef =
              item.transNo ||
              `WDR-SUPP-${invRef}${inv.items.length > 1 ? `-${i + 1}` : ''}`;
            if (!seenRefs.has(suppRef.toLowerCase())) {
              seenRefs.add(suppRef.toLowerCase());
              const dateStr =
                item.withdrawDt ||
                inv.issue_date ||
                (inv.createdAt ? new Date(inv.createdAt).toISOString().split('T')[0] : '');

              candidateList.push({
                id: `${inv._id.toString()}_item_${i}`,
                date: dateStr,
                rawDate: item.withdrawDt
                  ? new Date(item.withdrawDt)
                  : inv.issue_date
                    ? new Date(inv.issue_date)
                    : new Date(),
                reference: suppRef,
                description: item.supl
                  ? `Airline Supplier Payment - ${item.supl}`
                  : `Supplier Payment - ${item.description || 'Service Cost'}`,
                customerName: item.supl || 'Supplier',
                paymentMethod: 'Direct Debit',
                deposit: 0,
                withdrawal: CurrencyPrecision.round(cost),
                runningBalance: 0,
                status: 'Cleared',
              });
            }
          }
        }
      }
    }

    // 4. Fetch from TravelInvoiceModel
    const dbTravelInvoices = await TravelInvoiceModel.find({
      ...queryCompany,
      status: { $ne: 'unpaid' },
    })
      .populate('customerId')
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    for (const trInv of dbTravelInvoices) {
      if (trInv.payments && Array.isArray(trInv.payments)) {
        trInv.payments.forEach((p, idx) => {
          if (!isCash(p.paymentMethod) && (p.amount || 0) > 0) {
            const payRef = `PAY-${trInv.invoiceNumber}${
              trInv.payments.length > 1 ? `-${idx + 1}` : ''
            }`;
            if (
              !seenRefs.has(payRef.toLowerCase()) &&
              !seenRefs.has(trInv.invoiceNumber.toLowerCase())
            ) {
              seenRefs.add(payRef.toLowerCase());
              const pDate = p.date ? new Date(p.date) : new Date(trInv.createdAt);
              const customer = trInv.customerId as any;

              candidateList.push({
                id: `${trInv._id.toString()}_p_${idx}`,
                date: pDate.toISOString().split('T')[0],
                rawDate: pDate,
                reference: payRef,
                description: `Bank Deposit - ${customer?.name || trInv.invoiceNumber}`,
                customerName: customer?.name || 'Customer',
                paymentMethod: normalizeMethod(p.paymentMethod),
                deposit: CurrencyPrecision.round(p.amount || 0),
                withdrawal: 0,
                runningBalance: 0,
                status: 'Cleared',
              });
            }
          }
        });
      }
    }

    // 5. Chronological Sorting for running balance calculation
    candidateList.sort((a, b) => {
      const timeDiff = a.rawDate.getTime() - b.rawDate.getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.deposit - a.deposit;
    });

    // 6. Calculate openingBalance (sum of transactions prior to startDate)
    let openingBalance = 0;
    if (filters.startDate) {
      const priorTransactions = candidateList.filter((tx) => tx.date < filters.startDate!);
      openingBalance = CurrencyPrecision.round(
        priorTransactions.reduce((acc, tx) => acc + tx.deposit - tx.withdrawal, 0),
      );
    }

    // 7. Compute chronological running balance starting from openingBalance
    let running = openingBalance;
    const activeTransactions = filters.startDate
      ? candidateList.filter((tx) => tx.date >= filters.startDate!)
      : candidateList;

    activeTransactions.forEach((tx) => {
      running = CurrencyPrecision.round(running + tx.deposit - tx.withdrawal);
      tx.runningBalance = running;
    });

    // 8. Apply Date Range and Search Filters
    let filtered = activeTransactions;
    if (filters.endDate) {
      filtered = filtered.filter((tx) => tx.date <= filters.endDate!);
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.reference.toLowerCase().includes(q) ||
          tx.description.toLowerCase().includes(q) ||
          tx.customerName.toLowerCase().includes(q) ||
          tx.paymentMethod.toLowerCase().includes(q),
      );
    }

    // 9. Calculate Aggregated Summary
    const totalDeposits = CurrencyPrecision.round(
      filtered.reduce((acc, tx) => acc + tx.deposit, 0),
    );
    const totalWithdrawals = CurrencyPrecision.round(
      filtered.reduce((acc, tx) => acc + tx.withdrawal, 0),
    );
    const closingBalance = CurrencyPrecision.round(
      openingBalance + totalDeposits - totalWithdrawals,
    );

    // 10. Sort by Date Descending (date: -1) as required by specification
    filtered.sort((a, b) => {
      const timeDiff = b.rawDate.getTime() - a.rawDate.getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.deposit - a.deposit;
    });

    // 11. Pagination
    const totalRecords = filtered.length;
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, filters.limit || 50);
    const totalPages = Math.ceil(totalRecords / limit) || 1;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    const formattedTransactions: BankStatementTransactionItem[] = paginated.map((tx) => ({
      id: tx.id,
      date: tx.date,
      reference: tx.reference,
      description: tx.description,
      customerName: tx.customerName,
      paymentMethod: tx.paymentMethod,
      deposit: tx.deposit,
      withdrawal: tx.withdrawal,
      runningBalance: tx.runningBalance,
      status: tx.status,
    }));

    return {
      summary: {
        openingBalance,
        totalDeposits,
        totalWithdrawals,
        closingBalance,
        currency,
      },
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages,
        limit,
      },
      transactions: formattedTransactions,
    };
  }

  // --- Advance Payments Aggregation & FIFO Matching ---
  async getAdvancePayments(
    companyId: string | undefined,
    filters: AdvancePaymentsFilterDTO = {},
  ): Promise<AdvancePaymentsResult> {
    const companyObjectId =
      companyId && Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : undefined;

    // Resolve Currency
    let currency = 'AED';
    if (companyObjectId) {
      const bankAcc = await BankAccountModel.findOne({ companyId: companyObjectId })
        .select('currency')
        .lean()
        .exec();
      if (bankAcc && bankAcc.currency) {
        currency = bankAcc.currency;
      }
    }

    const normalizeMethod = (method?: string): string => {
      if (!method) return 'Bank Transfer';
      const clean = method.trim().toLowerCase().replace(/[\s_-]+/g, '');
      if (clean === 'cash') return 'Cash';
      if (
        clean === 'banktransfer' ||
        clean === 'bank' ||
        clean === 'wire' ||
        clean === 'transfer'
      ) {
        return 'Bank Transfer';
      }
      if (clean === 'card' || clean === 'creditcard' || clean === 'credit card') {
        return 'Credit Card';
      }
      if (clean === 'debitcard' || clean === 'debit card') {
        return 'Debit Card';
      }
      if (clean === 'cheque' || clean === 'check') {
        return 'Cheque';
      }
      if (clean.includes('online') || clean.includes('gateway')) {
        return 'Online Payment';
      }
      if (clean === 'directdebit' || clean === 'direct debit') {
        return 'Direct Debit';
      }
      return method
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
    };

    const queryCompany: Record<string, any> = companyObjectId ? { companyId: companyObjectId } : {};

    // 1. Fetch non-cancelled receipts for company
    const dbReceipts = await ReceiptModel.find({
      ...queryCompany,
      status: { $nin: ['Cancelled', 'cancelled'] },
    })
      .sort({ date: 1, createdAt: 1 })
      .lean()
      .exec();

    // 2. Fetch non-cancelled invoices for company
    const [dbInvoices, dbTravelInvoices] = await Promise.all([
      InvoiceModel.find({
        ...queryCompany,
        status: { $nin: ['Cancelled', 'cancelled', 'Void'] },
      })
        .sort({ issue_date: 1, createdAt: 1 })
        .lean()
        .exec(),
      TravelInvoiceModel.find({
        ...queryCompany,
      })
        .sort({ createdAt: 1 })
        .lean()
        .exec(),
    ]);

    // Build unified customer identity mapping between ID and Name
    const nameToCanonicalKey = new Map<string, string>();
    const idToCanonicalKey = new Map<string, string>();

    const registerCustomerIdentity = (id?: any, name?: string) => {
      const idStr = id ? id.toString() : '';
      const cleanName = name ? name.trim().toLowerCase() : '';
      if (idStr && cleanName) {
        let canonical = idToCanonicalKey.get(idStr) || nameToCanonicalKey.get(cleanName) || idStr;
        idToCanonicalKey.set(idStr, canonical);
        nameToCanonicalKey.set(cleanName, canonical);
      } else if (idStr) {
        if (!idToCanonicalKey.has(idStr)) idToCanonicalKey.set(idStr, idStr);
      } else if (cleanName) {
        if (!nameToCanonicalKey.has(cleanName)) nameToCanonicalKey.set(cleanName, cleanName);
      }
    };

    dbReceipts.forEach((r) => registerCustomerIdentity(r.customerId, r.customerName));
    dbInvoices.forEach((i) => registerCustomerIdentity(i.customer_id, i.customer_name));
    dbTravelInvoices.forEach((t) => registerCustomerIdentity(t.customerId));

    const getCanonicalKey = (id?: any, name?: string): string => {
      const idStr = id ? id.toString() : '';
      const cleanName = name ? name.trim().toLowerCase() : '';
      if (idStr && idToCanonicalKey.has(idStr)) return idToCanonicalKey.get(idStr)!;
      if (cleanName && nameToCanonicalKey.has(cleanName)) return nameToCanonicalKey.get(cleanName)!;
      return idStr || cleanName || 'unknown';
    };

    // Group invoices by canonical customer key
    interface CustomerInvoiceRecord {
      id: string;
      amount: number;
      date: string;
      rawDate: Date;
    }

    const customerInvoicesMap = new Map<string, CustomerInvoiceRecord[]>();

    dbInvoices.forEach((inv) => {
      const key = getCanonicalKey(inv.customer_id, inv.customer_name);
      const amount = CurrencyPrecision.round(inv.grand_total || 0);
      if (amount > 0) {
        const dateStr =
          inv.issue_date || (inv.createdAt ? new Date(inv.createdAt).toISOString().split('T')[0] : '');
        const rawDate = inv.issue_date
          ? new Date(inv.issue_date)
          : inv.createdAt
          ? new Date(inv.createdAt)
          : new Date();
        const list = customerInvoicesMap.get(key) || [];
        list.push({
          id: inv.invoice_number || inv._id.toString(),
          amount,
          date: dateStr,
          rawDate,
        });
        customerInvoicesMap.set(key, list);
      }
    });

    dbTravelInvoices.forEach((trInv) => {
      const key = getCanonicalKey(trInv.customerId);
      const amount = CurrencyPrecision.round(trInv.amount || 0);
      if (amount > 0) {
        const rawDate = trInv.createdAt ? new Date(trInv.createdAt) : new Date();
        const dateStr = rawDate.toISOString().split('T')[0];
        const list = customerInvoicesMap.get(key) || [];
        list.push({
          id: trInv.invoiceNumber || trInv._id.toString(),
          amount,
          date: dateStr,
          rawDate,
        });
        customerInvoicesMap.set(key, list);
      }
    });

    // Sort customer invoices chronologically
    customerInvoicesMap.forEach((invList) => {
      invList.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
    });

    // Group receipts by canonical customer key
    const customerReceiptsMap = new Map<string, any[]>();
    dbReceipts.forEach((rec) => {
      const key = getCanonicalKey(rec.customerId, rec.customerName);
      const list = customerReceiptsMap.get(key) || [];
      list.push(rec);
      customerReceiptsMap.set(key, list);
    });

    interface CandidateAdvance {
      id: string;
      advanceId: string;
      customerName: string;
      customerId: string;
      dateReceived: string;
      rawDate: Date;
      paymentMethod: string;
      referenceTransaction: string;
      totalReceived: number;
      allocatedAmount: number;
      unallocatedBalance: number;
      status: string;
    }

    const allAdvances: CandidateAdvance[] = [];

    // 3. Run FIFO matching per customer
    customerReceiptsMap.forEach((receiptsList, key) => {
      // Sort receipts chronologically
      receiptsList.sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.date ? new Date(b.date) : b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateA.getTime() - dateB.getTime();
      });

      const customerInvoices = customerInvoicesMap.get(key) || [];
      const invoiceDues = customerInvoices.map((inv) => ({
        id: inv.id,
        remainingDue: inv.amount,
      }));

      for (const rec of receiptsList) {
        const totalReceived = CurrencyPrecision.round(rec.amount || 0);
        let allocatedAmount = 0;

        for (const inv of invoiceDues) {
          if (inv.remainingDue <= 0) continue;
          const available = CurrencyPrecision.round(totalReceived - allocatedAmount);
          if (available <= 0) break;

          const toAllocate = CurrencyPrecision.round(Math.min(inv.remainingDue, available));
          allocatedAmount = CurrencyPrecision.round(allocatedAmount + toAllocate);
          inv.remainingDue = CurrencyPrecision.round(inv.remainingDue - toAllocate);
        }

        const unallocatedBalance = CurrencyPrecision.round(
          Math.max(0, totalReceived - allocatedAmount),
        );

        let status = 'Unallocated';
        if (allocatedAmount === 0) {
          status = 'Unallocated';
        } else if (unallocatedBalance === 0 || allocatedAmount >= totalReceived) {
          status = 'Fully Allocated';
        } else {
          status = 'Partially Allocated';
        }

        const dateStr = rec.date
          ? rec.date.includes('T')
            ? rec.date.split('T')[0]
            : rec.date
          : rec.createdAt
          ? new Date(rec.createdAt).toISOString().split('T')[0]
          : '';
        const rawDate = rec.date
          ? new Date(rec.date)
          : rec.createdAt
          ? new Date(rec.createdAt)
          : new Date();

        allAdvances.push({
          id: '',
          advanceId: rec._id.toString(),
          customerName: rec.customerName || 'Unknown Customer',
          customerId: rec.customerId ? rec.customerId.toString() : '',
          dateReceived: dateStr,
          rawDate,
          paymentMethod: normalizeMethod(rec.paymentMethod),
          referenceTransaction: rec.transaction_reference || rec.reference || rec._id.toString(),
          totalReceived,
          allocatedAmount,
          unallocatedBalance,
          status,
        });
      }
    });

    // 4. Apply Filters
    let filtered = allAdvances;

    // Date Range Filters
    if (filters.startDate) {
      filtered = filtered.filter((adv) => adv.dateReceived >= filters.startDate!);
    }
    if (filters.endDate) {
      filtered = filtered.filter((adv) => adv.dateReceived <= filters.endDate!);
    }

    // Search Query Filter
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      filtered = filtered.filter(
        (adv) =>
          adv.customerName.toLowerCase().includes(q) ||
          adv.advanceId.toLowerCase().includes(q) ||
          adv.referenceTransaction.toLowerCase().includes(q) ||
          adv.paymentMethod.toLowerCase().includes(q) ||
          adv.status.toLowerCase().includes(q),
      );
    }

    // Status Filter
    if (filters.status && filters.status.toLowerCase() !== 'all') {
      const st = filters.status.toLowerCase().replace(/[\s_]+/g, '');
      if (st === 'unallocated') {
        filtered = filtered.filter((adv) => adv.status === 'Unallocated');
      } else if (st === 'partiallyallocated') {
        filtered = filtered.filter((adv) => adv.status === 'Partially Allocated');
      } else if (st === 'fullyallocated') {
        filtered = filtered.filter((adv) => adv.status === 'Fully Allocated');
      }
    }

    // 5. Sort advances descending (newest received first)
    filtered.sort((a, b) => {
      const timeDiff = b.rawDate.getTime() - a.rawDate.getTime();
      if (timeDiff !== 0) return timeDiff;
      return b.totalReceived - a.totalReceived;
    });

    // 6. Assign sequential human-readable IDs
    filtered.forEach((adv, index) => {
      adv.id = `ADV-${String(index + 1).padStart(2, '0')}`;
    });

    // 7. Calculate Summary KPIs
    const totalReceived = CurrencyPrecision.round(
      filtered.reduce((sum, adv) => sum + adv.totalReceived, 0),
    );
    const allocatedAmount = CurrencyPrecision.round(
      filtered.reduce((sum, adv) => sum + adv.allocatedAmount, 0),
    );
    const unallocatedBalance = CurrencyPrecision.round(totalReceived - allocatedAmount);

    // 8. Pagination
    const totalRecords = filtered.length;
    const page = Math.max(1, filters.page || 1);
    const limit = Math.max(1, filters.limit || 50);
    const totalPages = Math.ceil(totalRecords / limit) || 1;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    const formattedAdvances: AdvancePaymentItem[] = paginated.map((adv) => ({
      id: adv.id,
      advanceId: adv.advanceId,
      customerName: adv.customerName,
      customerId: adv.customerId,
      dateReceived: adv.dateReceived,
      paymentMethod: adv.paymentMethod,
      referenceTransaction: adv.referenceTransaction,
      totalReceived: adv.totalReceived,
      allocatedAmount: adv.allocatedAmount,
      unallocatedBalance: adv.unallocatedBalance,
      status: adv.status,
    }));

    return {
      summary: {
        totalReceived,
        allocatedAmount,
        unallocatedBalance,
        currency,
      },
      pagination: {
        totalRecords,
        currentPage: page,
        totalPages,
        limit,
      },
      advances: formattedAdvances,
    };
  }
}

