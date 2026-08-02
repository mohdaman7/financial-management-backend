import { Types } from 'mongoose';
import { TransactionRepository } from '../../infrastructure/repositories/transaction.repository';
import { ITransaction } from '../../infrastructure/models/Transaction.model';
import { AppError } from '@shared/errors/AppError';

export class FinanceService {
  constructor(private transactionRepository: TransactionRepository) {}

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
    },
  ): Promise<ITransaction> {
    return this.transactionRepository.create({
      ...data,
      companyId: new Types.ObjectId(companyId),
      date: data.date || new Date(),
    });
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

    const updated = await this.transactionRepository.update(id, data);
    if (!updated) {
      throw AppError.notFound('Transaction not found');
    }
    return updated;
  }

  async deleteTransaction(id: string): Promise<void> {
    const transaction = await this.transactionRepository.findById(id);
    if (!transaction) {
      throw AppError.notFound('Transaction not found');
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
}
