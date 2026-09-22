import { Paperclip, Mic, MicOff, Send, Sparkles, X, FileImage } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../services/i18n";

function Composer({ message, onMessageChange, onSend }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) transcript += event.results[i][0].transcript;
      if (transcript.trim()) onMessageChange(transcript);
    };
    recognition.onerror = (event) => { console.error("Microphone error:", event.error); setIsListening(false); };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    return () => { recognition.stop(); recognitionRef.current = null; };
  }, [onMessageChange]);

  const handleMicrophone = () => {
    const recognition = recognitionRef.current;
    if (!recognition) { alert(t("voiceUnavailable")); return; }
    if (isListening) { recognition.stop(); setIsListening(false); return; }
    try { recognition.start(); } catch (error) { console.error("Microphone start error:", error); }
  };

  const handleFileClick = () => fileInputRef.current?.click();
  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) setSelectedFile(file);
  };
  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const handleSend = () => { if (message.trim()) onSend(); };
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (message.trim()) handleSend();
    }
  };

  return (
    <div className="composer-wrapper">
      {selectedFile && (
        <div className="selected-file">
          <div className="selected-file-info">
            <FileImage size={17} />
            <div><strong>{selectedFile.name}</strong><span>{Math.round(selectedFile.size / 1024)} KB</span></div>
          </div>
          <button type="button" onClick={removeFile} aria-label="Remove file" className="remove-file"><X size={16} /></button>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*,.pdf,.txt,.doc,.docx" onChange={handleFileChange} style={{ display: "none" }} />

      <div className="composer">
        <button className="composer-icon" aria-label="Ajouter un fichier" type="button" onClick={handleFileClick}><Paperclip size={19} /></button>
        <textarea value={message} onChange={(event) => onMessageChange(event.target.value)} onKeyDown={handleKeyDown} placeholder={isListening ? t("listening") : t("placeholder")} rows={1} />
        <button className={`composer-icon ${isListening ? "recording" : ""}`} aria-label={isListening ? "Stop microphone" : "Voice command"} type="button" onClick={handleMicrophone}>
          {isListening ? <MicOff size={19} /> : <Mic size={19} />}
        </button>
        <button className="send-button" onClick={handleSend} disabled={!message.trim()} aria-label="Send" type="button"><Send size={18} /></button>
      </div>

      <div className="composer-footer">
        <span><Sparkles size={10} />N-AI Chat V2</span>
        <span>{t("warning")}</span>
      </div>
    </div>
  );
}
export default Composer;
