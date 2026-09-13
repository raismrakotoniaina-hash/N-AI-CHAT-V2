export const aiModels = [
  {
    id: "n-ai-fast",
    name: "N-AI Fast",
    description: "Haingana ho an'ny resaka andavanandro.",
    type: "chat",
    creditCost: 1,
    badge: "FAST",
  },
  {
    id: "n-ai-pro",
    name: "N-AI Pro",
    description: "Fandinihana lalina sy valiny matihanina.",
    type: "chat",
    creditCost: 3,
    badge: "PRO",
  },
  {
    id: "n-ai-research",
    name: "N-AI Research",
    description: "Recherche web sy analyse vaovao.",
    type: "research",
    creditCost: 5,
    badge: "RESEARCH",
  },
  {
    id: "n-ai-image",
    name: "N-AI Image",
    description: "Famoronana sary sy Avatar.",
    type: "image",
    creditCost: 20,
    badge: "IMAGE",
  },
];

export const defaultModel = aiModels[0];

export function getModelById(modelId) {
  return aiModels.find((model) => model.id === modelId) || defaultModel;
}
