const DEFAULT_CORE_API_URL = "https://api.4ndev.dev";

function coreError(message, status = 502, code = "core_request_failed") {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

export async function coreRequest(path, { method = "GET", body } = {}) {
  const apiKey = process.env.CORE_API_KEY;
  if (!apiKey) {
    throw coreError("4N DEV Core is not configured on the N-AI server.", 503, "core_not_configured");
  }

  const baseUrl = (process.env.CORE_API_URL || DEFAULT_CORE_API_URL).replace(/\\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const headers = { Authorization: `Bearer ${apiKey}`, Accept: "application/json" };
  const options = { method, headers, signal: AbortSignal.timeout(45000) };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${baseUrl}/v1${normalizedPath}`, options);
  } catch {
    throw coreError("Unable to connect to 4N DEV Core. Please try again later.", 502, "core_unreachable");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const apiError = data?.error;
    const message = typeof apiError === "string"
      ? apiError
      : (apiError?.message || data?.message || "4N DEV Core rejected the request.");
    const code = typeof apiError === "object" && apiError?.code
      ? apiError.code
      : (data?.code || "core_request_failed");
    throw coreError(message, response.status, code);
  }

  if (!data || data.success !== true) {
    throw coreError("4N DEV Core returned an invalid response.", 502, "core_invalid_response");
  }
  return data;
}

export async function getCoreAvailableCredits() {
  const result = await coreRequest("/credits");
  const available = Number(result?.data?.available_balance);
  if (!Number.isFinite(available) || available < 0) {
    throw coreError("4N DEV Core returned an invalid credit balance.", 502, "core_invalid_balance");
  }
  return available;
}
