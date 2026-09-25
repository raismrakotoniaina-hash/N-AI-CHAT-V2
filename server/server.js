import dotenv from "dotenv";
import fs from "fs";
import crypto from "crypto";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerUser, loginUser, getUserByToken, getUserById, attachSession, removeSession, spendCredits, addCredits, setUserPlan } from "./authStore.js";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const app = express();
const PORT = process.env.PORT || 3001;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";
const DEMO_MODE = String(process.env.DEMO_MODE || "").toLowerCase() === "true" || !process.env.OPENAI_API_KEY;
const PAPI_API_KEY = process.env.PAPI_API_KEY || "";
const PAPI_WEBHOOK_SECRET = process.env.PAPI_WEBHOOK_SECRET || "";
const PUBLIC_FRONTEND_URL = (process.env.PUBLIC_FRONTEND_URL || process.env.PUBLIC_APP_URL || "").replace(/\/$/, "");
const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || process.env.PUBLIC_APP_URL || "").replace(/\/$/, "");

const CREDIT_COSTS = { chat: 1, coding: 8, research: 8, image: 50 };

app.use(helmet());
app.use(cors({
  origin: true,
  credentials: true,
}));

app.post("/api/payments/papi/notify", express.raw({ type: "application/json" }), (req, res) => {
  try {
    if (!PAPI_WEBHOOK_SECRET) return res.status(503).json({ success: false, error: "PAPI webhook is not configured." });
    const signature = req.get("X-Papi-Signature") || "";
    const parts = {};
    for (const item of signature.split(",")) {
      const [key, ...rest] = item.trim().split("=");
      if (key && rest.length) parts[key] = rest.join("=");
    }
    const timestamp = parts.t;
    const received = parts.v1;
    if (!/^\d+$/.test(timestamp || "") || !/^[0-9a-f]{64}$/.test(received || "")) return res.status(401).end();
    if (Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300) return res.status(401).end();
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("");
    const expected = crypto.createHmac("sha256", PAPI_WEBHOOK_SECRET).update(`${timestamp}.`).update(rawBody).digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(received, "hex");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).end();

    const notification = JSON.parse(rawBody.toString("utf8"));
    const reference = String(notification.merchantPaymentReference || "");
    const token = String(notification.notificationToken || "");
    const payments = readPayments();
    const payment = payments.find((item) => item.reference === reference);
    if (!payment || !payment.notificationToken || payment.notificationToken !== token) return res.status(400).end();

    if (notification.paymentStatus === "SUCCESS" && payment.status !== "paid") {
      const updated = addCredits(payment.userId, payment.credits, "papi_payment");
      if (updated) {
        setUserPlan(payment.userId, payment.planId);
        payment.status = "paid";
        payment.paidAt = new Date().toISOString();
        payment.paymentReference = notification.paymentReference || null;
        payment.paymentMethod = notification.paymentMethod || null;
        writePayments(payments);
      }
    } else if (notification.paymentStatus === "FAILED") {
      payment.status = "failed";
      writePayments(payments);
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("PAPI notification error:", error);
    return res.status(400).end();
  }
});

app.use(express.json({ limit: "10mb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", apiLimiter);

app.get("/", (req, res) => res.json({ name: "N-AI Chat V2 API", status: "online", version: "2.0.0", demoMode: DEMO_MODE }));
app.get("/api/health", (req, res) => res.json({ success: true, status: "healthy", service: "N-AI Chat V2 API", demoMode: DEMO_MODE, timestamp: new Date().toISOString() }));

function getCookie(req, name) {
  const header = req.headers.cookie || "";
  const match = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(name + "="));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}
function setSessionCookie(res, token) {
  const production = process.env.NODE_ENV === "production";
  const sameSite = production ? "None" : "Lax";
  const secure = production ? "; Secure" : "";
  res.setHeader("Set-Cookie", `nai_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=${sameSite}; Max-Age=604800${secure}`);
}
function clearSessionCookie(res) {
  const production = process.env.NODE_ENV === "production";
  const sameSite = production ? "None" : "Lax";
  const secure = production ? "; Secure" : "";
  res.setHeader("Set-Cookie", `nai_session=; HttpOnly; Path=/; SameSite=${sameSite}; Max-Age=0${secure}`);
}
function requireUser(req, res) {
  const token = getCookie(req, "nai_session");
  const user = getUserByToken(token);
  if (!user) {
    res.status(401).json({ success: false, error: "Authentication required." });
    return null;
  }
  return user;
}

app.post("/api/auth/register", (req, res) => {
  try {
    const user = registerUser(req.body);
    const { token } = loginUser(req.body);
    attachSession(user.id, token);
    setSessionCookie(res, token);
    res.status(201).json({ success: true, user });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  try {
    const result = loginUser(req.body);
    attachSession(result.user.id, result.token);
    setSessionCookie(res, result.token);
    res.json({ success: true, user: result.user });
  } catch (error) {
    res.status(401).json({ success: false, error: error.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  removeSession(getCookie(req, "nai_session"));
  clearSessionCookie(res);
  res.json({ success: true });
});

app.get("/api/auth/me", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, plan: user.plan, credits: user.credits } });
});

app.get("/api/credits", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  res.json({ success: true, credits: user.credits, costs: CREDIT_COSTS, mode: "account" });
});

const PAYMENTS_FILE = new URL("./data/payments.json", import.meta.url);
function readPayments() {
  try {
    if (!fs.existsSync(PAYMENTS_FILE)) fs.writeFileSync(PAYMENTS_FILE, "[]", "utf8");
    return JSON.parse(fs.readFileSync(PAYMENTS_FILE, "utf8"));
  } catch {
    return [];
  }
}
function writePayments(payments) {
  fs.writeFileSync(PAYMENTS_FILE, JSON.stringify(payments, null, 2), "utf8");
}

