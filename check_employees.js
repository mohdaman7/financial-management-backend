const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const users = await mongoose.connection.collection('users').find({}).toArray();
  console.log("Users:", users.map(u => ({ email: u.email, name: u.name, full_name: u.full_name })));
  
  const emps = await mongoose.connection.collection('employees').find({}).toArray();
  console.log("Employees:", emps.map(e => ({ name: e.name, full_name: e.full_name })));
  
  process.exit(0);
}
run().catch(console.error);
