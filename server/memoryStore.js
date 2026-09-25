import crypto from "crypto";
import { getCollection, setCollection } from "./storage.js";

function cleanText(value, max = 1000) {
  return String(value || "").trim().slice(0, max);
}

export async function listMemories(userId) {
  const memories = await getCollection("memories");
  return memories
    .filter((item) => item.userId === userId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export async function createMemory(userId, { content, category = "general" }) {
  const cleanContent = cleanText(content);
  const cleanCategory = cleanText(category, 50) || "general";
  if (!cleanContent) throw new Error("Memory content is required.");

  const memories = await getCollection("memories");
  const now = new Date().toISOString();
  const memory = {
    id: crypto.randomUUID(),
    userId,
    content: cleanContent,
    category: cleanCategory,
    createdAt: now,
    updatedAt: now,
  };

  memories.push(memory);
  await setCollection("memories", memories);
  return memory;
}

export async function updateMemory(userId, memoryId, { content, category }) {
  const memories = await getCollection("memories");
  const memory = memories.find((item) => item.id === memoryId && item.userId === userId);
  if (!memory) return null;

  if (content !== undefined) {
    const cleanContent = cleanText(content);
    if (!cleanContent) throw new Error("Memory content is required.");
    memory.content = cleanContent;
  }
  if (category !== undefined) {
    memory.category = cleanText(category, 50) || "general";
  }
  memory.updatedAt = new Date().toISOString();

  await setCollection("memories", memories);
  return memory;
}

export async function deleteMemory(userId, memoryId) {
  const memories = await getCollection("memories");
  const index = memories.findIndex((item) => item.id === memoryId && item.userId === userId);
  if (index === -1) return false;

  memories.splice(index, 1);
  await setCollection("memories", memories);
  return true;
}

export async function clearMemories(userId) {
  const memories = await getCollection("memories");
  const filtered = memories.filter((item) => item.userId !== userId);
  await setCollection("memories", filtered);
  return memories.length - filtered.length;
}
