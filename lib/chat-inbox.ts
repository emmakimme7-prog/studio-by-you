import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { getMongoDatabase, hasMongoConfig } from "@/lib/mongodb";

export type ChatMessageSender = "user" | "admin";
export type ChatConversationStatus = "new" | "answered" | "closed";

export type ChatMessage = {
  id: string;
  sender: ChatMessageSender;
  text: string;
  imageDataUrl?: string;
  createdAt: string;
};

export type ChatConversation = {
  id: string;
  createdAt: string;
  updatedAt: string;
  intent: string;
  name: string;
  phone: string;
  source: "widget";
  status: ChatConversationStatus;
  consentAcceptedAt: string | null;
  messages: ChatMessage[];
};

type LegacyChatInquiry = {
  id?: string;
  createdAt?: string;
  intent?: string;
  name?: string;
  phone?: string;
  message?: string;
  source?: "widget";
  status?: "new" | "done";
};

type ChatConversationDocument = ChatConversation & {
  _id?: string;
};

const CHAT_COLLECTION = "site_chat_inquiries";
const chatConversationsPath = path.join(process.cwd(), "data", "chat-inquiries.json");

function normalizeMessage(input: Partial<ChatMessage> | undefined, index: number): ChatMessage {
  return {
    id: input?.id || `message-${index + 1}`,
    sender: input?.sender === "admin" ? "admin" : "user",
    text: input?.text || "",
    imageDataUrl: typeof input?.imageDataUrl === "string" ? input.imageDataUrl : undefined,
    createdAt: input?.createdAt || new Date(0).toISOString(),
  };
}

function normalizeLegacy(input: LegacyChatInquiry, index: number): ChatConversation {
  const createdAt = input.createdAt || new Date(0).toISOString();
  return {
    id: input.id || `chat-${index + 1}`,
    createdAt,
    updatedAt: createdAt,
    intent: input.intent || "빠른 문의",
    name: input.name || "",
    phone: input.phone || "",
    source: "widget",
    status: input.status === "done" ? "answered" : "new",
    consentAcceptedAt: createdAt,
    messages: input.message
      ? [
          {
            id: `message-${index + 1}`,
            sender: "user",
            text: input.message,
            createdAt,
          },
        ]
      : [],
  };
}

function normalizeConversation(input: Partial<ChatConversation> | LegacyChatInquiry | undefined, index: number): ChatConversation {
  if (!input) {
    return normalizeLegacy({}, index);
  }

  if (!Array.isArray((input as ChatConversation).messages)) {
    return normalizeLegacy(input as LegacyChatInquiry, index);
  }

  const conversationInput = input as Partial<ChatConversation>;
  const messages = (conversationInput.messages || []).map((message, messageIndex) => normalizeMessage(message, messageIndex));
  const createdAt = conversationInput.createdAt || messages[0]?.createdAt || new Date(0).toISOString();
  const updatedAt = conversationInput.updatedAt || messages[messages.length - 1]?.createdAt || createdAt;

  return {
    id: input.id || `chat-${index + 1}`,
    createdAt,
    updatedAt,
    intent: input.intent || "빠른 문의",
    name: input.name || "",
    phone: input.phone || "",
    source: "widget",
    status: input.status === "closed" ? "closed" : input.status === "answered" ? "answered" : "new",
    consentAcceptedAt:
      "consentAcceptedAt" in input && typeof input.consentAcceptedAt === "string"
        ? input.consentAcceptedAt
        : createdAt,
    messages,
  };
}

async function ensureLocalFile() {
  await fs.mkdir(path.dirname(chatConversationsPath), { recursive: true });
  try {
    await fs.access(chatConversationsPath);
  } catch {
    await fs.writeFile(chatConversationsPath, "[]\n", "utf-8");
  }
}

async function readLocalConversations() {
  await ensureLocalFile();
  const file = await fs.readFile(chatConversationsPath, "utf-8");
  const parsed = JSON.parse(file) as Array<Partial<ChatConversation> | LegacyChatInquiry>;
  return Array.isArray(parsed) ? parsed.map((item, index) => normalizeConversation(item, index)) : [];
}

async function writeLocalConversations(conversations: ChatConversation[]) {
  await ensureLocalFile();
  await fs.writeFile(chatConversationsPath, JSON.stringify(conversations, null, 2) + "\n", "utf-8");
}

export async function readChatConversations(): Promise<ChatConversation[]> {
  if (hasMongoConfig()) {
    try {
      const db = await getMongoDatabase();
      const collection = db.collection<ChatConversationDocument>(CHAT_COLLECTION);
      const documents = await collection.find({}).sort({ updatedAt: -1 }).toArray();
      return documents.map((document, index) => normalizeConversation(document, index));
    } catch {
      return readLocalConversations();
    }
  }

  return readLocalConversations();
}

