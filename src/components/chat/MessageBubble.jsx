import { useState } from "react";
import {
  Check,
  Copy,
  User,
  Sparkles,
} from "lucide-react";

function CodeBlock({ code, language = "" }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 1500);
    } catch (error) {
      console.error("Code copy error:", error);
    }
  };

  return (
    <div className="code-block">
      <div className="code-header">
        <span>{language || "code"}</span>

        <button
          type="button"
          onClick={handleCopy}
          className="code-copy"
        >
          {copied ? (
            <>
              <Check size={13} />
              Copié
            </>
          ) : (
            <>
              <Copy size={13} />
              Copier
            </>
          )}
        </button>
      </div>

      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderContent(content) {
  if (!content) return null;

  const parts = [];
  const regex = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: content.slice(lastIndex, match.index),
      });
    }

    parts.push({
      type: "code",
      language: match[1],
      content: match[2].replace(/\n$/, ""),
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: "text",
      content: content.slice(lastIndex),
    });
  }

  return parts.map((part, index) => {
    if (part.type === "code") {
      return (
        <CodeBlock
          key={`code-${index}`}
          code={part.content}
          language={part.language}
        />
      );
    }

    return (
      <div
        key={`text-${index}`}
        className="message-text"
      >
        {formatText(part.content)}
      </div>
    );
  });
}

function formatText(text) {
  const lines = text.split("\n");

  return lines.map((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("### ")) {
      return (
        <h4 key={index}>
          {trimmed.replace("### ", "")}
        </h4>
      );
    }

    if (trimmed.startsWith("## ")) {
      return (
        <h3 key={index}>
          {trimmed.replace("## ", "")}
        </h3>
      );
    }

    if (trimmed.startsWith("# ")) {
      return (
        <h2 key={index}>
          {trimmed.replace("# ", "")}
        </h2>
      );
    }

    if (trimmed.startsWith("- ")) {
      return (
        <div key={index} className="message-list-item">
          • {trimmed.substring(2)}
        </div>
      );
    }

    if (/^\d+\.\s/.test(trimmed)) {
      return (
        <div key={index} className="message-list-item">
          {trimmed}
        </div>
      );
    }

    if (trimmed === "") {
      return <div key={index} className="message-space" />;
    }

    return (
      <div key={index}>
        {formatInlineMarkdown(line)}
      </div>
    );
  });
}

function formatInlineMarkdown(text) {
  const parts = [];
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;

  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const value = match[0];

    if (value.startsWith("**")) {
      parts.push(
        <strong key={parts.length}>
          {value.slice(2, -2)}
        </strong>
      );
    } else if (value.startsWith("`")) {
      parts.push(
        <code
          key={parts.length}
          className="inline-code"
        >
          {value.slice(1, -1)}
        </code>
      );
    } else if (value.startsWith("*")) {
      parts.push(
        <em key={parts.length}>
          {value.slice(1, -1)}
        </em>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function MessageBubble({
  role,
  content,
  loading = false,
}) {
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
        isUser
          ? "message-row-user"
          : "message-row-ai"
      }`}
    >
      <div
        className={`message-avatar ${
          isUser
            ? "user-avatar"
            : "ai-avatar"
        }`}
        aria-hidden="true"
      >
        {isUser ? (
          <User size={16} />
        ) : (
          <Sparkles size={16} />
        )}
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
            loading
              ? "message-loading"
              : ""
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
            renderContent(content)
          )}
        </div>
      </div>
    </article>
  );
}

export default MessageBubble;
