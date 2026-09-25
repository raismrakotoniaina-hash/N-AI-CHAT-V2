import crypto from "crypto";
import { getCollection, setCollection } from "./storage.js";

function normalizeEmail(email) { return String(email || "").trim().toLowerCase(); }
function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  return { hash: crypto.scryptSync(password, salt, 64).toString("hex"), salt };
}
function verifyPassword(password, user) {
  const { hash } = hashPassword(password, user.passwordSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.passwordHash, "hex"));
}
function createToken() { return crypto.randomBytes(32).toString("hex"); }
function publicUser(user) { return { id: user.id, name: user.name, email: user.email, plan: user.plan, credits: user.credits }; }

export async function registerUser({ name, email, password }) {
  const cleanName = String(name || "").trim();
  const cleanEmail = normalizeEmail(email);
  if (cleanName.length < 2) throw new Error("Name must contain at least 2 characters.");
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) throw new Error("Invalid email.");
  if (String(password || "").length < 8) throw new Error("Password must contain at least 8 characters.");
  const users = await getCollection("users");
  if (users.some((u) => u.email === cleanEmail)) throw new Error("An account with this email already exists.");
  const { hash, salt } = hashPassword(password);
  const user = {
    id: crypto.randomUUID(), name: cleanName, email: cleanEmail, passwordHash: hash, passwordSalt: salt,
    plan: "free", credits: 20, sessions: [],
    transactions: [{ id: crypto.randomUUID(), type: "grant", amount: 20, reason: "free_plan", createdAt: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  await setCollection("users", users);
  return publicUser(user);
}

export async function loginUser({ email, password }) {
  const user = (await getCollection("users")).find((u) => u.email === normalizeEmail(email));
  if (!user || !verifyPassword(String(password || ""), user)) throw new Error("Invalid email or password.");
  return { token: createToken(), user: publicUser(user) };
}
export async function getUserByToken(token) {
  if (!token) return null;
  return (await getCollection("users")).find((u) => Array.isArray(u.sessions) && u.sessions.includes(token)) || null;
}
export async function attachSession(userId, token) {
  const users = await getCollection("users");
  const user = users.find((u) => u.id === userId);
  if (!user) return false;
  user.sessions = Array.isArray(user.sessions) ? user.sessions : [];
  user.sessions.push(token);
  await setCollection("users", users);
  return true;
}
export async function removeSession(token) {
  const users = await getCollection("users");
  let changed = false;
  for (const user of users) {
    if (Array.isArray(user.sessions) && user.sessions.includes(token)) {
      user.sessions = user.sessions.filter((item) => item !== token);
      changed = true;
    }
  }
  if (changed) await setCollection("users", users);
}
export async function getUserById(id) { return (await getCollection("users")).find((u) => u.id === id) || null; }
export async function spendCredits(userId, amount, reason) {
  const users = await getCollection("users");
  const user = users.find((u) => u.id === userId);
  if (!user || user.credits < amount) return null;
  user.credits -= amount;
  user.transactions = Array.isArray(user.transactions) ? user.transactions : [];
  user.transactions.push({ id: crypto.randomUUID(), type: "usage", amount: -amount, reason, createdAt: new Date().toISOString() });
  await setCollection("users", users);
  return publicUser(user);
}
export async function setUserPlan(userId, plan) {
  if (!["free", "basic", "premium", "pro"].includes(plan)) return null;
  const users = await getCollection("users");
  const user = users.find((u) => u.id === userId);
  if (!user) return null;
  user.plan = plan;
  await setCollection("users", users);
  return publicUser(user);
}
export async function addCredits(userId, amount, reason = "purchase") {
  const users = await getCollection("users");
  const user = users.find((u) => u.id === userId);
  if (!user || !Number.isFinite(amount) || amount <= 0) return null;
  user.credits = Number(user.credits || 0) + amount;
  user.transactions = Array.isArray(user.transactions) ? user.transactions : [];
  user.transactions.push({ id: crypto.randomUUID(), type: "grant", amount, reason, createdAt: new Date().toISOString() });
  await setCollection("users", users);
  return publicUser(user);
}
