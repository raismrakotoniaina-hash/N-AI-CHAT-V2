import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const port = 39001;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["server.js"], {
  cwd: new URL(".", import.meta.url),
  env: { ...process.env, PORT: String(port), DEMO_MODE: "true", OPENAI_API_KEY: "" },
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
}
