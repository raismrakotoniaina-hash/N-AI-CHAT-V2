import crypto from "node:crypto";

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

async function analyzeWithOpenAI(files) {
  const snapshot = files.map((file) => `FILE: ${file.path}\n${file.content}`).join("\n\n");
  const prompt = `Diniho ity projet développeur ity. Valio amin'ny teny Malagasy ary JSON ihany miaraka amin'ny keys: summary, architecture, findings, securityRisks, improvements, nextSteps. Ny findings dia array misy level, area, path raha fantatra, ary message. Aza mamorona fichier na manova code. Ataovy mazava ny zavatra hitanao sy ny zavatra tsy azonao antoka.\n\n${snapshot}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      input: [{ role: "user", content: prompt }],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || "Developer AI request failed.");

  const raw = data.output_text || "";
  try {
    return { mode: "openai", ...JSON.parse(raw) };
  } catch {
    return {
      mode: "openai",
      summary: raw,
      findings: [],
      securityRisks: [],
      improvements: [],
      nextSteps: [],
    };
  }
}

export async function analyzeDeveloperProject(input) {
  const files = normalizeFiles(input);
  if (!process.env.OPENAI_API_KEY) return heuristic(files);
  return analyzeWithOpenAI(files);
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

  const prompt = `Ianao no Semantic Code Repair Engine an'ny N-AI. Mamorona patch azo antoka ho an'ny fichier iray, mifototra amin'ny finding. Aza manova zavatra tsy ilaina. Aza mamorona secrets. Aza manova API keys na credentials. Raha tsy azo antoka ny fanitsiana dia avereno changed=false.

Valio JSON ihany:
{
  "changed": true,
  "reason": "fanazavana fohy amin'ny teny Malagasy",
  "content": "FENO ny fichier voahitsy",
  "diff": "famintinana fohy ny fanovana",
  "confidence": 0.0
}

Path: ${target}
Finding:
${JSON.stringify(finding)}

Fichier ankehitriny:
${source}`;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      input: [{ role: "user", content: prompt }],
      max_output_tokens: 30000,
      text: {
        format: {
          type: "json_schema",
          name: "developer_patch",
          strict: true,
          schema: {
            type: "object",
            properties: {
              changed: { type: "boolean" },
              reason: { type: "string" },
              content: { type: "string" },
              diff: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["changed", "reason", "content", "diff", "confidence"],
            additionalProperties: false,
          },
        },
      },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || "Semantic patch request failed.");
  }

  const raw = String(data.output_text || "").trim();
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Semantic AI namaly tsy JSON; tsy natao ny patch.");
  }

  const nextContent = typeof parsed.content === "string" ? parsed.content : "";
  const changed = parsed.changed === true && nextContent && nextContent !== source;
  const confidence = Number(parsed.confidence);

  if (!changed) {
    return {
      mode: "openai",
      changed: false,
      reason: parsed.reason || "Tsy nahita fanitsiana azo antoka ny Semantic AI.",
      content: source,
      diff: parsed.diff || "",
      confidence: Number.isFinite(confidence) ? confidence : 0,
    };
  }

  if (nextContent.length > MAX_FILE_BYTES) {
    throw new Error("Semantic patch lehibe loatra; tsy nekena.");
  }

  return {
    mode: "openai",
    changed: true,
    reason: parsed.reason || "Patch semantic voaomana.",
    content: nextContent,
    diff: parsed.diff || "Nisy fanovana semantic tao amin'ny fichier.",
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.5,
  };
}

export async function generateDeveloperPatch(input) {
  if (!process.env.OPENAI_API_KEY) return localPatch(input);
  return semanticPatch(input);
}

export const DEVELOPER_LIMITS = {
  maxFiles: MAX_FILES,
  maxFileBytes: MAX_FILE_BYTES,
  maxTotalBytes: MAX_TOTAL_BYTES,
};
