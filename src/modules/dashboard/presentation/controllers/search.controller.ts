import { Request, Response, NextFunction } from 'express';
import { CustomerModel } from '@modules/customer/infrastructure/models/Customer.model';
import { ServiceModel } from '@modules/service/infrastructure/models/Service.model';
import { TransactionModel } from '@modules/finance/infrastructure/models/Transaction.model';
import { TravelBookingModel } from '@modules/travel/infrastructure/models/TravelBooking.model';
import { Types } from 'mongoose';
import { ResponseFormatter } from '@shared/utils/responseFormatter';

export class SearchController {
  search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const companyId = req.companyId as string;
      const query = (req.query.q as string) || '';

      if (!query) {
        res.status(200).json(
          ResponseFormatter.success({
            customers: [],
            services: [],
            transactions: [],
            bookings: [],
          }),
        );
        return;
      }

      const companyObjectId = new Types.ObjectId(companyId);
      const regex = new RegExp(query, 'i');

      // Execute search queries in parallel
      const [customers, services, transactions, bookings] = await Promise.all([
        CustomerModel.find({
          companyId: companyObjectId,
          $or: [{ name: regex }, { email: regex }, { phone: regex }],
        })
          .limit(10)
          .exec(),
        ServiceModel.find({
          companyId: companyObjectId,
          $or: [{ serviceName: regex }, { category: regex }, { description: regex }],
        })
          .limit(10)
          .exec(),
        TransactionModel.find({
          companyId: companyObjectId,
          $or: [{ category: regex }, { reference: regex }, { description: regex }],
        })
          .limit(10)
          .exec(),
        TravelBookingModel.find({
          companyId: companyObjectId,
          $or: [{ destination: regex }, { hotel: regex }, { visaType: regex }],
        })
          .limit(10)
          .exec(),
      ]);

      res.status(200).json(
        ResponseFormatter.success({
          customers,
          services,
          transactions,
          bookings,
        }),
      );
    } catch (error) {
      next(error);
    }
  };
}
