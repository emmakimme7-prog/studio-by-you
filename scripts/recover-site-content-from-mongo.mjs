import fs from "fs";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not configured.");
}

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 10000,
});

try {
  await client.connect();
  const db = client.db();
  const doc = await db.collection("portfolio_site_content").findOne({ _id: "site-content" });

  if (!doc?.content) {
    throw new Error("site-content not found");
  }

  fs.copyFileSync("data/site-content.json", "/tmp/site-content.before-recovery.json");
  fs.writeFileSync("data/site-content.json", JSON.stringify(doc.content, null, 2) + "\n", "utf8");
  console.log("recovered");
} finally {
  await client.close();
}
