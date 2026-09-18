import { useState } from "react";

function MessageBubble({ role, content, loading = false }) {
  const [copied, setCopied] = useState(false);

  const isUser = role === "user";

  const handleCopy = async () => {
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error("Copy error:", error);
    }
  };

  return (
    <article
      className={`message-row ${
        isUser ? "message-row-user" : "message-row-ai"
      }`}
    >
      <div className={`message-avatar ${isUser ? "user-avatar" : "ai-avatar"}`}>
        {isUser ? "U" : "N"}
      </div>

      <div className="message-body">
        <div className="message-header">
          <span className="message-name">
            {isUser ? "Vous" : "N-AI"}
          </span>

          {!isUser && !loading && content && (
            <button
              type="button"
              className="message-copy"
              onClick={handleCopy}
              aria-label="Copier la réponse"
            >
              {copied ? "Copié" : "Copier"}
            </button>
          )}
        </div>

        <div
          className={`message-content ${
            loading ? "message-loading" : ""
          }`}
        >
          {loading ? (
            <div className="typing-indicator" aria-label="N-AI réfléchit">
              <span />
              <span />
              <span />
            </div>
          ) : (
            content
          )}
        </div>
      </div>
    </article>
  );
}

export default MessageBubble;
