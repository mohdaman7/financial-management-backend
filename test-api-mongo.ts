import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.set('debug', true);

async function test() {
  const { EmployeeModel } = require('./src/modules/employee/infrastructure/models/Employee.model');
  await mongoose.connect(process.env.MONGODB_URI as string);
  console.log("Querying with companyId = undefined");
  const emps = await EmployeeModel.find({ companyId: undefined }).lean().exec();
  console.log("Found:", emps.length);
  process.exit(0);
}
test();
