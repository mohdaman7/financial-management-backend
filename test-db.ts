import mongoose from 'mongoose';
import { EmployeeModel } from './src/modules/employee/infrastructure/models/Employee.model';

mongoose.connect('mongodb://127.0.0.1:27017/skyfall_financial').then(async () => {
  const employees = await EmployeeModel.find();
  console.log('Employees found:', employees.length);
  employees.forEach(e => {
    console.log(`- ${e.firstName} ${e.lastName} | Dept: ${e.department} | Role: ${e.position}`);
  });
  process.exit(0);
});
