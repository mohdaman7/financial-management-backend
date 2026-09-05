import { TravelCustomerModel, ITravelCustomer } from '../models/TravelCustomer.model';
import { TravelBookingModel, ITravelBooking } from '../models/TravelBooking.model';
import { TravelProposalModel, ITravelProposal } from '../models/TravelProposal.model';
import { Types } from 'mongoose';

export class TravelRepository {
  // --- Customers ---
  async findCustomerById(id: string): Promise<ITravelCustomer | null> {
    return TravelCustomerModel.findById(id).exec();
  }

  async findCustomerByEmail(companyId: string, email: string): Promise<ITravelCustomer | null> {
    return TravelCustomerModel.findOne({
      companyId: new Types.ObjectId(companyId),
      email: email.toLowerCase(),
    }).exec();
  }

  async findCustomersByCompany(companyId: string): Promise<ITravelCustomer[]> {
    return TravelCustomerModel.find({ companyId: new Types.ObjectId(companyId) }).exec();
  }

  async createCustomer(data: Partial<ITravelCustomer>): Promise<ITravelCustomer> {
    const customer = new TravelCustomerModel(data);
    return customer.save();
  }

  async updateCustomer(
    id: string,
    data: Partial<ITravelCustomer>,
  ): Promise<ITravelCustomer | null> {
    return TravelCustomerModel.findByIdAndUpdate(id, data, { returnDocument: 'after' }).exec();
  }

  async deleteCustomer(id: string): Promise<ITravelCustomer | null> {
    return TravelCustomerModel.findByIdAndDelete(id).exec();
  }

  // --- Bookings ---
  async findBookingById(id: string): Promise<ITravelBooking | null> {
    return TravelBookingModel.findById(id).populate('customerId').exec();
  }

  async findBookingsByCompany(
    companyId: string,
    filters: { status?: string },
  ): Promise<ITravelBooking[]> {
    const query: any = { companyId: new Types.ObjectId(companyId) };
    if (filters.status) {
      query.status = filters.status;
    }
    return TravelBookingModel.find(query).populate('customerId').sort({ createdAt: -1 }).exec();
  }

  async createBooking(data: Partial<ITravelBooking>): Promise<ITravelBooking> {
    const booking = new TravelBookingModel(data);
    return booking.save();
  }

  async updateBooking(id: string, data: Partial<ITravelBooking>): Promise<ITravelBooking | null> {
    return TravelBookingModel.findByIdAndUpdate(id, data, { returnDocument: 'after' })
      .populate('customerId')
      .exec();
  }

  async deleteBooking(id: string): Promise<ITravelBooking | null> {
    return TravelBookingModel.findByIdAndDelete(id).exec();
  }

  // --- Proposals ---
  async findProposalById(id: string): Promise<ITravelProposal | null> {
    return TravelProposalModel.findById(id).populate('bookingId').exec();
  }

  async findProposalsByCompany(companyId: string): Promise<ITravelProposal[]> {
    return TravelProposalModel.find({ companyId: new Types.ObjectId(companyId) })
      .populate({ path: 'bookingId', populate: { path: 'customerId' } })
      .exec();
  }

  async createProposal(data: Partial<ITravelProposal>): Promise<ITravelProposal> {
    const proposal = new TravelProposalModel(data);
    return proposal.save();
  }

  async updateProposal(
    id: string,
    data: Partial<ITravelProposal>,
  ): Promise<ITravelProposal | null> {
    return TravelProposalModel.findByIdAndUpdate(id, data, { returnDocument: 'after' }).exec();
  }

  async deleteProposal(id: string): Promise<ITravelProposal | null> {
    return TravelProposalModel.findByIdAndDelete(id).exec();
  }

}
