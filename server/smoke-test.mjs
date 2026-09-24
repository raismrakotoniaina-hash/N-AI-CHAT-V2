import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port = 39001;
const webhookSecret = "local-ci-test-webhook-secret";
const paymentsFile = new URL("./data/payments.json", import.meta.url);
const originalPayments = fs.existsSync(paymentsFile) ? fs.readFileSync(paymentsFile, "utf8") : null;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["server.js"], {
  cwd: new URL(".", import.meta.url),
  env: { ...process.env, PORT: String(port), DEMO_MODE: "true", OPENAI_API_KEY: "", PAPI_WEBHOOK_SECRET: webhookSecret, PAPI_API_KEY: "", PUBLIC_API_URL: "", PUBLIC_FRONTEND_URL: "" },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
child.stdout.on("data", (chunk) => { output += chunk; });
child.stderr.on("data", (chunk) => { output += chunk; });

async function request(path, options = {}, cookie = "") {
  const response = await fetch(base + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}), ...options.headers },
  });
  return { status: response.status, body: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
}

try {
  let ready = false;
  for (let i = 0; i < 40; i++) {
    if (child.exitCode !== null) throw new Error("Server exited early: " + output);
    try {
      const health = await request("/api/health");
      assert.equal(health.status, 200);
      assert.equal(health.body.demoMode, true);
      ready = true;
      break;
    } catch {
      await delay(250);
    }
  }
  assert.ok(ready, "Backend did not start: " + output);
  console.log("PASS health");

  const email = `smoke-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
  const password = "SmokeTestPassword123!";
  const registration = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Smoke Tester", email, password }),
  });
  assert.equal(registration.status, 201);
  assert.equal(registration.body.user.credits, 20);
  assert.ok(registration.cookie?.startsWith("nai_session="));
  console.log("PASS registration");

  const login = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  assert.equal(login.status, 200);
  const cookie = login.cookie;
  assert.ok(cookie);
  console.log("PASS login");

  const creditsBefore = await request("/api/credits", {}, cookie);
  assert.equal(creditsBefore.body.credits, 20);
  const chat = await request("/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages: [{ role: "user", content: "Salama" }], operation: "chat" }),
  }, cookie);
  assert.equal(chat.status, 200);
  assert.equal(chat.body.mode, "demo");
  assert.equal(chat.body.creditsUsed, 1);
  assert.equal(chat.body.credits, 19);
  const creditsAfter = await request("/api/credits", {}, cookie);
  assert.equal(creditsAfter.body.credits, 19);
  console.log("PASS demo chat and credit deduction");

  const payment = await request("/api/payments/create", {
    method: "POST",
    body: JSON.stringify({ planId: "basic" }),
  }, cookie);
  assert.equal(payment.status, 503);
  console.log("PASS PAPI unconfigured safety check");

  const unauthenticated = await request("/api/credits");
  assert.equal(unauthenticated.status, 401);
  const unauthenticatedChat = await request("/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages: [{ role: "user", content: "Test" }] }),
  });
  assert.equal(unauthenticatedChat.status, 401);
  console.log("PASS protected API routes");

  const otherEmail = `other-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
  const other = await request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name: "Other Tester", email: otherEmail, password }),
  });
  assert.equal(other.status, 201);
  const otherAccount = await request("/api/auth/me", {}, other.cookie);
  assert.equal(otherAccount.body.user.email, otherEmail);
  const originalAccount = await request("/api/auth/me", {}, cookie);
  assert.equal(originalAccount.body.user.email, email);
  console.log("PASS account session isolation");

  const fakeWebhook = await fetch(base + "/api/payments/papi/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Papi-Signature": "invalid" },
    body: JSON.stringify({ paymentStatus: "SUCCESS" }),
  });
  assert.notEqual(fakeWebhook.status, 200);
  const afterFakePayment = await request("/api/credits", {}, cookie);
  assert.equal(afterFakePayment.body.credits, 19);
  console.log("PASS unsigned payment notification rejected");

  for (let i = 0; i < 2; i++) {
    const coding = await request("/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: [{ role: "user", content: "Code test" }], operation: "coding" }),
    }, cookie);
    assert.equal(coding.status, 200);
  }
  const insufficient = await request("/api/chat", {
    method: "POST",
    body: JSON.stringify({ messages: [{ role: "user", content: "Code test" }], operation: "coding" }),
  }, cookie);
  assert.equal(insufficient.status, 402);
  const balance = await request("/api/credits", {}, cookie);
  assert.equal(balance.body.credits, 3);
  console.log("PASS insufficient credits do not deduct balance");

  // Simulate PAPI's signed callback locally: no real charge or external API key.
  const reference = "CI-PAPI-" + Date.now();
  const notificationToken = crypto.randomBytes(24).toString("hex");
  const fixture = {
    reference, userId: registration.body.user.id, planId: "basic",
    amount: 9900, credits: 300, status: "pending",
    notificationToken, createdAt: new Date().toISOString(),
  };
  const savedPayments = JSON.parse(fs.readFileSync(paymentsFile, "utf8"));
  fs.writeFileSync(paymentsFile, JSON.stringify([...savedPayments, fixture]), "utf8");
  const notification = { merchantPaymentReference: reference, notificationToken, paymentStatus: "SUCCESS", paymentReference: "CI-MOCK-PAID" };
  async function signedNotify(payload, secret = webhookSecret) {
    const body = JSON.stringify(payload);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = crypto.createHmac("sha256", secret).update(timestamp + "." + body).digest("hex");
    return fetch(base + "/api/payments/papi/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Papi-Signature": "t=" + timestamp + ",v1=" + signature },
      body,
    });
  }
  const badSignature = await signedNotify(notification, "wrong-secret");
  assert.equal(badSignature.status, 401);
  const wrongToken = await signedNotify({ ...notification, notificationToken: "wrong-token" });
  assert.equal(wrongToken.status, 400);
  const beforePaid = await request("/api/credits", {}, cookie);
  assert.equal(beforePaid.body.credits, 3);
  console.log("PASS invalid PAPI signature and token rejected");

  const paidCallback = await signedNotify(notification);
  assert.equal(paidCallback.status, 200);
  const paid = await request("/api/payments/" + reference, {}, cookie);
  assert.equal(paid.body.payment.status, "paid");
  const afterPaid = await request("/api/credits", {}, cookie);
  assert.equal(afterPaid.body.credits, 303);
  const accountAfterPaid = await request("/api/auth/me", {}, cookie);
  assert.equal(accountAfterPaid.body.user.plan, "basic");
  const duplicate = await signedNotify(notification);
  assert.equal(duplicate.status, 200);
  const afterDuplicate = await request("/api/credits", {}, cookie);
  assert.equal(afterDuplicate.body.credits, 303);
  const otherPayment = await request("/api/payments/" + reference, {}, other.cookie);
  assert.equal(otherPayment.status, 404);
  console.log("PASS signed PAPI success adds 300 credits once, upgrades plan, isolates payment");

  const logout = await request("/api/auth/logout", { method: "POST" }, cookie);
  assert.equal(logout.status, 200);
  const afterLogout = await request("/api/auth/me", {}, cookie);
  assert.equal(afterLogout.status, 401);
  console.log("PASS logout");
  console.log("ALL BACKEND SMOKE TESTS PASSED");
} catch (error) {
  console.error(error);
  console.error(output);
  process.exitCode = 1;
} finally {
  child.kill("SIGTERM");
  if (originalPayments === null) {
    if (fs.existsSync(paymentsFile)) fs.unlinkSync(paymentsFile);
  } else fs.writeFileSync(paymentsFile, originalPayments, "utf8");
}
