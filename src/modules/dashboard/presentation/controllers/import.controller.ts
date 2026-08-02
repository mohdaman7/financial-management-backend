import { Request, Response, NextFunction } from 'express';
import { CustomerModel } from '@modules/customer/infrastructure/models/Customer.model';
import { TransactionModel } from '@modules/finance/infrastructure/models/Transaction.model';
import { parseCSV } from '@shared/utils/csvParser';
import { ResponseFormatter } from '@shared/utils/responseFormatter';
import { AppError } from '@shared/errors/AppError';
import { Types } from 'mongoose';

export class ImportController {
  importCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw AppError.badRequest('No CSV file uploaded');
      }

      const csvText = req.file.buffer.toString('utf-8');
      const parsed = parseCSV(csvText);

      if (parsed.length < 2) {
        throw AppError.badRequest('CSV file is empty or missing header row');
      }

      const headers = parsed[0].map((h) => h.toLowerCase());
      const nameIndex = headers.indexOf('name');
      const emailIndex = headers.indexOf('email');
      const phoneIndex = headers.indexOf('phone');
      const countryIndex = headers.indexOf('country');

      if (nameIndex === -1 || emailIndex === -1) {
        throw AppError.badRequest('CSV must contain at least "name" and "email" columns');
      }

      const customersToInsert: any[] = [];
      const companyId = new Types.ObjectId(req.companyId);

      for (let i = 1; i < parsed.length; i++) {
        const row = parsed[i];
        if (row.length < headers.length) continue;

        const name = row[nameIndex];
        const email = row[emailIndex];
        const phone = phoneIndex !== -1 ? row[phoneIndex] : '';
        const country = countryIndex !== -1 ? row[countryIndex] : '';

        if (!name || !email) continue;

        customersToInsert.push({
          companyId,
          name,
          email: email.toLowerCase(),
          phone,
          country,
          status: 'new_lead',
          documents: [],
        });
      }

      if (customersToInsert.length === 0) {
        throw AppError.badRequest('No valid customer records found in CSV');
      }

      // Bulk write to prevent duplicate email issues for the company
      let insertedCount = 0;
      for (const customer of customersToInsert) {
        try {
          await CustomerModel.findOneAndUpdate(
            { companyId: customer.companyId, email: customer.email },
            { $setOnInsert: customer },
            { upsert: true, new: true },
          );
          insertedCount++;
        } catch (err) {
          // Skip individual errors (e.g. duplicate keys)
        }
      }

      res.status(200).json(
        ResponseFormatter.success({
          message: `${insertedCount} customers imported successfully`,
          count: insertedCount,
        }),
      );
    } catch (error) {
      next(error);
    }
  };

  importTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw AppError.badRequest('No CSV file uploaded');
      }

      const csvText = req.file.buffer.toString('utf-8');
      const parsed = parseCSV(csvText);

      if (parsed.length < 2) {
        throw AppError.badRequest('CSV file is empty or missing header row');
      }

      const headers = parsed[0].map((h) => h.toLowerCase());
      const typeIndex = headers.indexOf('type'); // income / expense
      const categoryIndex = headers.indexOf('category');
      const amountIndex = headers.indexOf('amount');
      const methodIndex = headers.indexOf('paymentmethod');

      if (typeIndex === -1 || categoryIndex === -1 || amountIndex === -1 || methodIndex === -1) {
        throw AppError.badRequest('CSV must contain "type", "category", "amount", and "paymentMethod" columns');
      }

      const transactionsToInsert: any[] = [];
      const companyId = new Types.ObjectId(req.companyId);

      for (let i = 1; i < parsed.length; i++) {
        const row = parsed[i];
        if (row.length < headers.length) continue;

        const type = row[typeIndex].toLowerCase();
        const category = row[categoryIndex];
        const amount = parseFloat(row[amountIndex]);
        const paymentMethod = row[methodIndex].toLowerCase();

        if (
          (type !== 'income' && type !== 'expense') ||
          !category ||
          isNaN(amount) ||
          !['cash', 'bank_transfer', 'card', 'other'].includes(paymentMethod)
        ) {
          continue;
        }

        transactionsToInsert.push({
          companyId,
          type,
          category,
          amount,
          paymentMethod,
          status: 'completed',
          date: new Date(),
        });
      }

      if (transactionsToInsert.length === 0) {
        throw AppError.badRequest('No valid transaction records found in CSV');
      }

      const result = await TransactionModel.insertMany(transactionsToInsert);

      res.status(200).json(
        ResponseFormatter.success({
          message: `${result.length} transactions imported successfully`,
          count: result.length,
        }),
      );
    } catch (error) {
      next(error);
    }
  };
}
