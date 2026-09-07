const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const c = await mongoose.connection.collection('customers').findOne({ name: 'Angad KT' });
  console.log("Angad KT customer details:", c);
  
  process.exit(0);
}
run().catch(console.error);
