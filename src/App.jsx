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
      setMessage("");
      return;
    }

    if (action === "image") {
      setMessage(
        "Créer une image : "
      );
      return;
    }

    if (action === "research") {
      setMessage(
        "Recherche : "
      );
    }
  };

  /* ================================
     NEW CHAT
     ================================= */
  const handleNewChat = () => {
    setMessages([]);
    setMessage("");
    setLoading(false);
    setSidebarOpen(false);

    localStorage.removeItem(
      STORAGE_KEY
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
      />

      <section className="main-panel">
        <Topbar
          onMenuOpen={() =>
            setSidebarOpen(true)
          }
        />

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

        <Composer
          message={message}
          onMessageChange={
            setMessage
          }
          onSend={handleSend}
        />
      </section>
    </div>
  );
}

export default App;
