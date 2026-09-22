export const CREDIT_COSTS = {
  chat: 1,
  coding: 8,
  research: 8,
  image: 50,
};

export const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    credits: 20,
    period: "month",
    features: ["20 crédits / mois", "Chat IA", "Recherche IA", "Upload de fichiers"],
  },
  {
    id: "basic",
    name: "Basic",
    price: 9900,
    credits: 300,
    period: "month",
    features: ["300 crédits / mois", "Chat IA", "Recherche IA", "Upload de fichiers", "Support standard"],
  },
  {
    id: "premium",
    name: "Premium",
    price: 21900,
    credits: 1200,
    period: "month",
    popular: true,
    features: ["1 200 crédits / mois", "Chat IA avancé", "Recherche web", "Génération d'images", "Mémoire IA"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 49900,
    credits: 3500,
    period: "month",
    features: ["3 500 crédits / mois", "Priorité IA", "Recherche web", "Génération d'images", "Mémoire IA", "Support prioritaire"],
  },
];

export function formatMGA(value) {
  return new Intl.NumberFormat("fr-FR").format(value) + " Ar";
}
