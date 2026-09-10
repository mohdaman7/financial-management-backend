import mongoose from 'mongoose';
import { EmployeeModel } from './src/modules/employee/infrastructure/models/Employee.model';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
  const employees = await EmployeeModel.find();
  console.log('Employees found:', employees.length);
  employees.forEach(e => {
    console.log(`- ${e.firstName} ${e.lastName} | Dept: ${e.department} | Role: ${e.position} | Company: ${e.companyId}`);
  });
  process.exit(0);
});
