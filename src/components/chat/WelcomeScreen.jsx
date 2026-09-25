import { MessageSquare, Image, Search, Code2, Sparkles } from "lucide-react";
import { useTranslation } from "../../services/i18n";

function WelcomeScreen({ onAction }) {
  const { t } = useTranslation();
  const actions = [
    { id: "chat", icon: MessageSquare, title: t("chat"), description: t("chatDesc") },
    { id: "image", icon: Image, title: t("image"), description: t("imageDesc") },
    { id: "research", icon: Search, title: t("research"), description: t("researchDesc") },
    { id: "coding", icon: Code2, title: "Coding IA", description: "Aide pour coder et créer du code." },
  ];
  return (
    <main className="chat-content">
      <div className="hero">
        <div className="hero-orb"><div className="hero-orb-inner"><Sparkles size={28} /></div></div>
        <div className="hero-badge"><span />N-AI ENGINE V2</div>
        <h1>{t("heroTitle1")}<br /><span>{t("heroTitle2")}</span></h1>
        <p>{t("heroDesc")}</p>
      </div>
      <div className="quick-actions">
        {actions.map((action) => {
          const Icon = action.icon;
          return <button key={action.id} type="button" onClick={() => onAction?.(action.id)}><Icon size={18} /><div><strong>{action.title}</strong><span>{action.description}</span></div></button>;
        })}
      </div>
    </main>
  );
}
export default WelcomeScreen;
