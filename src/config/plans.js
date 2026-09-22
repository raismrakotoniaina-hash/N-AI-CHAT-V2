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
    credits: 500,
    period: "month",
    features: ["500 crédits / mois", "Chat IA", "Recherche IA", "Upload de fichiers", "Support standard"],
  },
  {
    id: "premium",
    name: "Premium",
    price: 21900,
    credits: 2000,
    period: "month",
    popular: true,
    features: ["2 000 crédits / mois", "Chat IA avancé", "Recherche web", "Génération d'images", "Mémoire IA"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 49900,
    credits: 6000,
    period: "month",
    features: ["6 000 crédits / mois", "Priorité IA", "Recherche web", "Génération d'images", "Mémoire IA", "Support prioritaire"],
  },
];

export function formatMGA(value) {
  return new Intl.NumberFormat("fr-FR").format(value) + " Ar";
}
