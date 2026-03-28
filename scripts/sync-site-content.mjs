import { MongoClient } from "mongodb";

const collectionName = "portfolio_site_content";
const documentId = "site-content";

function requiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} 환경변수가 필요합니다.`);
  }

  return value;
}

async function main() {
  const sourceUri = requiredEnv("SYNC_SOURCE_MONGODB_URI");
  const targetUri = requiredEnv("SYNC_TARGET_MONGODB_URI");

  const sourceClient = new MongoClient(sourceUri);
  const targetClient = new MongoClient(targetUri);

  try {
    await sourceClient.connect();
    await targetClient.connect();

    const sourceDoc = await sourceClient
      .db()
      .collection(collectionName)
      .findOne({ _id: documentId });

    if (!sourceDoc?.content) {
      throw new Error("개발 DB에 동기화할 site-content 문서가 없습니다.");
    }

    await targetClient
      .db()
      .collection(collectionName)
      .updateOne(
        { _id: documentId },
        {
          $set: {
            content: sourceDoc.content,
            updatedAt: new Date(),
          },
        },
        { upsert: true },
      );

    const inquiryCount = Array.isArray(sourceDoc.content?.contact?.inquiries)
      ? sourceDoc.content.contact.inquiries.length
      : 0;
    const projectCount = Array.isArray(sourceDoc.content?.projects)
      ? sourceDoc.content.projects.length
      : 0;

    console.log(
      `동기화 완료: projects=${projectCount}, inquiries=${inquiryCount}, source -> target`,
    );
  } finally {
    await Promise.allSettled([sourceClient.close(), targetClient.close()]);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "동기화 중 오류가 발생했습니다.");
  process.exit(1);
});
