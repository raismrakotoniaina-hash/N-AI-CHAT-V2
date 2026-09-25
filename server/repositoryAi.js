const OPENAI_API_URL = "https://api.openai.com/v1/responses";

const ANALYSIS_FILES = [
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
  return files.map((file) => (
    `### ${file.path}\n${compact(file.content)}`
  )).join("\n\n");
}

function heuristic(files) {
  const paths = new Set(files.map((f) => f.path));
  const app = files.find((f) => f.path === "src/App.jsx")?.content || "";
  const server = files.find((f) => f.path === "server/server.js")?.content || "";
  const findings = [];

  if (paths.has("src/App.jsx") && paths.has("server/server.js")) {
    findings.push({ level: "info", area: "architecture", message: "Frontend React sy backend Express dia hita ary mifandray amin'ny API." });
  }
  if (server.includes("DEMO_MODE") && !process.env.OPENAI_API_KEY) {
    findings.push({ level: "warning", area: "ai", message: "Mbola DEMO_MODE ny backend satria tsy misy OPENAI_API_KEY; tsy mbola tena mandefa request amin'ny modely OpenAI ny chat." });
  }
  if (server.includes("api/github/analyze") && server.includes("api/github/propose")) {
    findings.push({ level: "info", area: "github", message: "Efa misy GitHub repository analysis sy PR-only proposal flow." });
  }
  if (server.includes("credentials: true") && server.includes('origin: true')) {
    findings.push({ level: "warning", area: "security", message: "CORS dia mbola permissive (origin: true); tokony hofehezina amin'ny production rehefa voafaritra tsara ny frontend origins." });
  }
  if (app.includes("currentPage === " + JSON.stringify("repository"))) {
    findings.push({ level: "info", area: "ui", message: "Efa manana Repository UI ny frontend, fa ny semantic AI analysis dia mbola mila model call rehefa misy OpenAI billing." });
  }
  if (!paths.has("server/githubIntegration.js")) {
    findings.push({ level: "warning", area: "github", message: "Tsy hita ny GitHub integration module." });
  }

  return {
    mode: "local",
    summary: "Nanao diagnostic avy amin'ireo fichier fototra i N-AI. Ity dia fallback satria mbola tsy misy OpenAI API key.",
    findings,
    recommended: [
      "Ampifandraiso amin'ny modely OpenAI ny Repository Engineer rehefa vonona ny billing.",
      "Ataovy denylist ny .env, private keys ary fichiers misy secrets alohan'ny hamakiana repository.",
      "Ataovy tests/build check alohan'ny hamoronana Pull Request.",
      "Aza manoratra mivantana amin'ny main; PR ihany no ampiasaina.",
    ],
  };
}

export async function analyzeRepositoryWithAI(files) {
  if (!Array.isArray(files) || files.length === 0) {
    throw Object.assign(new Error("Tsy misy fichier azo anaovana analyse."), { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) return heuristic(files);

  const snapshot = buildSnapshot(files);
  const prompt = `Ianao no Repository Engineer an'ny N-AI Chat V2.
Diniho ireo fichiers etsy ambany. Aza mamorona zavatra tsy hita ao amin'ny code.
Omeo diagnostic azo ampiharina amin'ny teny Malagasy, miaraka amin'ny:
1) summary fohy,
2) findings misy level info/warning/critical, path ary antony,
3) bugs na incoherences hita,
4) security risks,
5) nextSteps laharana.
Aza manoro fanovana mivantana amin'ny main. Raha mila fanovana, lazao mazava ny fichier tokony ovaina sy ny antony.
${snapshot}`;

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || "OpenAI repository analysis failed.");
    error.status = response.status;
    throw error;
  }

  return {
    mode: "ai",
    model: process.env.OPENAI_MODEL || "gpt-5.6-luna",
    summary: data.output_text || "Tsy nahazo diagnostic avy amin'ny modely.",
    findings: [],
    recommended: [
      "Vakio sy hamarinina ny findings alohan'ny fanovana.",
      "Ampitahao amin'ny SHA ankehitriny ny fichier.",
      "Ataovy Pull Request ny fanovana.",
    ],
  };
}

export { ANALYSIS_FILES };
