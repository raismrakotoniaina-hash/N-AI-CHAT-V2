import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { registerUser, loginUser, getUserByToken, attachSession, removeSession, spendCredits } from "./authStore.js";

dotenv.config({
  path: new URL("../.env", import.meta.url),
});

const app = express();

const PORT = process.env.PORT || 3001;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5.6-luna";

// Credit costs. Keep these on the backend so users cannot change them from the browser.
const CREDIT_COSTS = {
  chat: 1,
  coding: 8,
  research: 8,
  image: 50,
};


app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", apiLimiter);

app.get("/", (req, res) => {
  res.json({
    name: "N-AI Chat V2 API",
    status: "online",
    version: "2.0.0",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    service: "N-AI Chat V2 API",
    timestamp: new Date().toISOString(),
  });
});

function getCookie(req, name) {
  const header = req.headers.cookie || "";
  const match = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(name + "="));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function setSessionCookie(res, token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `nai_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800${secure}`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "nai_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0");
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
  res.json({
    success: true,
    user: { id: user.id, name: user.name, email: user.email, plan: user.plan, credits: user.credits },
  });
});

app.get("/api/credits", (req, res) => {
  const user = requireUser(req, res);
  if (!user) return;
  res.json({
    success: true,
    credits: user.credits,
    costs: CREDIT_COSTS,
    mode: "account",
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const user = requireUser(req, res);
    if (!user) return;

    const { messages, operation = "chat" } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Messages are required.",
      });
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

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        success: false,
        error: "OPENAI_API_KEY is not configured.",
        credits: user.credits,
      });
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        input: messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API error:", data);

      // Credit is NOT deducted when the AI request fails.
      return res.status(response.status).json({
        success: false,
        error: data?.error?.message || "OpenAI API request failed.",
        credits: user.credits,
      });
    }

    // Deduct only after a successful AI response.
    const updatedUser = spendCredits(user.id, cost, operation);
    if (!updatedUser) {
      return res.status(409).json({ success: false, error: "Credit balance changed. Please try again." });
    }

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

    return res.status(500).json({
      success: false,
      error: "Internal server error.",
      credits: 0,
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`N-AI Chat V2 API running on port ${PORT}`);
});
