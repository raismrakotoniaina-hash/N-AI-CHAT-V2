import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

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

// Temporary server-side balance for the current pre-auth version.
// This will later be replaced by the authenticated database credit account.
let demoCredits = 20;

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

app.get("/api/credits", (req, res) => {
  res.json({
    success: true,
    credits: demoCredits,
    costs: CREDIT_COSTS,
    mode: "demo",
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, operation = "chat" } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Messages are required.",
      });
    }

    const cost = CREDIT_COSTS[operation] ?? CREDIT_COSTS.chat;

    if (demoCredits < cost) {
      return res.status(402).json({
        success: false,
        error: "You have no credit remaining, add credit to continue.",
        credits: demoCredits,
        required: cost,
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({
        success: false,
        error: "OPENAI_API_KEY is not configured.",
        credits: demoCredits,
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
        credits: demoCredits,
      });
    }

    // Deduct only after a successful AI response.
    demoCredits -= cost;

    return res.json({
      success: true,
      model: OPENAI_MODEL,
      response: data.output_text || "",
      responseId: data.id || null,
      credits: demoCredits,
      creditsUsed: cost,
    });
  } catch (error) {
    console.error("Chat API error:", error);

    return res.status(500).json({
      success: false,
      error: "Internal server error.",
      credits: demoCredits,
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`N-AI Chat V2 API running on port ${PORT}`);
});
