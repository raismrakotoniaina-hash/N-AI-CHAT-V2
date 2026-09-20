import { useState } from "react";
import { Check, Copy, User, Sparkles } from "lucide-react";

function MessageBubble({ role, content, loading = false }) {
  const [copied, setCopied] = useState(false);

  const isUser = role === "user";

  const handleCopy = async () => {
    if (!content || loading) return;

    try {
      await navigator.clipboard.writeText(content);

      setCopied(true);

      window.setTimeout(() => {
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
      <div
        className={`message-avatar ${
          isUser ? "user-avatar" : "ai-avatar"
        }`}
        aria-hidden="true"
      >
        {isUser ? <User size={16} /> : <Sparkles size={16} />}
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
              title="Copier la réponse"
            >
              {copied ? (
                <>
                  <Check size={13} />
                  <span>Copié</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copier</span>
                </>
              )}
            </button>
          )}
        </div>

        <div
          className={`message-content ${
            loading ? "message-loading" : ""
          }`}
        >
          {loading ? (
            <div
              className="typing-indicator"
              aria-label="N-AI réfléchit"
              role="status"
            >
              <span />
              <span />
              <span />
            </div>
          ) : (
            <div className="message-text">
              {content}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default MessageBubble;
