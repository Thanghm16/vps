import { MongoClient, Db } from 'mongodb';

const uri = process.env.MONGODB_URI;
const options = {
  maxPoolSize: 10,
  minPoolSize: 0,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!uri) {
  clientPromise = new Promise((_, reject) => {
    reject(new Error('Vui lòng cung cấp biến môi trường MONGODB_URI trong file .env hoặc Vercel dashboard.'));
  });
  clientPromise.catch(() => {});
} else {
  // Trong cả môi trường development và production (Vercel Serverless),
  // sử dụng biến global để duy trì connection pool qua các warm invocation.
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
}

export default clientPromise;

export async function getDatabase(dbName?: string): Promise<Db> {
  if (!uri) {
    throw new Error('Vui lòng cung cấp biến môi trường MONGODB_URI trong file .env hoặc Vercel dashboard.');
  }
  const connectedClient = await clientPromise;
  return connectedClient.db(dbName);
}
