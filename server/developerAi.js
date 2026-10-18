import { coreRequest } from "./coreClient.js";

const MAX_FILES = 50;
const MAX_FILE_BYTES = 180000;
const MAX_TOTAL_BYTES = 4000000;
const BLOCKED_NAMES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  "credentials.json",
  "id_rsa",
  "id_ed25519",
]);
const BLOCKED_EXTENSIONS = /\.(pem|key|p12|pfx)$/i;
const BINARY_EXTENSIONS = /\.(png|jpe?g|gif|webp|ico|pdf|zip|tar|gz|7z|mp4|mov|avi|mp3|wav|woff2?|ttf|otf)$/i;

function cleanPath(value) {
  const path = String(value || "").trim().replace(/\\/g, "/");
  if (!path || path.startsWith("/") || path.includes("..") || /[\x00-\x1f]/.test(path)) {
    throw new Error("Path fichier invalide.");
  }

  const parts = path.split("/").filter(Boolean);
  if (!parts.length || parts.some((part) => part === "." || part === "..")) {
    throw new Error("Path fichier invalide.");
  }

  return parts.join("/");
}

function isBlockedPath(path) {
  const name = path.split("/").at(-1).toLowerCase();
  return BLOCKED_NAMES.has(name) || name.startsWith(".env.") || BLOCKED_EXTENSIONS.test(name);
}

function normalizeFiles(input) {
  if (!Array.isArray(input)) throw new Error("Fichiers projet tsy mety.");
  if (input.length > MAX_FILES) throw new Error(`Maximum ${MAX_FILES} fichiers.`);

  let total = 0;
  const files = [];

  for (const item of input) {
    const path = cleanPath(item?.path);
    const content = String(item?.content ?? "");
    const declaredSize = Number(item?.size ?? new TextEncoder().encode(content).length);
    const size = Number.isFinite(declaredSize) ? declaredSize : new TextEncoder().encode(content).length;

    if (isBlockedPath(path)) continue;
    if (BINARY_EXTENSIONS.test(path)) continue;
    if (size > MAX_FILE_BYTES || new TextEncoder().encode(content).length > MAX_FILE_BYTES) {
      throw new Error(`Fichier trop lehibe: ${path}`);
    }

    total += new TextEncoder().encode(content).length;
    if (total > MAX_TOTAL_BYTES) throw new Error("Be loatra ny haben'ny projet nalefa.");
    files.push({ path, content, size, type: String(item?.type || "text/plain") });
  }

  if (!files.length) throw new Error("Tsy nahitana fichier texte azo dinihina.");
  return files;
}

