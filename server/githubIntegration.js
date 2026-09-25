const API = "https://api.github.com";
const OWNER = "raismrakotoniaina-hash";
const REPO = "N-AI-CHAT-V2";
const ALLOWED = new Set(["src", "server", "public", "docs"]);\nconst ALLOWED_ROOT_FILES = new Set(["index.html", "package.json", "vite.config.js", "README.md"]);
const MAX_FILE_BYTES = 180_000;
const BLOCKED_NAMES = new Set([".env", ".env.local", ".env.production", ".env.development", "credentials.json"]);

function isBlockedPath(path) {
  const name = path.split("/").at(-1).toLowerCase();
  return BLOCKED_NAMES.has(name) || /\.(pem|key|p12|pfx)$/i.test(name);
}

function config() {
  const token = process.env.NAI_GITHUB_TOKEN;
  if (!token) throw Object.assign(new Error("GitHub integration is not configured."), { status: 503 });
  return token;
}
function validatePath(path) {
  if (path.length > 250 || path.includes("\\") || path.startsWith("/") || path.split("/").some((p) => !p || p === "." || p === "..") || !ALLOWED.has(path.split("/")[0]) || /[\x00-\x1f]/.test(path)) {
    throw Object.assign(new Error("Invalid or restricted repository path."), { status: 400 });
  }
  return path;
}
async function github(path, options = {}) {
  const token = config();
  const response = await fetch(API + "/repos/" + OWNER + "/" + REPO + path, {
    ...options,
    headers: { Accept: "application/vnd.github+json", Authorization: "Bearer " + token, "X-GitHub-Api-Version": "2022-11-28", ...(options.headers || {}) },
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(response.status === 404 ? "Repository file not found." : "GitHub request failed.");
    err.status = response.status;
    throw err;
  }
  return data;
}
export async function listRepository(path = "") {
  if (path) validatePath(path);
  const data = await github("/contents/" + path.split("/").map(encodeURIComponent).join("/") + "?ref=main");
  if (!Array.isArray(data)) throw Object.assign(new Error("Not a directory."), { status: 400 });
  return data.filter((item) => item.type === "dir" || (item.type === "file" && item.size <= MAX_FILE_BYTES && !isBlockedPath(item.path))).map(({ name, path, type, size, sha }) => ({ name, path, type, size, sha }));
}
export async function readRepositoryFile(path) {
  validatePath(path);
  const data = await github("/contents/" + path.split("/").map(encodeURIComponent).join("/") + "?ref=main");
  if (data.type !== "file" || data.size > MAX_FILE_BYTES || data.encoding !== "base64") throw Object.assign(new Error("Unsupported file."), { status: 400 });
  return { path: data.path, sha: data.sha, content: Buffer.from(data.content.replace(/\s/g, ""), "base64").toString("utf8") };
}
export async function proposeChange({ path, content, expectedSha, approved }) {
  validatePath(path);
  if (approved !== true) throw Object.assign(new Error("Explicit approval is required."), { status: 403 });
  if (typeof content !== "string" || Buffer.byteLength(content) > MAX_FILE_BYTES || !content.length) throw Object.assign(new Error("Invalid file content."), { status: 400 });
  if (!/^[a-f0-9]{40}$/.test(expectedSha || "")) throw Object.assign(new Error("A current file SHA is required."), { status: 400 });
  const current = await readRepositoryFile(path);
  if (current.sha !== expectedSha) throw Object.assign(new Error("File changed since review. Read it again."), { status: 409 });
  const branch = "nai/review-" + crypto.randomUUID();
  const main = await github("/git/ref/heads/main");
  await github("/git/refs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref: "refs/heads/" + branch, sha: main.object.sha }) });
  await github("/contents/" + path.split("/").map(encodeURIComponent).join("/"), { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "N-AI: proposed update to " + path, content: Buffer.from(content).toString("base64"), sha: expectedSha, branch }) });
  const pr = await github("/pulls", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "N-AI: review update to " + path, head: branch, base: "main", body: "Proposed by N-AI. Review and merge manually after checking the diff and tests." }) });
  return { pullRequest: pr.html_url, number: pr.number, branch };
}
import crypto from "node:crypto";

export function analyzeRepositorySnapshot(entries) {
  const files = Array.isArray(entries) ? entries.filter((x) => x?.type === "file") : [];
  const names = files.map((x) => x.path);
  const findings = [];
  if (!names.some((x) => x === "package.json" || x === "server/package.json")) findings.push({ level: "warning", message: "Tsy hita mazava ny package.json ao amin'ny snapshot." });
  if (names.some((x) => x === ".env" || x.endsWith("/.env"))) findings.push({ level: "critical", message: "Misy .env ao amin'ny snapshot. Aza atao public ary aza commit secrets." });
  if (names.some((x) => x === "server/server.js")) findings.push({ level: "info", message: "Hita ny backend Express server/server.js." });
  if (names.some((x) => x === "src/App.jsx")) findings.push({ level: "info", message: "Hita ny frontend React src/App.jsx." });
  if (names.some((x) => x.startsWith(".github/workflows/"))) findings.push({ level: "info", message: "Hita ny GitHub Actions workflow; azo jerena ny build/deploy." });
  return {
    files: names.length,
    findings,
    next: [
      "Vakio tsirairay ny fichier ilaina alohan'ny fanovana.",
      "Ampitahao amin'ny SHA ankehitriny ny fichier alohan'ny hanoratana.",
      "Ataovy Pull Request ny fanovana fa aza manoratra mivantana amin'ny main."
    ]
  };
}
