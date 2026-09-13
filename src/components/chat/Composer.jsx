import {
  Paperclip,
  Mic,
  Send,
  Sparkles,
} from "lucide-react";

function Composer({
  message,
  onMessageChange,
  onSend,
}) {
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (message.trim()) {
        onSend();
      }
    }
  };

  return (
    <div className="composer-wrapper">
      <div className="composer">
        <button
          className="composer-icon"
          aria-label="Ajouter un fichier"
          type="button"
        >
          <Paperclip size={19} />
        </button>

        <textarea
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrivez votre message..."
          rows={1}
        />

        <button
          className="composer-icon"
          aria-label="Commande vocale"
          type="button"
        >
          <Mic size={19} />
        </button>

        <button
          className="send-button"
          onClick={onSend}
          disabled={!message.trim()}
          aria-label="Envoyer"
          type="button"
        >
          <Send size={18} />
        </button>
      </div>

      <div className="composer-footer">
        <span>
          <Sparkles size={10} />
          N-AI Chat V2
        </span>

        <span>
          Les réponses IA peuvent contenir des erreurs.
        </span>
      </div>
    </div>
  );
}

export default Composer;