function heuristic(files) {
  const paths = files.map((file) => file.path);
  const allText = files.map((file) => `${file.path}\n${file.content}`).join("\n");
  const findings = [];

  if (!paths.some((path) => /(^|\/)package\.json$/i.test(path))) {
    findings.push({
      level: "warning",
      area: "project",
      message: "Tsy hita ny package.json; mety tsy ho fantatra tsara ny dependencies sy scripts.",
    });
  }

  const todoFile = files.find((file) => /TODO|FIXME|XXX/i.test(file.content));
  if (todoFile) {
    findings.push({
      level: "info",
      area: "code",
      path: todoFile.path,
      message: "Misy TODO/FIXME/XXX ao amin'ny fichier; misy asa mbola voamarika.",
    });
  }

  const consoleFile = files.find((file) => /console\.log\s*\(/.test(file.content));
  if (consoleFile) {
    findings.push({
      level: "info",
      area: "quality",
      path: consoleFile.path,
      message: "Misy console.log ao amin'ny fichier; jereo raha tokony hesorina amin'ny production.",
    });
  }

  const secretFile = files.find((file) =>
    /(api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"']{8,}["']/i.test(file.content)
  );
  if (secretFile) {
    findings.push({
      level: "warning",
      area: "security",
      path: secretFile.path,
      message: "Misy sanda mitovitovy amin'ny secret/token ao amin'ny fichier; aza commit-na ny secrets.",
    });
  }

  return {
    mode: "local",
    summary: `Nandinika ${files.length} fichier nalefan'ny développeur i N-AI. Ity diagnostic ity dia local satria mbola tsy misy OPENAI_API_KEY.`,
    findings,
    architecture: {
      files: files.length,
      extensions: [...new Set(paths.map((path) => path.includes(".") ? path.split(".").pop().toLowerCase() : "none"))].slice(0, 20),
    },
    securityRisks: findings.filter((item) => item.area === "security"),
    improvements: [
      "Ataovy tests/build check ny projet alohan'ny deployment.",
      "Aza tehirizina ao amin'ny source code ny API keys sy secrets.",
      "Ampiasao ny package.json scripts sy lint/test rehefa misy.",
    ],
    fixes: findings.map((item) => ({
      area: item.area,
      level: item.level,
      action:
        item.area === "project"
          ? "Ampio na hamarino ny package.json sy ny scripts build/test."
          : item.area === "quality"
            ? "Jereo ireo console.log ary esory izay tsy ilaina amin'ny production."
            : item.area === "security"
              ? "Esory amin'ny source code ny secrets ary ampiasao environment variables."
              : "Diniho ity finding ity alohan'ny fanovana.",
    })),
    nextSteps: [
      "Ampifandraiso OpenAI billing raha mila semantic AI analysis.",
      "Avy eo afaka manolotra patch/diff voamarina i N-AI fa tsy manoratra mivantana.",
    ],
  };
}

async function analyzeWithCore(files) {
  const snapshot = files.map((file) => `FILE: ${file.path}\n${file.content}`).join("\n\n");
  const prompt = `Diniho ity projet développeur ity. Valio amin'ny teny Malagasy ary JSON ihany miaraka amin'ny keys: summary, architecture, findings, securityRisks, improvements, nextSteps. Ny findings dia array misy level, area, path raha fantatra, ary message. Aza mamorona fichier na manova code. Ataovy mazava ny zavatra hitanao sy ny zavatra tsy azonao antoka.\n\n${snapshot}`;
  const result = await coreRequest("/chat", {
    method: "POST",
    body: { messages: [
      { role: "system", content: "Analyze only supplied project files. Return valid JSON, evidence-based, without inventing findings." },
      { role: "user", content: prompt }
    ] }
  });
  const raw = result?.data?.message?.content;
  if (typeof raw !== "string" || !raw.trim()) {
    throw Object.assign(new Error("4N DEV Core tsy namerina analyse azo ampiasaina."), { status: 502, code: "core_invalid_analysis" });
  }
  try {
    const cleaned = raw.trim().replace(/^`{3}json\s*/i, "").replace(/`{3}$/, "");
    const parsed = JSON.parse(cleaned);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid object");
    return { mode: "core", ...parsed, requestId: result.request_id || null, usage: result.usage || null };
  } catch {
    return { mode: "core", summary: raw, findings: [], securityRisks: [], improvements: [], nextSteps: [], requestId: result.request_id || null, usage: result.usage || null };
  }
}

export async function analyzeDeveloperProject(input) {
  const files = normalizeFiles(input);
  return analyzeWithCore(files);
}

function localPatch({ path, content, finding = {} }) {
  const target = String(path || "").trim();
  const source = String(content ?? "");
  const area = String(finding.area || "").toLowerCase();
  const message = String(finding.message || "").toLowerCase();

  if (!target || !source) throw new Error("Fichier patch tsy mety.");

  if (area === "quality" || message.includes("console.log")) {
    const lines = source.split("\n");
    const filtered = lines.filter((line) => !/^\s*console\.log\s*\(/.test(line));
    if (filtered.length === lines.length) {
      return {
        mode: "local",
        changed: false,
        reason: "Tsy nahita console.log tsotra azo esorina.",
        content: source,
        diff: "",
      };
    }

    const next = filtered.join("\n");
    const removed = lines.length - filtered.length;
    return {
      mode: "local",
      changed: true,
      reason: `Nesorina ${removed} console.log tsotra ho fanadiovana production.`,
      content: next,
      diff: `- Nesorina ${removed} ligne console.log\n+ Ny ambiny amin'ny fichier dia tsy novaina.`,
    };
  }

  return {
    mode: "local",
    changed: false,
    reason: "Mbola tsy misy patch automatique local azo antoka ho an'ity finding ity. Mila semantic AI rehefa misy OPENAI_API_KEY.",
    content: source,
    diff: "",
  };
}

async function semanticPatch({ path, content, finding = {} }) {
  const target = cleanPath(path);
  const source = String(content ?? "");
  if (!source) throw new Error("Fichier patch tsy mety.");
  const prompt = `Mamorona patch azo antoka ho an'ny fichier iray, mifototra amin'ny finding. Aza manova zavatra tsy ilaina. Aza mamorona secrets na manova API keys/credentials. Raha tsy azo antoka ny fanitsiana dia avereno changed=false.
Valio JSON ihany misy changed(boolean), reason(string), content(fichier feno), diff(string), confidence(number).
Path: ${target}
Finding: ${JSON.stringify(finding)}
Fichier ankehitriny:
${source}`;
  const result = await coreRequest("/chat", {
    method: "POST",
    body: { messages: [
      { role: "system", content: "You are a conservative code repair engine. Return only valid JSON with changed, reason, content, diff, confidence. Never modify secrets or credentials." },
      { role: "user", content: prompt }
    ] }
  });
  const raw = String(result?.data?.message?.content || "").trim();
  let parsed;
  try { parsed = JSON.parse(raw.replace(/^`{3}json\s*/i, "").replace(/`{3}$/, "")); }
  catch { throw Object.assign(new Error("Semantic AI namaly tsy JSON; tsy natao ny patch."), { status: 502, code: "core_invalid_patch" }); }
  if (!parsed || typeof parsed !== "object" || typeof parsed.changed !== "boolean" ||
      typeof parsed.reason !== "string" || typeof parsed.content !== "string" ||
      typeof parsed.diff !== "string" || !Number.isFinite(Number(parsed.confidence))) {
    throw Object.assign(new Error("Format patch tsy feno; tsy nekena."), { status: 502, code: "core_invalid_patch" });
  }
  const nextContent = parsed.content;
  const changed = parsed.changed === true && nextContent !== source;
  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence)));
  if (!changed) return { mode: "core", changed: false, reason: parsed.reason, content: source, diff: parsed.diff, confidence, requestId: result.request_id || null, usage: result.usage || null };
  if (Buffer.byteLength(nextContent, "utf8") > MAX_FILE_BYTES) throw Object.assign(new Error("Semantic patch lehibe loatra; tsy nekena."), { status: 400, code: "patch_too_large" });
  if (/^(<<<<<<< |=======\s*$|>>>>>>> )/m.test(nextContent)) throw Object.assign(new Error("Patch misy merge conflict; tsy nekena."), { status: 400, code: "patch_merge_conflict" });
  return { mode: "core", changed: true, reason: parsed.reason, content: nextContent, diff: parsed.diff, confidence, requestId: result.request_id || null, usage: result.usage || null };
}

export async function generateDeveloperPatch(input) {
  return semanticPatch(input);
}

export const DEVELOPER_LIMITS = {
  maxFiles: MAX_FILES,
  maxFileBytes: MAX_FILE_BYTES,
  maxTotalBytes: MAX_TOTAL_BYTES,
};
