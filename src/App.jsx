import { useEffect, useState } from "react";

import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import WelcomeScreen from "./components/chat/WelcomeScreen";
import Composer from "./components/chat/Composer";
import MessageBubble from "./components/chat/MessageBubble";

const STORAGE_KEY = "n-ai-chat-v2-messages";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState("chat");

  /* ================================
     LOAD SAVED CHAT
     ================================= */
  useEffect(() => {
    try {
      const savedMessages =
        localStorage.getItem(STORAGE_KEY);

      if (savedMessages) {
        const parsed = JSON.parse(savedMessages);

        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch (error) {
      console.error(
        "Erreur chargement historique:",
        error
      );
    }
  }, []);

  /* ================================
     SAVE CHAT AUTOMATICALLY
     ================================= */
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(messages)
      );
    } catch (error) {
      console.error(
        "Erreur sauvegarde historique:",
        error
      );
    }
  }, [messages]);

  /* ================================
     NAVIGATION
     ================================= */
  const handleNavigate = (page) => {
    setCurrentPage(page);
    setSidebarOpen(false);
  };

  /* ================================
     SEND MESSAGE
     ================================= */
  const handleSend = async () => {
    const text = message.trim();

    if (!text || loading) {
      return;
    }

    const userMessage = {
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    const updatedMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(updatedMessages);
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Erreur API"
        );
      }

      const assistantMessage = {
        role: "assistant",
        content:
          data.response ||
          "Tsy nahazo valiny.",
        createdAt: Date.now(),
      };

      setMessages((currentMessages) => [
        ...currentMessages,
        assistantMessage,
      ]);
    } catch (error) {
      console.error(
        "Chat error:",
        error
      );

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: "assistant",
          content:
            "Nisy olana tamin'ny fifandraisana amin'ny N-AI API.",
          createdAt: Date.now(),
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  /* ================================
     WELCOME ACTIONS
     ================================= */
  const handleAction = (action) => {
    if (action === "chat") {
      setCurrentPage("chat");
      setMessage("");
      return;
    }

    if (action === "image") {
      setCurrentPage("image");
      return;
    }

    if (action === "research") {
      setCurrentPage("research");
    }
  };

  /* ================================
     NEW CHAT
     ================================= */
  const handleNewChat = () => {
    setMessages([]);
    setMessage("");
    setLoading(false);
    setCurrentPage("chat");
    setSidebarOpen(false);

    localStorage.removeItem(
      STORAGE_KEY
    );
  };

  /* ================================
     PAGE CONTENT
     ================================= */

  const renderPage = () => {
    if (currentPage === "image") {
      return (
        <main className="feature-page">
          <div className="feature-header">
            <div className="feature-icon">
              🖼️
            </div>

            <div>
              <h1>Image Studio</h1>
              <p>
                Crée et transforme tes images
                avec N-AI.
              </p>
            </div>
          </div>

          <div className="feature-card">
            <h2>Génération d'image</h2>

            <p>
              Décris l'image que tu veux
              créer. L'intégration du moteur
              de génération sera activée
              dans l'étape suivante.
            </p>

            <textarea
              className="feature-input"
              placeholder="Décris ton image..."
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
            />

            <button
              className="feature-button"
              type="button"
              onClick={() => {
                setMessage(
                  "Créer une image : "
                );
              }}
            >
              ✨ Préparer une génération
            </button>
          </div>
        </main>
      );
    }

    if (currentPage === "research") {
      return (
        <main className="feature-page">
          <div className="feature-header">
            <div className="feature-icon">
              🔎
            </div>

            <div>
              <h1>Recherche IA</h1>
              <p>
                Recherche des informations
                avec N-AI.
              </p>
            </div>
          </div>

          <div className="feature-card">
            <h2>Recherche web</h2>

            <p>
              Pose une question et N-AI
              pourra rechercher et analyser
              les informations nécessaires.
            </p>

            <textarea
              className="feature-input"
              placeholder="Que veux-tu rechercher ?"
              value={message}
              onChange={(event) =>
                setMessage(event.target.value)
              }
            />

            <button
              className="feature-button"
              type="button"
              onClick={() => {
                const query = message.trim();

                if (!query) {
                  return;
                }

                setCurrentPage("chat");
              }}
            >
              🔎 Lancer la recherche
            </button>
          </div>
        </main>
      );
    }

    if (currentPage === "memory") {
      return (
        <main className="feature-page">
          <div className="feature-header">
            <div className="feature-icon">
              🧠
            </div>

            <div>
              <h1>Mémoire</h1>
              <p>
                Gère les informations que
                N-AI peut mémoriser.
              </p>
            </div>
          </div>

          <div className="feature-card">
            <h2>Mémoire N-AI</h2>

            <p>
              Cette section permettra de
              consulter, ajouter et supprimer
              les souvenirs enregistrés.
            </p>

            <div className="memory-empty">
              <span>🧠</span>
              <strong>
                Aucune mémoire affichée
              </strong>
              <small>
                Le système de mémoire sera
                connecté prochainement.
              </small>
            </div>
          </div>
        </main>
      );
    }

    if (currentPage === "settings") {
      return (
        <main className="feature-page">
          <div className="feature-header">
            <div className="feature-icon">
              ⚙️
            </div>

            <div>
              <h1>Paramètres</h1>
              <p>
                Configure ton expérience
                N-AI Chat.
              </p>
            </div>
          </div>

          <div className="feature-card">
            <h2>Paramètres généraux</h2>

            <div className="setting-row">
              <div>
                <strong>Langue</strong>
                <span>
                  Français / Malagasy
                </span>
              </div>

              <select
                className="setting-select"
                defaultValue="fr"
              >
                <option value="fr">
                  Français
                </option>

                <option value="mg">
                  Malagasy
                </option>

                <option value="en">
                  English
                </option>
              </select>
            </div>

            <div className="setting-row">
              <div>
                <strong>Historique</strong>
                <span>
                  Les conversations sont
                  enregistrées localement.
                </span>
              </div>

              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  localStorage.removeItem(
                    STORAGE_KEY
                  );

                  setMessages([]);
                  setCurrentPage("chat");
                }}
              >
                Effacer
              </button>
            </div>
          </div>
        </main>
      );
    }

    if (currentPage === "profile") {
      return (
        <main className="feature-page">
          <div className="feature-header">
            <div className="feature-icon">
              👤
            </div>

            <div>
              <h1>Utilisateur</h1>
              <p>
                Ton compte N-AI Chat.
              </p>
            </div>
          </div>

          <div className="feature-card profile-card">
            <div className="large-avatar">
              👤
            </div>

            <h2>Utilisateur</h2>

            <span className="plan-badge">
              Free Plan
            </span>

            <div className="profile-info">
              <div>
                <strong>Crédits</strong>
                <span>
                  Consulte le solde dans la
                  barre supérieure.
                </span>
              </div>
            </div>
          </div>
        </main>
      );
    }

    /* ================================
       CHAT PAGE
       ================================= */

    return (
      <>
        {messages.length === 0 ? (
          <WelcomeScreen
            onAction={handleAction}
          />
        ) : (
          <main className="chat-content">
            <div className="messages">
              {messages.map(
                (item, index) => (
                  <MessageBubble
                    key={
                      item.createdAt ||
                      index
                    }
                    role={item.role}
                    content={item.content}
                  />
                )
              )}

              {loading && (
                <MessageBubble
                  role="assistant"
                  content=""
                  loading={true}
                />
              )}
            </div>
          </main>
        )}
      </>
    );
  };

  return (
    <div className="app">
      <Sidebar
        open={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
        onNewChat={handleNewChat}
        onNavigate={handleNavigate}
      />

      <section className="main-panel">
        <Topbar
          onMenuOpen={() =>
            setSidebarOpen(true)
          }
        />

        {renderPage()}

        {currentPage === "chat" && (
          <Composer
            message={message}
            onMessageChange={
              setMessage
            }
            onSend={handleSend}
          />
        )}
      </section>
    </div>
  );
}

export default App;
    
