import { useState } from "react";
import {
  Menu,
  Plus,
  MessageSquare,
  Image,
  Search,
  Brain,
  Settings,
  User,
  Sparkles,
  Mic,
  Paperclip,
  Send,
  ChevronDown,
  X,
} from "lucide-react";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [message, setMessage] = useState("");

  const menuItems = [
    { icon: MessageSquare, label: "Chats" },
    { icon: Image, label: "Image Studio" },
    { icon: Search, label: "Recherche IA" },
    { icon: Brain, label: "Mémoire" },
  ];

  return (
    <div className="app">
      {sidebarOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-logo">N</div>

            <div className="brand-text">
              <strong>N-AI</strong>
              <span>CHAT V2</span>
            </div>
          </div>

          <button
            className="close-sidebar"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={19} />
          </button>
        </div>

        <button className="new-chat">
          <Plus size={19} />
          <span>Nouvelle conversation</span>
        </button>

        <nav className="navigation">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button className="nav-item" key={item.label}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item">
            <Settings size={18} />
            <span>Paramètres</span>
          </button>

          <div className="user-card">
            <div className="user-avatar">
              <User size={17} />
            </div>

            <div className="user-info">
              <strong>Utilisateur</strong>
              <span>Free Plan</span>
            </div>

            <ChevronDown size={16} />
          </div>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <button
            className="menu-button"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={21} />
          </button>

          <div className="mobile-brand">
            <div className="mini-logo">N</div>
            <strong>N-AI Chat</strong>
          </div>

          <div className="topbar-right">
            <div className="credits">
              <Sparkles size={15} />
              <span>20 crédits</span>
            </div>

            <button className="profile-button">
              <div className="profile-avatar">
                <User size={15} />
              </div>
            </button>
          </div>
        </header>

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
            <button>
              <MessageSquare size={18} />
              <div>
                <strong>Discuter avec l'IA</strong>
                <span>Questions, idées et assistance</span>
              </div>
            </button>

            <button>
              <Image size={18} />
              <div>
                <strong>Créer une image</strong>
                <span>Générez vos visuels avec votre Avatar</span>
              </div>
            </button>

            <button>
              <Search size={18} />
              <div>
                <strong>Recherche intelligente</strong>
                <span>Obtenez des informations actualisées</span>
              </div>
            </button>
          </div>
        </main>

        <div className="composer-wrapper">
          <div className="composer">
            <button className="composer-icon">
              <Paperclip size={19} />
            </button>

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Écrivez votre message..."
              rows={1}
            />

            <button className="composer-icon">
              <Mic size={19} />
            </button>

            <button className="send-button">
              <Send size={18} />
            </button>
          </div>

          <div className="composer-footer">
            <span>N-AI Chat V2</span>
            <span>Les réponses IA peuvent contenir des erreurs.</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default App;
