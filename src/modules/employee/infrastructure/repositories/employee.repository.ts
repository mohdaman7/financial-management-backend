import { EmployeeModel, IEmployee } from '../models/Employee.model';

export class EmployeeRepository {
  async findById(id: string): Promise<IEmployee | null> {
    return EmployeeModel.findById(id).populate('userId').exec();
  }

  async findByUserId(userId: string): Promise<IEmployee | null> {
    return EmployeeModel.findOne({ userId }).populate('userId').exec();
  }

  async findByCompanyId(companyId: string): Promise<IEmployee[]> {
    return EmployeeModel.find({ companyId }).populate('userId').exec();
  }

  async create(data: Partial<IEmployee>): Promise<IEmployee> {
    const employee = new EmployeeModel(data);
    return employee.save();
  }

  async update(id: string, data: Partial<IEmployee>): Promise<IEmployee | null> {
    return EmployeeModel.findByIdAndUpdate(id, data, { new: true }).populate('userId').exec();
  }

  async delete(id: string): Promise<IEmployee | null> {
    return EmployeeModel.findByIdAndDelete(id).exec();
  }
}
