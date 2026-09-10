import dotenv from 'dotenv';
dotenv.config();

async function test() {
  const mongoose = require('mongoose');
  const { EmployeeModel } = require('./src/modules/employee/infrastructure/models/Employee.model');
  
  await mongoose.connect(process.env.MONGODB_URI);
  const emps = await EmployeeModel.find().lean().exec();
  console.log("Employees from DB:");
  console.log(JSON.stringify(emps, null, 2));
  process.exit(0);
}
test();
