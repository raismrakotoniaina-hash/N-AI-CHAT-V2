import { coreRequest } from "./coreClient.js";

export const ANALYSIS_FILES = [
  "src/App.jsx",
  "src/services/i18n.js",
  "server/server.js",
  "server/authStore.js",
  "server/storage.js",
  "server/memoryStore.js",
  "server/githubIntegration.js",
];

function compact(text, max = 50000) {
  return String(text || "").slice(0, max);
}

function buildSnapshot(files) {
  return files.map((file) => `### ${file.path}\n${compact(file.content)}`).join("\n\n");
}

export async function analyzeRepositoryWithAI(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw Object.assign(new Error("Tsy misy fichier azo anaovana analyse."), { status: 400 });
  }

  const snapshot = buildSnapshot(files);
  const prompt = `Ianao no Repository Engineer an'ny N-AI Chat V2.
Diniho ireo fichiers etsy ambany. Aza mamorona zavatra tsy hita ao amin'ny code.
Omeo diagnostic azo ampiharina amin'ny teny Malagasy: summary, findings misy level info/warning/critical, bugs na incoherences, security risks, ary nextSteps.
Aza manoro fanovana mivantana amin'ny main. Lazao mazava ny fichier sy antony raha mila fanovana.
Valio amin'ny JSON raha azo atao, fa raha tsy izany dia omeo diagnostic mazava.
${snapshot}`;

  const result = await coreRequest("/chat", {
    method: "POST",
    body: {
      messages: [
        { role: "system", content: "You are a careful repository analysis engineer. Never claim to inspect files not included in the prompt. Return actionable, evidence-based findings." },
        { role: "user", content: prompt }
      ]
    }
  });

  const summary = result?.data?.message?.content;
  if (typeof summary !== "string" || !summary.trim()) {
    throw Object.assign(new Error("4N DEV Core tsy namerina diagnostic azo ampiasaina."), { status: 502, code: "core_invalid_analysis" });
  }

  let parsed = null;
  try {
    const cleaned = summary.trim().replace(/^\`\`\`json\s*/i, "").replace(/\`\`\`$/, "");
    parsed = JSON.parse(cleaned);
  } catch {
    // Core text responses are valid too; preserve them as the summary.
  }

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return {
      mode: "core",
      model: result.model || null,
      summary: String(parsed.summary || summary),
      findings: Array.isArray(parsed.findings) ? parsed.findings : [],
      recommended: Array.isArray(parsed.nextSteps) ? parsed.nextSteps
        : Array.isArray(parsed.recommended) ? parsed.recommended : [],
      requestId: result.request_id || null,
      usage: result.usage || null
    };
  }

  return {
    mode: "core",
    model: result.model || null,
    summary,
    findings: [],
    recommended: [
      "Vakio sy hamarinina ny findings alohan'ny fanovana.",
      "Ampitahao amin'ny SHA ankehitriny ny fichier.",
      "Ataovy Pull Request ny fanovana."
    ],
    requestId: result.request_id || null,
    usage: result.usage || null
  };
}
