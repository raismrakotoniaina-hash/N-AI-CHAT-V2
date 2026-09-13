import { useState } from "react";

function App() {
  const [message, setMessage] = useState("");

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <span className="logo-mark">N</span>
          <div>
            <strong>N-AI Chat</strong>
            <small>V2</small>
          </div>
        </div>

        <div className="status">
          <span className="status-dot"></span>
          Online
        </div>
      </header>

      <main className="chat-area">
        <div className="welcome">
          <div className="welcome-icon">✦</div>
          <h1>Bienvenue sur N-AI Chat V2</h1>
          <p>
            Votre assistant IA intelligent, rapide et sécurisé.
          </p>
        </div>
      </main>

      <footer className="composer">
        <button className="icon-button" type="button">
          +
        </button>

        <input
          type="text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Écrivez votre message..."
        />

        <button className="send-button" type="button">
          ➤
        </button>
      </footer>
    </div>
  );
}

export default App;
