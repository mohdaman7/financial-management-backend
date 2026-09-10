require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const { EmployeeModel } = require('./src/modules/employee/infrastructure/models/Employee.model');
  const res = await EmployeeModel.find({ companyId: undefined }).lean().exec();
  console.log("Result:", JSON.stringify(res, null, 2));
  process.exit(0);
});
