import 'dotenv/config';
import mongoose from 'mongoose';
import { config } from '../src/config';

async function checkStatus() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    const db = mongoose.connection.db;
    if (!db) {
      console.log('No DB instance found.');
      return;
    }
    const collections = await db.collections();
    console.log('\n=============================================');
    console.log('       CURRENT MONGODB DATABASE AUDIT        ');
    console.log('=============================================');
    for (const c of collections) {
      const count = await c.countDocuments();
      console.log(`${c.collectionName.padEnd(25)} : ${count} documents`);
    }
    console.log('=============================================\n');
  } catch (err) {
    console.error('Error during DB audit:', err);
  } finally {
    await mongoose.disconnect();
  }
}

checkStatus();
