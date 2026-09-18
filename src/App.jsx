import { useState } from "react";

import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import WelcomeScreen from "./components/chat/WelcomeScreen";
import Composer from "./components/chat/Composer";
import MessageBubble from "./components/chat/MessageBubble";

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
                <MessageBubble
                  key={index}
                  role={item.role}
                  content={item.content}
                />
              ))}

              {loading && (
                <MessageBubble
                  role="assistant"
                  loading
                />
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
