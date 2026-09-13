export const appConfig = {
  name: "N-AI Chat",
  shortName: "N-AI",
  version: "2.0.0",
  tagline: "Votre intelligence, amplifiée.",
  description:
    "Assistant IA intelligent, créatif et sécurisé développé par 4N Dev.",

  brand: {
    company: "4N Dev",
    primary: "#00D9FF",
    secondary: "#716BFF",
    background: "#040712",
  },

  languages: ["mg", "fr", "en"],
  defaultLanguage: "mg",

  features: {
    chat: true,
    imageGeneration: true,
    avatarGeneration: true,
    webResearch: true,
    memory: true,
    fileUpload: true,
    voice: true,
  },

  imageStudio: {
    avatarReference: true,
    identityConsistency: true,
    multipleAvatars: true,
  },

  plans: {
    free: {
      name: "Free",
      credits: 20,
    },
    starter: {
      name: "Starter",
      credits: 500,
    },
    pro: {
      name: "Pro",
      credits: 2000,
    },
  },
};
