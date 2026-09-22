import { useEffect, useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import WelcomeScreen from "./components/chat/WelcomeScreen";
import Composer from "./components/chat/Composer";
import MessageBubble from "./components/chat/MessageBubble";
import AuthPage from "./components/auth/AuthPage";
import { LANGUAGES, useTranslation } from "./services/i18n";
import { PLANS, formatMGA } from "./config/plans";

const STORAGE_KEY = "n-ai-chat-v2-messages";

function App() {
  const { language, t, setLanguage } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState("chat");
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch (error) { console.error("Erreur chargement historique:", error); }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(messages)); }
    catch (error) { console.error("Erreur sauvegarde historique:", error); }
  }, [messages]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/me", { credentials: "include" });
        if (response.ok) {
          const data = await response.json();
          if (data.user) {
            setUser(data.user);
            setCredits(data.user.credits ?? 0);
          }
        }
      } catch (error) {
        console.error("Auth check error:", error);
      } finally {
        setAuthChecking(false);
      }
    };
    checkAuth();
  }, []);

  const handleAuthenticated = (account) => { setUser(account); setCredits(account.credits); setCurrentPage("chat"); };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    setUser(null);
    setCredits(0);
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleNavigate = (page) => { setCurrentPage(page); setSidebarOpen(false); };

  const handleSend = async () => {
    const text = message.trim();
    if (!text || loading) return;

    const userMessage = { role: "user", content: text, createdAt: Date.now() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });
      const data = await response.json();
      if (response.status === 401) { setUser(null); throw new Error("Session expirée. Veuillez vous reconnecter."); }
      if (!response.ok || !data.success) throw new Error(data.error || "Erreur API");
      setCredits(data.credits ?? credits);

      setMessages((current) => [...current, {
        role: "assistant",
        content: data.response || "Tsy nahazo valiny.",
        createdAt: Date.now(),
      }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((current) => [...current, {
        role: "assistant",
        content: t("assistantError"),
        createdAt: Date.now(),
        error: true,
      }]);
    } finally { setLoading(false); }
  };

  const handleAction = (action) => {
    if (action === "chat") { setCurrentPage("chat"); setMessage(""); }
    if (action === "image") setCurrentPage("image");
    if (action === "research") setCurrentPage("research");
  };

  const handleNewChat = () => {
    setMessages([]);
    setMessage("");
    setLoading(false);
    setCurrentPage("chat");
    setSidebarOpen(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const renderPlans = () => (
    <main className="feature-page">
      <div className="feature-header">
        <div className="feature-icon">💳</div>
        <div><h1>{t("plans")}</h1><p>{t("choosePlan")}</p></div>
      </div>
      <div className="plans-grid">
        {PLANS.map((plan) => (
          <article className={`plan-card ${plan.popular ? "plan-popular" : ""}`} key={plan.id}>
            {plan.popular && <div className="plan-popular-label">{t("popular")}</div>}
            <h2>{plan.name}</h2>
            <div className="plan-price">{plan.price === 0 ? t("free") : formatMGA(plan.price)}{plan.price > 0 && <small>{t("month")}</small>}</div>
            <div className="plan-credits">{plan.credits.toLocaleString("fr-FR")} {t("credits")}</div>
            <ul>{plan.features.map((feature) => <li key={feature}>✓ {feature}</li>)}</ul>
            <button className="feature-button" type="button" onClick={() => handleNavigate("profile")}>
              {plan.id === "free" ? t("currentPlan") : t("subscribe")}
            </button>
          </article>
        ))}
      </div>
    </main>
  );

  const renderPage = () => {
    if (currentPage === "plans") return renderPlans();

    if (currentPage === "image") return (
      <main className="feature-page">
        <div className="feature-header"><div className="feature-icon">🖼️</div><div><h1>{t("imageStudio")}</h1><p>{t("imageDesc")}</p></div></div>
        <div className="feature-card">
          <h2>{t("imageTitle")}</h2><p>{t("imageDesc")}</p>
          <textarea className="feature-input" placeholder={t("imagePlaceholder")} value={message} onChange={(e) => setMessage(e.target.value)} />
          <button className="feature-button" type="button" onClick={() => setMessage("Créer une image : ")}>{t("prepareImage")}</button>
        </div>
      </main>
    );

    if (currentPage === "research") return (
      <main className="feature-page">
        <div className="feature-header"><div className="feature-icon">🔎</div><div><h1>{t("researchAI")}</h1><p>{t("researchDesc")}</p></div></div>
        <div className="feature-card">
          <h2>{t("searchTitle")}</h2><p>{t("searchDesc")}</p>
          <textarea className="feature-input" placeholder={t("searchPlaceholder")} value={message} onChange={(e) => setMessage(e.target.value)} />
          <button className="feature-button" type="button" onClick={() => { if (message.trim()) setCurrentPage("chat"); }}>{t("launchSearch")}</button>
        </div>
      </main>
    );

    if (currentPage === "memory") return (
      <main className="feature-page">
        <div className="feature-header"><div className="feature-icon">🧠</div><div><h1>{t("memory")}</h1><p>{t("memoryDesc")}</p></div></div>
        <div className="feature-card"><h2>{t("memoryTitle")}</h2><p>{t("memoryDesc")}</p>
          <div className="memory-empty"><span>🧠</span><strong>{t("noMemory")}</strong><small>{t("memorySoon")}</small></div>
        </div>
      </main>
    );

    if (currentPage === "settings") return (
      <main className="feature-page">
        <div className="feature-header"><div className="feature-icon">⚙️</div><div><h1>{t("settings")}</h1><p>{t("settingsDesc")}</p></div></div>
        <div className="feature-card">
          <h2>{t("generalSettings")}</h2>
          <div className="setting-row">
            <div><strong>{t("language")}</strong><span>Français / Malagasy / English</span></div>
            <select className="setting-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {Object.entries(LANGUAGES).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
            </select>
          </div>
          <div className="setting-row">
            <div><strong>{t("history")}</strong><span>{t("savedLocally")}</span></div>
            <button className="secondary-button" type="button" onClick={() => { localStorage.removeItem(STORAGE_KEY); setMessages([]); setCurrentPage("chat"); }}>{t("clear")}</button>
          </div>
          <div className="setting-row">
            <div><strong>{t("plan")}</strong><span>{t("planDesc")}</span></div>
            <button className="secondary-button" type="button" onClick={() => setCurrentPage("plans")}>{t("plans")}</button>
          </div>
        </div>
      </main>
    );

    if (currentPage === "profile") return (
      <main className="feature-page">
        <div className="feature-header"><div className="feature-icon">👤</div><div><h1>{t("profile")}</h1><p>{t("accountText")}</p></div></div>
        <div className="feature-card profile-card">
          <div className="large-avatar">👤</div><h2>{t("user")}</h2><span className="plan-badge">{t("freePlan")}</span>
          <div className="profile-info"><div><strong>{t("balance")}</strong><span>{t("balanceDesc")}</span></div></div>
          <button className="feature-button" type="button" onClick={() => setCurrentPage("plans")}>{t("plans")}</button>
          <button className="secondary-button" type="button" onClick={handleLogout}>Déconnexion</button>
        </div>
      </main>
    );

    return messages.length === 0 ? <WelcomeScreen onAction={handleAction} /> : (
      <main className="chat-content">
        <div className="messages">
          {messages.map((item, index) => <MessageBubble key={item.createdAt || index} role={item.role} content={item.content} />)}
          {loading && <MessageBubble role="assistant" content="" loading />}
        </div>
      </main>
    );
  };

  if (authChecking) {
    return <div className="auth-loading">N-AI Chat V2...</div>;
  }

  if (!user) {
    return <AuthPage onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="app">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onNewChat={handleNewChat} onNavigate={handleNavigate} />
      <section className="main-panel">
        <Topbar credits={credits} onMenuOpen={() => setSidebarOpen(true)} onProfileClick={() => handleNavigate("profile")} />
        {renderPage()}
        {currentPage === "chat" && <Composer message={message} onMessageChange={setMessage} onSend={handleSend} />}
      </section>
    </div>
  );
}

export default App;
