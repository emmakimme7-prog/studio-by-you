/**
 * MongoDB에 저장된 base64 이미지를 재압축하는 스크립트
 * 실행: node scripts/recompress-images.mjs
 */

import { MongoClient } from "mongodb";
import sharp from "sharp";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../.env.local");

// .env.local에서 MONGODB_URI 로드
const envContent = readFileSync(envPath, "utf-8");
const mongoUriMatch = envContent.match(/^MONGODB_URI=(.+)$/m);
if (!mongoUriMatch) {
  console.error("MONGODB_URI를 .env.local에서 찾을 수 없습니다.");
  process.exit(1);
}
const MONGODB_URI = mongoUriMatch[1].replace(/^["']|["']$/g, "");

const COLLECTION = "portfolio_site_content";
const DOC_ID = "site-content";
const MAX_WIDTH = 1200;
const QUALITY = 65; // 기존 82 → 65로 대폭 감소

async function compressDataUrl(dataUrl, label) {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    return null; // URL 경로이거나 비어있으면 건드리지 않음
  }

  const base64 = dataUrl.split(",")[1];
  const buffer = Buffer.from(base64, "base64");
  const originalKB = Math.round(buffer.length / 1024);

  try {
    const compressed = await sharp(buffer)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();

    const compressedKB = Math.round(compressed.length / 1024);
    const ratio = Math.round((1 - compressed.length / buffer.length) * 100);
    console.log(`  ${label}: ${originalKB}KB → ${compressedKB}KB (${ratio}% 감소)`);

    return `data:image/jpeg;base64,${compressed.toString("base64")}`;
  } catch {
    console.log(`  ${label}: 압축 실패 (원본 유지)`);
    return null;
  }
}

async function main() {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  try {
    await client.connect();
    console.log("MongoDB 연결 완료\n");

    const db = client.db();
    const collection = db.collection(COLLECTION);
    const doc = await collection.findOne({ _id: DOC_ID });

    if (!doc?.content) {
      console.error("콘텐츠를 찾을 수 없습니다.");
      return;
    }

    const content = doc.content;
    let totalSaved = 0;
    let changed = false;

    // 브랜드 로고
    console.log("[ 브랜드 로고 ]");
    const logo = await compressDataUrl(content.brand?.logo, "logo");
    if (logo) { content.brand.logo = logo; changed = true; }

    // 포트폴리오 썸네일
    console.log("\n[ 포트폴리오 썸네일 ]");
    for (let i = 0; i < (content.projects?.length ?? 0); i++) {
      const p = content.projects[i];
      const thumb = await compressDataUrl(p.thumbnailImage, `project[${i}] ${p.title}`);
      if (thumb) { content.projects[i].thumbnailImage = thumb; changed = true; }

      // 상세 이미지
      for (let j = 0; j < (p.detailImages?.length ?? 0); j++) {
        const detail = await compressDataUrl(p.detailImages[j], `  detail[${i}][${j}]`);
        if (detail) { content.projects[i].detailImages[j] = detail; changed = true; }
      }
    }

    // 진행방식 이미지
    console.log("\n[ 진행방식 ]");
    for (let i = 0; i < (content.processSteps?.length ?? 0); i++) {
      const step = content.processSteps[i];
      const img = await compressDataUrl(step.image, `step[${i}] ${step.title}`);
      if (img) { content.processSteps[i].image = img; changed = true; }
    }

    // 서비스 이미지
    console.log("\n[ 운영 서비스 ]");
    for (let i = 0; i < (content.operatedServices?.length ?? 0); i++) {
      const svc = content.operatedServices[i];
      const img = await compressDataUrl(svc.image, `service[${i}] ${svc.title}`);
      if (img) { content.operatedServices[i].image = img; changed = true; }
    }

    if (!changed) {
      console.log("\n재압축할 base64 이미지가 없습니다 (모두 URL 경로).");
      return;
    }

    // 저장
    console.log("\nMongoDB에 저장 중...");
    await collection.updateOne(
      { _id: DOC_ID },
      { $set: { content, updatedAt: new Date() } },
    );

    // 저장 후 크기 확인
    const updated = await collection.findOne({ _id: DOC_ID });
    const docSize = Buffer.byteLength(JSON.stringify(updated?.content ?? {}));
    console.log(`\n✅ 완료! 문서 크기: ${Math.round(docSize / 1024)}KB (${Math.round(docSize / 1024 / 1024 * 10) / 10}MB)`);

  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error("오류:", err.message);
  process.exit(1);
});
