import { InvoiceModel } from '../../../finance/infrastructure/models/Invoice.model';
import { AttendanceRepository } from '../../../attendance/infrastructure/repositories/attendance.repository';
import { EmployeeRepository } from '../../../employee/infrastructure/repositories/employee.repository';
import { TransactionRepository } from '../../../finance/infrastructure/repositories/transaction.repository';

export class DashboardService {
  constructor(
    private attendanceRepository: AttendanceRepository,
    private employeeRepository: EmployeeRepository,
    private transactionRepository: TransactionRepository,
  ) {}

  async getCompanyMetrics(companyId: string): Promise<{
    kpis: {
      revenue: number;
      profit: number;
      expenses: number;
      pendingPayments: number;
      totalEmployees: number;
      activeAttendanceToday: number;
    };
    attendanceRate: number;
    recentTransactions: any[];
    salesAnalytics: {
      labels: string[];
      datasets: { label: string; data: number[] }[];
    };
    travelAnalytics: {
      visaPending: number;
      ticketsIssued: number;
      activeTours: number;
    };
  }> {
    // 1. Get total employees
    const employees = await this.employeeRepository.findByCompanyId(companyId);
    const totalEmployees = employees.length;

    // 2. Get today's attendance
    const todayStr = new Date().toISOString().split('T')[0];
    const attendanceToday = await this.attendanceRepository.findByCompanyAndDate(
      companyId,
      todayStr,
    );
    const activeAttendanceToday = attendanceToday.length;

    const attendanceRate = totalEmployees > 0 ? (activeAttendanceToday / totalEmployees) * 100 : 0;

    // 3. Get invoices and compute real KPIs from InvoiceModel
    const invoices = await InvoiceModel.find({ companyId });
    let revenue = 0;
    let expenses = 0;
    let pendingPayments = 0;

    for (const inv of invoices) {
      if (inv.status === 'Paid' || inv.status === 'Partially Paid') {
        revenue += inv.paid_amount || inv.grand_total || 0;
      } else if (inv.status === 'Pending') {
        pendingPayments += inv.balance_amount || inv.grand_total || 0;
      }
    }

    const txs = await this.transactionRepository.findByCompany(companyId, {});
    for (const tx of txs) {
      if (tx.status === 'completed' && tx.type === 'expense') {
        expenses += tx.amount;
      }
    }

    const profit = revenue - expenses;
    const recentTransactions = invoices.slice(0, 5).map((inv) => ({
      id: inv._id.toString(),
      description: `Invoice #${inv.invoice_number} - ${inv.customer_name}`,
      amount: inv.grand_total,
      type: 'income',
      date: inv.createdAt ? inv.createdAt.toISOString() : new Date().toISOString(),
    }));

    // 4. Get travel bookings and compute actual travel metrics
    const travelBookings =
      await require('../../../travel/infrastructure/models/TravelBooking.model').TravelBookingModel.find(
        { companyId },
      );
    let visaPending = 0;
    let ticketsIssued = 0;
    let activeTours = 0;

    for (const b of travelBookings) {
      if (b.visaDetails && b.visaDetails.status === 'pending') {
        visaPending++;
      }
      if (b.flightDetails && b.flightDetails.ticketNumber) {
        ticketsIssued++;
      }
      if (b.status === 'confirmed') {
        activeTours++;
      }
    }

    return {
      kpis: {
        revenue: parseFloat(revenue.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        expenses: parseFloat(expenses.toFixed(2)),
        pendingPayments: parseFloat(pendingPayments.toFixed(2)),
        totalEmployees,
        activeAttendanceToday,
      },
      attendanceRate: parseFloat(attendanceRate.toFixed(2)),
      recentTransactions,
      salesAnalytics: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Sales Revenue',
            data: [12000, 19000, 3000, 5000, 20000, 30000],
          },
        ],
      },
      travelAnalytics: {
        visaPending,
        ticketsIssued,
        activeTours,
      },
    };
  }
}
