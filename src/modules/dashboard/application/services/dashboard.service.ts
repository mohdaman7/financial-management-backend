import { AttendanceRepository } from '../../../attendance/infrastructure/repositories/attendance.repository';
import { EmployeeRepository } from '../../../employee/infrastructure/repositories/employee.repository';

export class DashboardService {
  constructor(
    private attendanceRepository: AttendanceRepository,
    private employeeRepository: EmployeeRepository,
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

    // Return merged stats (includes placeholders for Finance & Travel features)
    return {
      kpis: {
        revenue: 45200.0, // placeholder, to be populated in Phase 4
        profit: 12400.0, // placeholder, to be populated in Phase 4
        expenses: 32800.0, // placeholder, to be populated in Phase 4
        pendingPayments: 8400.0, // placeholder, to be populated in Phase 4
        totalEmployees,
        activeAttendanceToday,
      },
      attendanceRate: parseFloat(attendanceRate.toFixed(2)),
      recentTransactions: [
        {
          id: 'tx_placeholder_1',
          description: 'Client Invoice Payment - Company A',
          amount: 2500,
          type: 'income',
          date: new Date().toISOString(),
        },
        {
          id: 'tx_placeholder_2',
          description: 'Office rent & supplies',
          amount: 1200,
          type: 'expense',
          date: new Date().toISOString(),
        },
      ],
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
        visaPending: 12,
        ticketsIssued: 45,
        activeTours: 8,
      },
    };
  }
}
