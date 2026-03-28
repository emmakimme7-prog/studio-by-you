import { MongoClient } from "mongodb";

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const uri = process.env.MONGODB_URI;

export const SITE_CONTENT_COLLECTION = "portfolio_site_content";
export const SITE_CONTENT_DOCUMENT_ID = "site-content";

export function hasMongoConfig() {
  return Boolean(uri);
}

export function getMongoClient() {
  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
      socketTimeoutMS: 10000,
    });
    global._mongoClientPromise = client.connect().catch((err) => {
      global._mongoClientPromise = undefined;
      throw err;
    });
  }

  return global._mongoClientPromise;
}

export async function getMongoDatabase() {
  const client = await getMongoClient();
  return client.db();
}