app.post("/api/payments/create", async (req, res) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;
    const { planId, provider } = req.body || {};
    const plans = {
      basic: { price: 9900, credits: 300 },
      premium: { price: 21900, credits: 1200 },
      pro: { price: 49900, credits: 3500 },
    };
    const plan = plans[planId];
    if (!plan) return res.status(400).json({ success: false, error: "Plan invalide." });
    if (!PAPI_API_KEY) return res.status(503).json({ success: false, error: "PAPI_API_KEY tsy mbola voapetraka ao amin'ny serveur." });
    if (!PUBLIC_FRONTEND_URL) return res.status(503).json({ success: false, error: "PUBLIC_FRONTEND_URL tsy mbola voapetraka." });
    if (!PUBLIC_API_URL) return res.status(503).json({ success: false, error: "PUBLIC_API_URL tsy mbola voapetraka." });
    if (!PAPI_WEBHOOK_SECRET) return res.status(503).json({ success: false, error: "PAPI_WEBHOOK_SECRET tsy mbola voapetraka ao amin'ny serveur." });

    const reference = `NAI-${user.id.slice(0, 8)}-${Date.now()}`;
    const payload = {
      amount: plan.price,
      currency: "MGA",
      clientName: user.name,
      reference,
      description: `N-AI Chat V2 - ${planId} - ${plan.credits} credits`,
      successUrl: `${PUBLIC_FRONTEND_URL}/?payment=success&reference=${encodeURIComponent(reference)}`,
      failureUrl: `${PUBLIC_FRONTEND_URL}/?payment=failure&reference=${encodeURIComponent(reference)}`,
      notificationUrl: `${PUBLIC_API_URL}/api/payments/papi/notify`,
      validDuration: 2,
      ...(provider ? { provider } : {}),
      payerEmail: user.email,
    };

    const response = await fetch("https://app.papi.mg/engine/api/payment-links", {
      method: "POST",
      headers: { "Content-Type": "application/json", Token: PAPI_API_KEY },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("PAPI create payment error:", data);
      return res.status(response.status).json({ success: false, error: data?.error?.message || data?.message || data?.error || "PAPI payment creation failed." });
    }

    const result = data?.data || data;
    const paymentLink = result.paymentLink;
    const notificationToken = result.notificationToken;
    if (!paymentLink || !notificationToken) return res.status(502).json({ success: false, error: "PAPI payment link response is incomplete." });

    const payments = readPayments();
    payments.push({
      reference,
      userId: user.id,
      planId,
      amount: plan.price,
      credits: plan.credits,
      status: "pending",
      notificationToken,
      createdAt: new Date().toISOString(),
    });
    writePayments(payments);
    return res.json({ success: true, paymentLink, reference, status: "pending" });
  } catch (error) {
    console.error("Payment create error:", error);
    return res.status(500).json({ success: false, error: "Payment service error." });
  }
});

app.get("/api/payments/:reference", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  const payment = readPayments().find((item) => item.reference === req.params.reference && item.userId === user.id);
  if (!payment) return res.status(404).json({ success: false, error: "Payment not found." });
  res.json({ success: true, payment: { reference: payment.reference, planId: payment.planId, amount: payment.amount, credits: payment.credits, status: payment.status, createdAt: payment.createdAt, paidAt: payment.paidAt || null } });
});

function buildDemoResponse(messages) {
  const last = messages.filter((m) => m?.role === "user").at(-1)?.content || "";
  return `Salama 👋 Izaho no N-AI Chat V2.

Voaray ny hafatrao: "${last}"

🧪 Demo Mode: mandeha tsara ny N-AI API, ka afaka mitsapa ny interface sy ny credit system isika na dia mbola tsy nampifandray OpenAI billing aza.`;
}

app.post("/api/chat", async (req, res) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { messages, operation = "chat" } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: "Messages are required." });
    }

    const cost = CREDIT_COSTS[operation] ?? CREDIT_COSTS.chat;
    if (user.credits < cost) {
      return res.status(402).json({
        success: false,
        error: "You have no credit remaining, add credit to continue.",
        credits: user.credits,
        required: cost,
      });
    }

    if (DEMO_MODE) {
      const updatedUser = spendCredits(user.id, cost, operation);
      if (!updatedUser) {
        return res.status(409).json({ success: false, error: "Credit balance changed. Please try again." });
      }
      return res.json({
        success: true,
        mode: "demo",
        model: "n-ai-demo",
        response: buildDemoResponse(messages),
        responseId: null,
        credits: updatedUser.credits,
        creditsUsed: cost,
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: OPENAI_MODEL, input: messages }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("OpenAI API error:", data);
      return res.status(response.status).json({ success: false, error: data?.error?.message || "OpenAI API request failed.", credits: user.credits });
    }

    const updatedUser = spendCredits(user.id, cost, operation);
    if (!updatedUser) return res.status(409).json({ success: false, error: "Credit balance changed. Please try again." });

    return res.json({
      success: true,
      model: OPENAI_MODEL,
      response: data.output_text || "",
      responseId: data.id || null,
      credits: updatedUser.credits,
      creditsUsed: cost,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return res.status(500).json({ success: false, error: "Internal server error.", credits: 0 });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`N-AI Chat V2 API running on port ${PORT} | DEMO_MODE=${DEMO_MODE}`);
});
