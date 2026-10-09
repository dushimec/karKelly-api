import mongoose from 'mongoose'
import dns from 'node:dns'
import 'dotenv/config'

mongoose.set('strictQuery', false);

export const DBconnection = async () => {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    throw new Error("MONGO_URL is not set. Add your MongoDB connection URL to .env.");
  }

  if (process.env.MONGODB_DNS_SERVER) {
    dns.setServers([process.env.MONGODB_DNS_SERVER]);
  }

  await mongoose.connect(mongoUrl);
  console.log('Database Connection is ready.....');
}