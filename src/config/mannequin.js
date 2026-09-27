export const MANNEQUIN_POSES = [
  { value: "debout", label: "Mitsangana" },
  { value: "marche", label: "Mandeha" },
  { value: "profil", label: "Mijery anilany" },
  { value: "assis", label: "Mipetraka" },
];

export const MANNEQUIN_BACKGROUNDS = [
  { value: "studio", label: "Studio professionnel" },
  { value: "boutique", label: "Boutique" },
  { value: "exterieur", label: "Extérieur élégant" },
  { value: "news", label: "Studio présentation" },
];

export function prepareMannequinPrompt({ avatarName, avatarGender, avatarStyle, pose, background, details }) {
  return [
    "Virtual Mannequin: use the uploaded product photo as the clothing reference.",
    "Preserve the clothing design, colors, logos, patterns and fit as accurately as possible.",
    "Create a fictional Malagasy model; do not copy a real person's identity.",
    "Avatar: " + (avatarName || "Avatar Malagasy"),
    "Gender presentation: " + (avatarGender || "femme"),
    "Style: " + (avatarStyle || "professionnel"),
    "Pose: " + (pose || "debout"),
    "Background: " + (background || "studio"),
    "Additional details: " + (details || "natural lighting"),
  ].join("\n");
}
