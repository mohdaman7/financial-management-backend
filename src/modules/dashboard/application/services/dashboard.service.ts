import { InvoiceModel } from '../../../finance/infrastructure/models/Invoice.model';
import { ReceiptModel } from '../../../finance/infrastructure/models/Receipt.model';
import { AttendanceRepository } from '../../../attendance/infrastructure/repositories/attendance.repository';
import { EmployeeRepository } from '../../../employee/infrastructure/repositories/employee.repository';
import { TransactionRepository } from '../../../finance/infrastructure/repositories/transaction.repository';
import { CurrencyPrecision } from '@shared/utils/currencyPrecision';
import { Types } from 'mongoose';

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
      if (tx.status === 'completed' && tx.type === 'income') {
        revenue += tx.amount;
      } else if (tx.status === 'completed' && tx.type === 'expense') {
        expenses += tx.amount;
      } else if (tx.status === 'pending') {
        pendingPayments += tx.amount;
      }
    }

    const profit = revenue - expenses;
    let recentTransactions = invoices.slice(0, 5).map((inv) => ({
      id: inv._id.toString(),
      description: `Invoice #${inv.invoice_number} - ${inv.customer_name}`,
      amount: inv.grand_total,
      type: 'income',
      date: inv.createdAt ? inv.createdAt.toISOString() : new Date().toISOString(),
    }));

    if (recentTransactions.length === 0) {
      recentTransactions = txs.slice(0, 5).map((tx) => ({
        id: tx._id.toString(),
        description: `Transaction - ${tx.category}`,
        amount: tx.amount,
        type: tx.type,
        date: tx.createdAt ? (tx as any).createdAt.toISOString() : new Date().toISOString(),
      }));
    }

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

  async getFinancialSummary(companyId?: string): Promise<{
    totalRevenue: number;
    totalReceived: number;
    outstanding: number;
    advanceTotal: number;
    todaySales: number;
    monthSales: number;
    paidCount: number;
    totalInvoices: number;
    avgRevenue: number;
    conversionRate: string;
    chartData: Array<{ day: string; revenue: number; bookings: number }>;
    employeeSales: Array<{ name: string; value: number }>;
  }> {
    const companyObjectId =
      companyId && Types.ObjectId.isValid(companyId) ? new Types.ObjectId(companyId) : undefined;
    const queryCompany: Record<string, any> = companyObjectId
      ? { $or: [{ companyId: companyObjectId }, { companyId: null }] }
      : {};

    const [invoices, receipts] = await Promise.all([
      InvoiceModel.find({
        ...queryCompany,
        status: { $nin: ['Cancelled', 'cancelled', 'Void', 'void'] },
      }).lean().exec(),
      ReceiptModel.find({
        ...queryCompany,
        status: { $nin: ['Cancelled', 'cancelled'] },
      }).lean().exec(),
    ]);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let totalRevenue = 0;
    let todaySales = 0;
    let monthSales = 0;
    let paidCount = 0;
    let invoiceDepositTotal = 0;

    const employeeMap = new Map<string, number>();

    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartMap = new Map<string, { revenue: number; bookings: number }>();
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach((d) => {
      chartMap.set(d, { revenue: 0, bookings: 0 });
    });

    for (const inv of invoices) {
      const amount = CurrencyPrecision.round(inv.grand_total || 0);
      totalRevenue += amount;
      if (inv.advance_paid && inv.advance_paid > 0) {
        invoiceDepositTotal += inv.advance_paid;
      }

      const invDate = inv.issue_date || (inv.createdAt ? new Date(inv.createdAt).toISOString().split('T')[0] : '');
      const rawDate = inv.issue_date ? new Date(inv.issue_date) : inv.createdAt ? new Date(inv.createdAt) : now;

      if (invDate === todayStr) {
        todaySales += amount;
      }
      if (rawDate.getFullYear() === currentYear && rawDate.getMonth() === currentMonth) {
        monthSales += amount;
      }

      if (inv.status === 'Paid' || (inv.balance_amount !== undefined && inv.balance_amount <= 0 && amount > 0)) {
        paidCount++;
      }

      const emp = inv.lead_owner || inv.lead_by || 'Unassigned';
      employeeMap.set(emp, CurrencyPrecision.round((employeeMap.get(emp) || 0) + amount));

      const dayName = daysOfWeek[rawDate.getDay()];
      const dayData = chartMap.get(dayName);
      if (dayData) {
        dayData.revenue = CurrencyPrecision.round(dayData.revenue + amount);
      }
    }

    let receiptTotal = 0;
    for (const rec of receipts) {
      receiptTotal += CurrencyPrecision.round(rec.amount || 0);
    }

    const totalReceived = CurrencyPrecision.round(receiptTotal + invoiceDepositTotal);
    totalRevenue = CurrencyPrecision.round(totalRevenue);
    todaySales = CurrencyPrecision.round(todaySales);
    monthSales = CurrencyPrecision.round(monthSales);

    const outstanding = CurrencyPrecision.round(Math.max(0, totalRevenue - totalReceived));
    const advanceTotal = CurrencyPrecision.round(Math.max(0, totalReceived - totalRevenue));
    const totalInvoices = invoices.length;
    const avgRevenue = totalInvoices > 0 ? CurrencyPrecision.round(totalRevenue / totalInvoices) : 0;
    const conversionRate = totalInvoices > 0 ? ((paidCount / totalInvoices) * 100).toFixed(1) : '0.0';

    const chartData = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
      const entry = chartMap.get(day) || { revenue: 0, bookings: 0 };
      return {
        day,
        revenue: entry.revenue,
        bookings: entry.bookings,
      };
    });

    const employeeSales: Array<{ name: string; value: number }> = [];
    employeeMap.forEach((value, name) => {
      employeeSales.push({ name, value: CurrencyPrecision.round(value) });
    });
    employeeSales.sort((a, b) => b.value - a.value);

    return {
      totalRevenue,
      totalReceived,
      outstanding,
      advanceTotal,
      todaySales,
      monthSales,
      paidCount,
      totalInvoices,
      avgRevenue,
      conversionRate,
      chartData,
      employeeSales,
    };
  }
}
