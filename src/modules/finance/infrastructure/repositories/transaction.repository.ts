import { TransactionModel, ITransaction } from '../models/Transaction.model';
import { Types } from 'mongoose';

export class TransactionRepository {
  async findById(id: string): Promise<ITransaction | null> {
    return TransactionModel.findById(id).exec();
  }

  async findByCompany(
    companyId: string,
    filters: { type?: string; startDate?: Date; endDate?: Date; category?: string },
  ): Promise<ITransaction[]> {
    const query: any = { companyId: new Types.ObjectId(companyId) };

    if (filters.type) {
      query.type = filters.type;
    }

    if (filters.startDate || filters.endDate) {
      query.date = {};
      if (filters.startDate) {
        query.date.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.date.$lte = filters.endDate;
      }
    }

    if (filters.category) {
      query.category = filters.category;
    }

    return TransactionModel.find(query).sort({ date: -1 }).exec();
  }

  async create(data: Partial<ITransaction>): Promise<ITransaction> {
    const transaction = new TransactionModel(data);
    return transaction.save();
  }

  async update(id: string, data: Partial<ITransaction>): Promise<ITransaction | null> {
    return TransactionModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<ITransaction | null> {
    return TransactionModel.findByIdAndDelete(id).exec();
  }

  async getSummary(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ totalIncome: number; totalExpense: number; totalTax: number }> {
    const results = await TransactionModel.aggregate([
      {
        $match: {
          companyId: new Types.ObjectId(companyId),
          status: 'completed',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          totalTax: { $sum: '$taxAmount' },
        },
      },
    ]);

    let totalIncome = 0;
    let totalExpense = 0;
    let totalTax = 0;

    for (const group of results) {
      totalTax += group.totalTax;
      if (group._id === 'income') {
        totalIncome = group.totalAmount;
      } else if (group._id === 'expense') {
        totalExpense = group.totalAmount;
      }
    }

    return { totalIncome, totalExpense, totalTax };
  }
}
