import { BankAccountModel, IBankAccount } from '../models/BankAccount.model';
import { Types } from 'mongoose';

export class BankAccountRepository {
  async findById(id: string): Promise<IBankAccount | null> {
    return BankAccountModel.findById(id).exec();
  }

  async findByCompany(companyId: string): Promise<IBankAccount[]> {
    return BankAccountModel.find({ companyId: new Types.ObjectId(companyId) }).exec();
  }

  async create(data: Partial<IBankAccount>): Promise<IBankAccount> {
    const bankAccount = new BankAccountModel(data);
    return bankAccount.save();
  }

  async update(id: string, data: Partial<IBankAccount>): Promise<IBankAccount | null> {
    return BankAccountModel.findByIdAndUpdate(id, data, { new: true }).exec();
  }

  async delete(id: string): Promise<IBankAccount | null> {
    return BankAccountModel.findByIdAndDelete(id).exec();
  }
}
