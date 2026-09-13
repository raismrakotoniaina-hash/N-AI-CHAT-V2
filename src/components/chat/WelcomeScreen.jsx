import {
  MessageSquare,
  Image,
  Search,
  Sparkles,
} from "lucide-react";

function WelcomeScreen({ onAction }) {
  const actions = [
    {
      id: "chat",
      icon: MessageSquare,
      title: "Discuter avec l'IA",
      description: "Questions, idées et assistance intelligente.",
    },
    {
      id: "image",
      icon: Image,
      title: "Créer une image",
      description: "Générez des visuels avec votre Avatar.",
    },
    {
      id: "research",
      icon: Search,
      title: "Recherche intelligente",
      description: "Trouvez des informations actualisées sur le web.",
    },
  ];

  return (
    <main className="chat-content">
      <div className="hero">
        <div className="hero-orb">
          <div className="hero-orb-inner">
            <Sparkles size={28} />
          </div>
        </div>

        <div className="hero-badge">
          <span />
          N-AI ENGINE V2
        </div>

        <h1>
          Votre intelligence,
          <br />
          <span>amplifiée.</span>
        </h1>

        <p>
          Discutez, créez, recherchez et donnez vie à vos idées
          avec N-AI Chat.
        </p>
      </div>

      <div className="quick-actions">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <button
              key={action.id}
              type="button"
              onClick={() => onAction?.(action.id)}
            >
              <Icon size={18} />

              <div>
                <strong>{action.title}</strong>
                <span>{action.description}</span>
              </div>
            </button>
          );
        })}
      </div>
    </main>
  );
}

export default WelcomeScreen;
