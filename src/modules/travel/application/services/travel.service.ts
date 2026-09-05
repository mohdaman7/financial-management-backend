import { Types } from 'mongoose';
import { TravelRepository } from '../../infrastructure/repositories/travel.repository';
import { TransactionRepository } from '../../../finance/infrastructure/repositories/transaction.repository';
import { ITravelCustomer } from '../../infrastructure/models/TravelCustomer.model';
import { ITravelBooking } from '../../infrastructure/models/TravelBooking.model';
import { ITravelProposal } from '../../infrastructure/models/TravelProposal.model';
import { AppError } from '@shared/errors/AppError';

export class TravelService {
  constructor(
    private travelRepository: TravelRepository,
    private transactionRepository: TransactionRepository,
  ) {}

  // --- Customers ---
  async createCustomer(
    companyId: string,
    data: {
      name: string;
      email?: string;
      phone?: string;
      whatsapp?: string;
      passportNumber?: string;
      passport_number?: string;
      passport_expiry?: string;
      nationality?: string;
      country?: string;
      company_name?: string;
      assigned_employee_id?: string;
      assigned_agent?: string;
      lead_source?: string;
      status?: string;
      priority?: string;
      current_service?: string;
      tags?: string[];
      notes?: string;
      internal_notes?: string;
    },
  ): Promise<ITravelCustomer> {
    if (data.email) {
      const existing = await this.travelRepository.findCustomerByEmail(companyId, data.email);
      if (existing) {
        throw AppError.conflict('Customer with this email already exists');
      }
    }

    return this.travelRepository.createCustomer({
      ...data,
      companyId: new Types.ObjectId(companyId),
      status: data.status || 'lead',
      priority: data.priority || 'normal',
      passport_number: data.passport_number || data.passportNumber,
    });
  }

  async getCustomers(companyId: string): Promise<ITravelCustomer[]> {
    return this.travelRepository.findCustomersByCompany(companyId);
  }

  // --- Bookings ---
  async createBooking(
    companyId: string,
    data: {
      customerId: string;
      visaDetails?: any;
      flightDetails?: any;
      hotelDetails?: any;
      insuranceDetails?: any;
      packageDetails?: any;
    },
  ): Promise<ITravelBooking> {
    const customer = await this.travelRepository.findCustomerById(data.customerId);
    if (!customer) {
      throw AppError.notFound('Customer not found');
    }

    return this.travelRepository.createBooking({
      ...data,
      customerId: new Types.ObjectId(data.customerId),
      companyId: new Types.ObjectId(companyId),
      status: 'draft',
    });
  }

  async getBookings(companyId: string, filters: { status?: string }): Promise<ITravelBooking[]> {
    return this.travelRepository.findBookingsByCompany(companyId, filters);
  }

  async getBookingById(id: string): Promise<ITravelBooking> {
    const booking = await this.travelRepository.findBookingById(id);
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }
    return booking;
  }

  async updateBooking(id: string, data: any): Promise<ITravelBooking> {
    const booking = await this.travelRepository.findBookingById(id);
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    const updated = await this.travelRepository.updateBooking(id, data);
    if (!updated) {
      throw AppError.notFound('Booking not found');
    }
    return updated;
  }

  // --- Proposals ---
  async generateProposal(
    companyId: string,
    data: { bookingId: string; title: string; totalPrice: number; details?: string },
  ): Promise<ITravelProposal> {
    const booking = await this.travelRepository.findBookingById(data.bookingId);
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }

    const customerName = (booking.customerId as any)?.name || 'Valued Customer';
    const subtotal = Math.round((data.totalPrice / 1.05) * 100) / 100;
    const totalTax = Math.round((data.totalPrice - subtotal) * 100) / 100;

    const proposal = await this.travelRepository.createProposal({
      ...data,
      bookingId: new Types.ObjectId(data.bookingId),
      companyId: new Types.ObjectId(companyId),
      customerId: (booking.customerId as any)?._id || booking.customerId,
      customerName,
      subject: data.title,
      quoteRef: data.title,
      subtotal,
      totalTax,
      grandTotal: data.totalPrice,
      totalPrice: data.totalPrice,
      status: 'draft',
    });

    // Update booking status to quoted
    await this.travelRepository.updateBooking(data.bookingId, { status: 'quoted' });

    return proposal;
  }

  async getProposals(companyId: string): Promise<ITravelProposal[]> {
    return this.travelRepository.findProposalsByCompany(companyId);
  }

  async updateProposalStatus(
    id: string,
    status: 'draft' | 'sent' | 'approved' | 'rejected',
  ): Promise<ITravelProposal> {
    const proposal = await this.travelRepository.findProposalById(id);
    if (!proposal) {
      throw AppError.notFound('Proposal not found');
    }

    proposal.status = status;
    await proposal.save();

    if (status === 'approved') {
      const bookingId = (proposal.bookingId as any)._id || proposal.bookingId;
      // Automatically confirm the booking
      await this.travelRepository.updateBooking(bookingId.toString(), {
        status: 'confirmed',
      });
    }

    return proposal;
  }


  async getCustomerById(id: string): Promise<ITravelCustomer> {
    const customer = await this.travelRepository.findCustomerById(id);
    if (!customer) {
      throw AppError.notFound('Customer not found');
    }
    return customer;
  }

  async updateCustomer(id: string, data: Partial<ITravelCustomer>): Promise<ITravelCustomer> {
    const customer = await this.travelRepository.findCustomerById(id);
    if (!customer) {
      throw AppError.notFound('Customer not found');
    }
    const updated = await this.travelRepository.updateCustomer(id, data);
    if (!updated) {
      throw AppError.notFound('Customer not found');
    }
    return updated;
  }

  async deleteCustomer(id: string): Promise<void> {
    const customer = await this.travelRepository.findCustomerById(id);
    if (!customer) {
      throw AppError.notFound('Customer not found');
    }
    await this.travelRepository.deleteCustomer(id);
  }

  async deleteBooking(id: string): Promise<void> {
    const booking = await this.travelRepository.findBookingById(id);
    if (!booking) {
      throw AppError.notFound('Booking not found');
    }
    await this.travelRepository.deleteBooking(id);
  }

  async getProposalById(id: string): Promise<ITravelProposal> {
    const proposal = await this.travelRepository.findProposalById(id);
    if (!proposal) {
      throw AppError.notFound('Proposal not found');
    }
    return proposal;
  }

  async deleteProposal(id: string): Promise<void> {
    const proposal = await this.travelRepository.findProposalById(id);
    if (!proposal) {
      throw AppError.notFound('Proposal not found');
    }
    await this.travelRepository.deleteProposal(id);
  }
}
