export async function generateImage({ prompt, referenceImageDataUrl = null }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY tsy mbola voapetraka.");

  const content = [{ type: "input_text", text: prompt }];
  if (referenceImageDataUrl) {
    if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(referenceImageDataUrl)) {
      throw new Error("Reference image format tsy ekena.");
    }
    if (referenceImageDataUrl.length > 12 * 1024 * 1024) {
      throw new Error("Reference image lehibe loatra.");
    }
    content.push({ type: "input_image", image_url: referenceImageDataUrl });
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-5.6-luna",
      input: [{ role: "user", content }],
      tools: [{
        type: "image_generation",
        model: "gpt-image-2",
        size: "1024x1024",
        quality: "auto",
        output_format: "png",
      }],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error?.message || "Image generation failed.");
  }

  const imageCall = (data.output || []).find((item) => item.type === "image_generation_call");
  if (!imageCall?.result) throw new Error("Tsy nahazo sary avy amin'ny image model.");
  return { imageDataUrl: `data:image/png;base64,${imageCall.result}`, responseId: data.id || null };
}
