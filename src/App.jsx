import { useState } from "react";

import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import WelcomeScreen from "./components/chat/WelcomeScreen";
import Composer from "./components/chat/Composer";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const text = message.trim();

    if (!text || loading) {
      return;
    }

    const userMessage = {
      role: "user",
      content: text,
    };

    const updatedMessages = [...messages, userMessage];

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
        throw new Error(data.error || "Erreur API");
      }

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content: data.response || "Tsy nahazo valiny.",
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);

      setMessages([
        ...updatedMessages,
        {
          role: "assistant",
          content:
            "Nisy olana tamin'ny fifandraisana amin'ny N-AI API.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action) => {
    if (action === "chat") {
      return;
    }

    if (action === "image") {
      setMessage("Créer une image : ");
      return;
    }

    if (action === "research") {
      setMessage("Recherche : ");
    }
  };

  return (
    <div className="app">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <section className="main-panel">
        <Topbar onMenuOpen={() => setSidebarOpen(true)} />

        {messages.length === 0 ? (
          <WelcomeScreen onAction={handleAction} />
        ) : (
          <main className="chat-content">
            <div className="messages">
              {messages.map((item, index) => (
                <div
                  className={`message ${
                    item.role === "user"
                      ? "message-user"
                      : "message-ai"
                  }`}
                  key={index}
                >
                  <div className="message-role">
                    {item.role === "user" ? "Vous" : "N-AI"}
                  </div>

                  <div className="message-content">
                    {item.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="message message-ai">
                  <div className="message-role">N-AI</div>

                  <div className="message-content">
                    Réflexion en cours...
                  </div>
                </div>
              )}
            </div>
          </main>
        )}

        <Composer
          message={message}
          onMessageChange={setMessage}
          onSend={handleSend}
        />
      </section>
    </div>
  );
}

export default App;
