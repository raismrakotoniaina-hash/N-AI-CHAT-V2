import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "users.json");

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]", "utf8");
}

function readUsers() {
  ensureStore();
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeUsers(users) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2), "utf8");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function verifyPassword(password, user) {
  const { hash } = hashPassword(password, user.passwordSalt);
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.passwordHash, "hex"));
}

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    credits: user.credits,
  };
}

export function registerUser({ name, email, password }) {
  const cleanName = String(name || "").trim();
  const cleanEmail = normalizeEmail(email);

  if (cleanName.length < 2) throw new Error("Name must contain at least 2 characters.");
  if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) throw new Error("Invalid email.");
  if (String(password || "").length < 8) throw new Error("Password must contain at least 8 characters.");

  const users = readUsers();
  if (users.some((u) => u.email === cleanEmail)) throw new Error("An account with this email already exists.");

  const { hash, salt } = hashPassword(password);
  const user = {
    id: crypto.randomUUID(),
    name: cleanName,
    email: cleanEmail,
    passwordHash: hash,
    passwordSalt: salt,
    plan: "free",
    credits: 20,
    transactions: [{ id: crypto.randomUUID(), type: "grant", amount: 20, reason: "free_plan", createdAt: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
  };

  users.push(user);
  writeUsers(users);
  return publicUser(user);
}

export function loginUser({ email, password }) {
  const cleanEmail = normalizeEmail(email);
  const user = readUsers().find((u) => u.email === cleanEmail);
  if (!user || !verifyPassword(String(password || ""), user)) throw new Error("Invalid email or password.");

  const token = createToken();
  return { token, user: publicUser(user) };
}

export function getUserByToken(token) {
  if (!token) return null;
  const users = readUsers();
  return users.find((u) => u.sessions?.includes(token)) || null;
}

export function attachSession(userId, token) {
  const users = readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return false;
  user.sessions = Array.isArray(user.sessions) ? user.sessions : [];
  user.sessions.push(token);
  writeUsers(users);
  return true;
}

export function removeSession(token) {
  const users = readUsers();
  let changed = false;
  for (const user of users) {
    if (Array.isArray(user.sessions) && user.sessions.includes(token)) {
      user.sessions = user.sessions.filter((item) => item !== token);
      changed = true;
    }
  }
  if (changed) writeUsers(users);
}

export function getUserById(id) {
  return readUsers().find((u) => u.id === id) || null;
}

export function spendCredits(userId, amount, reason) {
  const users = readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user || user.credits < amount) return null;

  user.credits -= amount;
  user.transactions = Array.isArray(user.transactions) ? user.transactions : [];
  user.transactions.push({
    id: crypto.randomUUID(),
    type: "usage",
    amount: -amount,
    reason,
    createdAt: new Date().toISOString(),
  });
  writeUsers(users);
  return publicUser(user);
}