export async function readChatConversation(conversationId: string) {
  const conversations = await readChatConversations();
  return conversations.find((conversation) => conversation.id === conversationId) || null;
}

async function persistConversations(conversations: ChatConversation[]) {
  if (hasMongoConfig()) {
    try {
      const db = await getMongoDatabase();
      const collection = db.collection<ChatConversationDocument>(CHAT_COLLECTION);
      await collection.deleteMany({});
      if (conversations.length) {
        await collection.insertMany(conversations);
      }
      return;
    } catch (error) {
      throw new Error(`채팅 저장에 실패했습니다. (${error instanceof Error ? error.message : "DB 오류"})`);
    }
  }

  await writeLocalConversations(conversations);
}

export async function createChatConversation(input: {
  intent: string;
  name: string;
  phone: string;
  message: string;
  imageDataUrl?: string;
  consentAcceptedAt: string;
}) {
  const now = new Date().toISOString();
  const conversation: ChatConversation = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    intent: input.intent,
    name: input.name,
    phone: input.phone,
    source: "widget",
    status: "new",
    consentAcceptedAt: input.consentAcceptedAt,
    messages: [
      {
        id: randomUUID(),
        sender: "user",
        text: input.message,
        imageDataUrl: input.imageDataUrl,
        createdAt: now,
      },
    ],
  };

  const conversations = await readChatConversations();
  await persistConversations([conversation, ...conversations]);
  return conversation;
}

export async function appendUserMessage(input: {
  conversationId: string;
  intent: string;
  name: string;
  phone: string;
  message: string;
  imageDataUrl?: string;
  consentAcceptedAt?: string;
}) {
  const conversations = await readChatConversations();
  const now = new Date().toISOString();

  const next = conversations.map((conversation) => {
    if (conversation.id !== input.conversationId) {
      return conversation;
    }

    return {
      ...conversation,
      intent: input.intent || conversation.intent,
      name: input.name || conversation.name,
      phone: input.phone || conversation.phone,
      consentAcceptedAt: conversation.consentAcceptedAt ?? input.consentAcceptedAt ?? now,
      updatedAt: now,
      status: "new" as const,
      messages: [
        ...conversation.messages,
        {
          id: randomUUID(),
          sender: "user" as const,
          text: input.message,
          imageDataUrl: input.imageDataUrl,
          createdAt: now,
        },
      ],
    };
  });

  const conversation = next.find((item) => item.id === input.conversationId);
  if (!conversation) {
    throw new Error("채팅방을 찾을 수 없습니다.");
  }

  const ordered = [conversation, ...next.filter((item) => item.id !== input.conversationId)];
  await persistConversations(ordered);
  return conversation;
}

export async function appendAdminReply(input: { conversationId: string; message?: string; imageDataUrl?: string }) {
  const conversations = await readChatConversations();
  const now = new Date().toISOString();
  const message = typeof input.message === "string" ? input.message : "";

  const next = conversations.map((conversation) => {
    if (conversation.id !== input.conversationId) {
      return conversation;
    }

    return {
      ...conversation,
      updatedAt: now,
      status: "answered" as const,
      messages: [
        ...conversation.messages,
        {
          id: randomUUID(),
          sender: "admin" as const,
          text: message,
          imageDataUrl: input.imageDataUrl,
          createdAt: now,
        },
      ],
    };
  });

  const conversation = next.find((item) => item.id === input.conversationId);
  if (!conversation) {
    throw new Error("채팅방을 찾을 수 없습니다.");
  }

  const ordered = [conversation, ...next.filter((item) => item.id !== input.conversationId)];
  await persistConversations(ordered);
  return conversation;
}

export async function updateConversationContact(input: {
  conversationId: string;
  name: string;
  phone: string;
}) {
  const conversations = await readChatConversations();
  const now = new Date().toISOString();

  const next = conversations.map((conversation) => {
    if (conversation.id !== input.conversationId) {
      return conversation;
    }

    return {
      ...conversation,
      updatedAt: now,
      name: input.name,
      phone: input.phone,
    };
  });

  const conversation = next.find((item) => item.id === input.conversationId);
  if (!conversation) {
    throw new Error("채팅방을 찾을 수 없습니다.");
  }

  const ordered = [conversation, ...next.filter((item) => item.id !== input.conversationId)];
  await persistConversations(ordered);
  return conversation;
}
