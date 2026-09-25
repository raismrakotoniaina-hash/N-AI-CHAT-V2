import { useEffect, useState } from "react";
import { apiUrl } from "./config/api";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import WelcomeScreen from "./components/chat/WelcomeScreen";
import Composer from "./components/chat/Composer";
import MessageBubble from "./components/chat/MessageBubble";
import AuthPage from "./components/auth/AuthPage";
import { LANGUAGES, useTranslation } from "./services/i18n";
import { PLANS, formatMGA } from "./config/plans";

const STORAGE_KEY = "n-ai-chat-v2-messages";
const CONVERSATIONS_KEY = "n-ai-chat-v2-conversations";

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
  const [paymentLoading, setPaymentLoading] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationsLoaded, setConversationsLoaded] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [memories, setMemories] = useState([]);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memoryError, setMemoryError] = useState("");
  const [memoryDraft, setMemoryDraft] = useState("");
  const [memoryCategory, setMemoryCategory] = useState("general");
  const [repositoryFiles, setRepositoryFiles] = useState([]);
  const [repositoryPath, setRepositoryPath] = useState("");
  const [repositoryFile, setRepositoryFile] = useState(null);
  const [repositoryLoading, setRepositoryLoading] = useState(false);
  const [repositoryError, setRepositoryError] = useState("");
  const [isRepositoryOwner, setIsRepositoryOwner] = useState(false);
  const [developerFile, setDeveloperFile] = useState(null);
  const [developerFiles, setDeveloperFiles] = useState([]);
  const [developerError, setDeveloperError] = useState("");
  const [developerLoading, setDeveloperLoading] = useState(false);

  useEffect(() => {
    setHistoryLoaded(false);
    setConversationsLoaded(false);

    try {
      const key = user?.id
        ? CONVERSATIONS_KEY + "-" + user.id
        : CONVERSATIONS_KEY;

      const savedConversations = localStorage.getItem(key);
      let parsedConversations = savedConversations ? JSON.parse(savedConversations) : [];

      if (!Array.isArray(parsedConversations)) parsedConversations = [];

      const legacyKey = user?.id
        ? STORAGE_KEY + "-" + user.id
        : STORAGE_KEY;
      const legacySaved = localStorage.getItem(legacyKey);

      if (parsedConversations.length === 0 && legacySaved) {
        const legacyMessages = JSON.parse(legacySaved);
        if (Array.isArray(legacyMessages) && legacyMessages.length > 0) {
          parsedConversations = [{
            id: String(Date.now()),
            title: legacyMessages.find((item) => item.role === "user")?.content?.slice(0, 45) || "Nouvelle conversation",
            messages: legacyMessages,
            updatedAt: Date.now(),
          }];
        }
      }

      setConversations(parsedConversations);
      if (parsedConversations.length > 0) {
        const latest = [...parsedConversations].sort((a, b) => b.updatedAt - a.updatedAt)[0];
        setCurrentConversationId(latest.id);
        setMessages(Array.isArray(latest.messages) ? latest.messages : []);
      } else {
        setCurrentConversationId(String(Date.now()));
        setMessages([]);
      }
    } catch (error) {
      console.error("Erreur chargement historique:", error);
      setConversations([]);
      setCurrentConversationId(String(Date.now()));
      setMessages([]);
    } finally {
      setHistoryLoaded(true);
      setConversationsLoaded(true);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!historyLoaded || !conversationsLoaded || !messages.length || !currentConversationId) return;

    try {
      const key = user?.id
        ? CONVERSATIONS_KEY + "-" + user.id
        : CONVERSATIONS_KEY;

      const title =
        messages.find((item) => item.role === "user")?.content?.slice(0, 45) ||
        "Nouvelle conversation";

      setConversations((current) => {
        const updated = {
          id: currentConversationId,
          title,
          messages,
          updatedAt: Date.now(),
        };

        const next = current.some((item) => item.id === currentConversationId)
          ? current.map((item) => item.id === currentConversationId ? updated : item)
          : [updated, ...current];

        const sorted = [...next].sort((a, b) => b.updatedAt - a.updatedAt);
        localStorage.setItem(key, JSON.stringify(sorted));
        return sorted;
      });
    } catch (error) {
      console.error("Erreur sauvegarde conversations:", error);
    }
  }, [messages, currentConversationId, user?.id, historyLoaded, conversationsLoaded]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(apiUrl("/api/auth/me"), {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();

          if (data.user) {
            setUser(data.user);
            setCredits(data.user.credits ?? 0);
            setIsRepositoryOwner(Boolean(data.user.isRepositoryOwner));
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

  const loadRepository = async (path = "") => {
    setRepositoryLoading(true);
    setRepositoryError("");
    setRepositoryFile(null);
    try {
      const response = await fetch(apiUrl("/api/github/files?path=" + encodeURIComponent(path)), { credentials: "include" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || "Tsy afaka mamaky repository.");
      setRepositoryFiles(Array.isArray(data.files) ? data.files : []);
      setRepositoryPath(path);
    } catch (error) {
      setRepositoryError(error.message || "GitHub integration error.");
    } finally {
      setRepositoryLoading(false);
    }
  };

  const openRepositoryFile = async (path) => {
    setRepositoryLoading(true);
    setRepositoryError("");
    try {
      const response = await fetch(apiUrl("/api/github/file?path=" + encodeURIComponent(path)), { credentials: "include" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) throw new Error(data.error || "Tsy afaka mamaky fichier.");
      setRepositoryFile(data.file);
    } catch (error) {
      setRepositoryError(error.message || "GitHub integration error.");
    } finally {
      setRepositoryLoading(false);
    }
  };

  const handleAuthenticated = (account) => {
    setUser(account);
    setCredits(account.credits ?? 0);
    setIsRepositoryOwner(Boolean(account.isRepositoryOwner));
    setCurrentPage("chat");
  };

  const handleLogout = async () => {
    try {
      await fetch(apiUrl("/api/auth/logout"), {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    }

    setUser(null);
    setCredits(0);
    setIsRepositoryOwner(false);
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  useEffect(() => {
    if (!user || currentPage !== "profile") return;

    const loadPaymentHistory = async () => {
      try {
        const response = await fetch(apiUrl("/api/payments/history"), {
          credentials: "include",
        });
        if (!response.ok) return;
        const data = await response.json();
        if (data.success && Array.isArray(data.payments)) {
          setPaymentHistory(data.payments);
        }
      } catch (error) {
        console.error("Payment history error:", error);
      }
    };

    loadPaymentHistory();
  }, [user, currentPage]);

  useEffect(() => {
    if (!user || currentPage !== "memory") return;

    const loadMemories = async () => {
      setMemoryLoading(true);
      setMemoryError("");
      try {
        const response = await fetch(apiUrl("/api/memories"), {
          credentials: "include",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Tsy afaka naka ny mémoire.");
        }
        setMemories(Array.isArray(data.memories) ? data.memories : []);
      } catch (error) {
        console.error("Memory load error:", error);
        setMemoryError(error.message || "Nisy olana tamin'ny mémoire.");
      } finally {
        setMemoryLoading(false);
      }
    };

    loadMemories();
  }, [user, currentPage]);

  const handleAddMemory = async () => {
    const content = memoryDraft.trim();
    if (!content || memoryLoading) return;

    setMemoryLoading(true);
    setMemoryError("");
    try {
      const response = await fetch(apiUrl("/api/memories"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content, category: memoryCategory }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Tsy afaka mitahiry mémoire.");
      }
      setMemories((current) => [data.memory, ...current]);
      setMemoryDraft("");
    } catch (error) {
      console.error("Memory create error:", error);
      setMemoryError(error.message || "Nisy olana tamin'ny fitahirizana.");
    } finally {
      setMemoryLoading(false);
    }
  };

  const handleDeleteMemory = async (id) => {
    if (memoryLoading) return;

    setMemoryLoading(true);
    setMemoryError("");
    try {
      const response = await fetch(apiUrl(`/api/memories/${encodeURIComponent(id)}`), {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Tsy afaka mamafa mémoire.");
      }
      setMemories((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Memory delete error:", error);
      setMemoryError(error.message || "Nisy olana tamin'ny famafana.");
    } finally {
      setMemoryLoading(false);
    }
  };

  const handleDeveloperUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    setDeveloperLoading(true);
    setDeveloperError("");
    setDeveloperFile(null);

    try {
      const safeFiles = files
        .filter((file) => file.size <= 180000)
        .slice(0, 50);

      const previews = await Promise.all(
        safeFiles.map(async (file) => ({
          path: file.webkitRelativePath || file.name,
          size: file.size,
          type: file.type || "text/plain",
          content: await file.text(),
        }))
      );

      setDeveloperFiles(previews);
    } catch (error) {
      setDeveloperError(error.message || "Tsy afaka namaky ny projet.");
    } finally {
      setDeveloperLoading(false);
      event.target.value = "";
    }
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
    setSidebarOpen(false);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get("payment");
    const reference = params.get("reference");

    if (!paymentStatus) return;

    const refreshAccount = async () => {
      try {
        const response = await fetch(apiUrl("/api/auth/me"), {
          credentials: "include",
        });
        if (!response.ok) return;
        const data = await response.json();
        if (data.user) {
          setUser(data.user);
          setCredits(data.user.credits ?? 0);
        }
      } catch (error) {
        console.error("Payment account refresh error:", error);
      }
    };

    refreshAccount();

    if (paymentStatus === "success" && reference) {
      const timer = window.setInterval(async () => {
        try {
          const response = await fetch(
            apiUrl(`/api/payments/${encodeURIComponent(reference)}`),
            { credentials: "include" }
          );
          if (!response.ok) return;

          const data = await response.json();
          if (data?.payment?.status === "paid") {
            await refreshAccount();
            window.clearInterval(timer);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } catch (error) {
          console.error("Payment status error:", error);
        }
      }, 2500);

      window.setTimeout(() => window.clearInterval(timer), 30000);
      return () => window.clearInterval(timer);
    }

    window.history.replaceState({}, document.title, window.location.pathname);
  }, []);

  const handlePurchase = async (planId) => {
    if (planId === "free" || paymentLoading) {
      return;
    }

    setPaymentError("");
    setPaymentLoading(planId);

    try {
      const response = await fetch(apiUrl("/api/payments/create"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          planId,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Tsy afaka namorona paiement."
        );
      }

      if (!data.paymentLink) {
        throw new Error("Tsy nahazo payment link avy amin'ny PAPI.");
      }

      window.location.href = data.paymentLink;
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentError(
        error.message || "Nisy olana tamin'ny paiement."
      );
    } finally {
      setPaymentLoading("");
    }
  };

  const handleSend = async (operation = "chat") => {
    const text = message.trim();

    if (!text || loading) {
      return;
    }

    const userMessage = {
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          messages: updatedMessages,
          operation,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        setUser(null);
        throw new Error(
          "Session expirée. Veuillez vous reconnecter."
        );
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Erreur API");
      }

      setCredits(data.credits ?? credits);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: data.response || "Tsy nahazo valiny.",
          createdAt: Date.now(),
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: t("assistantError"),
          createdAt: Date.now(),
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action) => {
    if (action === "chat") {
      setCurrentPage("chat");
      setMessage("");
    }

    if (action === "image") {
      setCurrentPage("image");
    }

    if (action === "research") {
      setCurrentPage("research");
    }

    if (action === "coding") {
      setCurrentPage("coding");
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setMessage("");
    setLoading(false);
    setCurrentConversationId(String(Date.now()));
    setCurrentPage("chat");
    setSidebarOpen(false);
  };

  const handleSelectConversation = (conversation) => {
    setCurrentConversationId(conversation.id);
    setMessages(Array.isArray(conversation.messages) ? conversation.messages : []);
    setMessage("");
    setLoading(false);
    setCurrentPage("chat");
    setSidebarOpen(false);
  };

  const renderPlans = () => (
    <main className="feature-page">
      <div className="feature-header">
        <div className="feature-icon">💳</div>

        <div>
          <h1>{t("plans")}</h1>
          <p>{t("choosePlan")}</p>
        </div>
      </div>

      <div className="plans-grid">
        {PLANS.map((plan) => (
          <article
            className={`plan-card ${
              plan.popular ? "plan-popular" : ""
            }`}
            key={plan.id}
          >
            {plan.popular && (
              <div className="plan-popular-label">
                {t("popular")}
              </div>
            )}

            <h2>{plan.name}</h2>

            <div className="plan-price">
              {plan.price === 0
                ? t("free")
                : formatMGA(plan.price)}

              {plan.price > 0 && (
                <small>{t("month")}</small>
              )}
            </div>

            <div className="plan-credits">
              {plan.credits.toLocaleString("fr-FR")}{" "}
              {t("credits")}
            </div>

            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>✓ {feature}</li>
              ))}
            </ul>

            <button
              className="feature-button"
              type="button"
              disabled={
                plan.id !== "free" &&
                paymentLoading === plan.id
              }
              onClick={() =>
                plan.id === "free"
                  ? handleNavigate("profile")
                  : handlePurchase(plan.id)
              }
            >
              {plan.id === "free"
                ? t("currentPlan")
                : paymentLoading === plan.id
                  ? "Miandry..."
                  : "Hividy amin'ny Papi"}
            </button>
          </article>
        ))}
      </div>

      {paymentError && (
        <div
          className="auth-error"
          style={{ marginTop: 16 }}
        >
          {paymentError}
        </div>
      )}
    </main>
  );

  const renderPage = () => {
    if (currentPage === "plans") {
      return renderPlans();
    }

    if (currentPage === "repository" && !isRepositoryOwner) {
      return <main className="feature-page"><div className="feature-card"><h2>Accès réservé</h2><p>Cette section est réservée à l’administrateur.</p></div></main>;
    }

    if (currentPage === "repository") {
      return (
        <main className="feature-page">
          <div className="feature-header">
            <div className="feature-icon">📁</div>
            <div>
              <h1>Repository N-AI</h1>
              <p>Mamaky mivantana ny repository N-AI-CHAT-V2.</p>
            </div>
          </div>
          <div className="feature-card">
            <button className="secondary-button" type="button" onClick={() => { setCurrentPage("coding"); setRepositoryFile(null); }}>
              ← Coding IA
            </button>
            <button className="feature-button" type="button" disabled={repositoryLoading} onClick={() => loadRepository("")} style={{ marginTop: 12 }}>
              {repositoryLoading ? "Miandry..." : "🔄 Vakio ny repository"}
            </button>
            <button className="feature-button" type="button" disabled={repositoryLoading} onClick={async () => {
              setRepositoryLoading(true);
              setRepositoryError("");
              try {
                const response = await fetch(apiUrl("/api/github/analyze"), {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ path: repositoryPath }),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) throw new Error(data.error || "Tsy afaka manao analyse.");
                setRepositoryFile({ path: "Analyse N-AI", content: JSON.stringify(data.analysis, null, 2) });
              } catch (error) {
                setRepositoryError(error.message || "Repository analysis error.");
              } finally {
                setRepositoryLoading(false);
              }
            }} style={{ marginTop: 10 }}>
              🧠 Analyse ny Repository
            </button>
            {repositoryError && <div className="auth-error" style={{ marginTop: 12 }}>{repositoryError}</div>}
            {repositoryFile ? (
              <div style={{ marginTop: 16 }}>
                <strong>{repositoryFile.path}</strong>
                <pre style={{ whiteSpace: "pre-wrap", overflowX: "auto", marginTop: 10 }}>{repositoryFile.content}</pre>
              </div>
            ) : (
              <div style={{ marginTop: 16 }}>
                {repositoryFiles.map((item) => (
                  <button key={item.path} className="secondary-button" type="button" onClick={() => item.type === "dir" ? loadRepository(item.path) : openRepositoryFile(item.path)} style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 8 }}>
                    {item.type === "dir" ? "📁" : "📄"} {item.name}
                  </button>
                ))}
                {!repositoryLoading && repositoryFiles.length === 0 && <small>Tsindrio “🔄 Vakio ny repository”.</small>}
              </div>
            )}
          </div>
        </main>
      );
    }

    if (currentPage === "developer") {
      return (
        <main className="feature-page">
          <div className="feature-header">
            <div className="feature-icon">🧑‍💻</div>
            <div>
              <h1>Projet développeur</h1>
              <p>Amboary, diniho ary fantaro ny projet-nao miaraka amin'i N-AI.</p>
            </div>
          </div>
          <div className="feature-card">
            <h2>Atomboka amin'ny projet-nao</h2>
            <p>
              Ity toerana ity dia natao ho an'ny développeur rehetra. Tsy mahazo miditra amin'ny repository anatiny an'i N-AI ny mpampiasa.
            </p>
            <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
              <button className="feature-button" type="button" onClick={() => setMessage("Ampio aho handinika ity projet ity: ")}>
                📂 Hampiditra projet
              </button>
              <button className="secondary-button" type="button" onClick={() => setMessage("Ampifandraiso amin'ny GitHub ny projet-ko: ")}>
                🔗 Ampifandraiso GitHub
              </button>
              <button className="secondary-button" type="button" onClick={() => {
                setMessage("Manampia ahy hitady sy hanamboatra bug ao amin'ny code-ko.");
                setCurrentPage("chat");
              }}>
                🐛 Mitadiava bug
              </button>
              <button className="secondary-button" type="button" onClick={() => {
                setMessage("Hazavao amiko ny structure sy ny fonctionnement an'ity projet ity.");
                setCurrentPage("chat");
              }}>
                🧠 Analyse ny projet
              </button>
            </div>
            <p style={{ marginTop: 16, opacity: 0.75 }}>
              GitHub sy upload tena izy dia hampifandraisina amin'ity Developer Engine ity amin'ny dingana manaraka.
            </p>
          </div>
        </main>
      );
    }

    if (currentPage === "developer") {
      return (
        <main className="feature-page">
          <div className="feature-header">
            <div className="feature-icon">🧑‍💻</div>
            <div>
              <h1>Projet développeur</h1>
              <p>Ampidiro ny projet-nao dia afaka manampy anao hamaky sy handinika azy i N-AI.</p>
            </div>
          </div>
          <div className="feature-card">
            <h2>📂 Ampidiro ny projet</h2>
            <p>Ny fichiers ampidirina eto dia vakiana ao amin'ny navigateur aloha; tsy mifangaro amin'ny repository anatiny an'i N-AI.</p>
            <input
              type="file"
              multiple
              onChange={handleDeveloperUpload}
              disabled={developerLoading}
              style={{ marginTop: 12, width: "100%" }}
            />
            {developerError && <div className="auth-error" style={{ marginTop: 12 }}>{developerError}</div>}
            {developerLoading && <p style={{ marginTop: 12 }}>Mamaky ny projet...</p>}
            {developerFiles.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <strong>Fichiers voaray: {developerFiles.length}</strong>
                <div style={{ marginTop: 10 }}>
                  {developerFiles.map((file) => (
                    <button
                      key={file.path}
                      className="secondary-button"
                      type="button"
                      onClick={() => setDeveloperFile(file)}
                      style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 8 }}
                    >
                      📄 {file.path} — {Math.ceil(file.size / 1024)} KB
                    </button>
                  ))}
                </div>
              </div>
            )}
            {developerFile && (
              <div style={{ marginTop: 16 }}>
                <strong>{developerFile.path}</strong>
                <pre style={{ whiteSpace: "pre-wrap", overflowX: "auto", marginTop: 10 }}>
                  {developerFile.content.slice(0, 50000)}
                </pre>
              </div>
            )}
            <button
              className="feature-button"
              type="button"
              disabled={!developerFiles.length}
              onClick={() => {
                setMessage("Diniho ireto fichiers projet-ko ireto ary lazao amiko ny bugs, risques ary fanatsarana tokony hatao.");
                setCurrentPage("chat");
              }}
              style={{ marginTop: 12 }}
            >
              🧠 Ampanadihady amin'i N-AI
            </button>
          </div>
        </main>
      );
    }

    if (currentPage === "coding") {
      return (
        <main className="feature-page">
          <div className="feature-header">
            <div className="feature-icon">💻</div>
            <div>
              <h1>Coding IA</h1>
              <p>Manontania momba ny code na asa development.</p>
            </div>
          </div>
          <div className="feature-card">
            <h2>Inona no code tianao hatao?</h2>
            <textarea
              className="feature-input"
              placeholder="Ohatra: Mamoròna formulaire React misy validation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button
              className="feature-button"
              type="button"
              onClick={() => {
                if (message.trim()) {
                  setCurrentPage("chat");
                  handleSend("coding");
                }
              }}
            >
              Alefa amin'ny Coding IA — 8 crédits
            </button>
            <button className="secondary-button" type="button" onClick={() => setCurrentPage("developer")} style={{ marginTop: 10 }}>
              🧑‍💻 Projet développeur
            </button>
            {isRepositoryOwner && <button className="secondary-button" type="button" onClick={() => { setCurrentPage("repository"); loadRepository(""); }} style={{ marginTop: 10 }}>
              🔐 Repository N-AI (Admin)
            </button>}
          </div>
        </main>
      );
    }

    if (currentPage === "image") {
      return (
        <main className="feature-page">
          <div className="feature-header">
            <div className="feature-icon">🖼️</div>

            <div>
              <h1>{t("imageStudio")}</h1>
              <p>{t("imageDesc")}</p>
            </div>
          </div>

          <div className="feature-card">
            <h2>{t("imageTitle")}</h2>

            <p>{t("imageDesc")}</p>

            <textarea
              className="feature-input"
              placeholder={t("imagePlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <button
              className="feature-button"
              type="button"
              onClick={() =>
                setMessage("Créer une image : ")
              }
            >
              {t("prepareImage")}
            </button>
          </div>
        </main>
      );
    }

    if (currentPage === "research") {
      return (
        <main className="feature-page">
          <div className="feature-header">
            <div className="feature-icon">🔎</div>

            <div>
              <h1>{t("researchAI")}</h1>
              <p>{t("researchDesc")}</p>
            </div>
          </div>

          <div className="feature-card">
            <h2>{t("searchTitle")}</h2>

            <p>{t("searchDesc")}</p>

            <textarea
              className="feature-input"
              placeholder={t("searchPlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            <button
              className="feature-button"
              type="button"
              onClick={() => {
                if (message.trim()) {
                  setCurrentPage("chat");
                  handleSend("research");
                }
              }}
            >
              {t("launchSearch")}
            </button>
          </div>
        </main>
      );
    }

    if (currentPage === "memory") {
      return (
        <main className="feature-page">
          <div className="feature-header">
            <div className="feature-icon">🧠</div>
            <div>
              <h1>{t("memory")}</h1>
              <p>{t("memoryDesc")}</p>
            </div>
          </div>

          <div className="feature-card">
            <h2>{t("memoryTitle")}</h2>
            <p>{t("memoryDesc")}</p>

            <div className="memory-form">
              <textarea
                className="feature-input"
                placeholder="Ohatra: Tiako ny valiny amin'ny teny Malagasy."
                value={memoryDraft}
                onChange={(e) => setMemoryDraft(e.target.value)}
              />
              <select
                className="setting-select"
                value={memoryCategory}
                onChange={(e) => setMemoryCategory(e.target.value)}
              >
                <option value="general">Ankapobeny</option>
                <option value="preference">Préférence</option>
                <option value="profile">Mombamomba ahy</option>
                <option value="project">Projet</option>
              </select>
              <button
                className="feature-button"
                type="button"
                disabled={!memoryDraft.trim() || memoryLoading}
                onClick={handleAddMemory}
              >
                {memoryLoading ? "Miandry..." : "💾 Tehirizo ny mémoire"}
              </button>
            </div>

            {memoryError && <div className="auth-error" style={{ marginTop: 12 }}>{memoryError}</div>}

            {memoryLoading && memories.length === 0 ? (
              <div className="memory-empty">
                <span>🧠</span>
                <strong>Fakàna mémoire...</strong>
              </div>
            ) : memories.length === 0 ? (
              <div className="memory-empty">
                <span>🧠</span>
                <strong>{t("noMemory")}</strong>
                <small>Ampio mémoire voalohany etsy ambony.</small>
              </div>
            ) : (
              <div className="memory-list">
                {memories.map((item) => (
                  <div className="memory-item" key={item.id}>
                    <div>
                      <strong>{item.content}</strong>
                      <small>{item.category} · {new Date(item.updatedAt).toLocaleString("fr-FR")}</small>
                    </div>
                    <button
                      className="secondary-button"
                      type="button"
                      disabled={memoryLoading}
                      onClick={() => handleDeleteMemory(item.id)}
                    >
                      🗑️
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      );
    }

    if (currentPage === "settings") {
      return (
        <main className="feature-page">
          <div className="feature-header">
            <div className="feature-icon">⚙️</div>

            <div>
              <h1>{t("settings")}</h1>
              <p>{t("settingsDesc")}</p>
            </div>
          </div>

          <div className="feature-card">
            <h2>{t("generalSettings")}</h2>

            <div className="setting-row">
              <div>
                <strong>{t("language")}</strong>
                <span>
                  Français / Malagasy / English
                </span>
              </div>

              <select
                className="setting-select"
                value={language}
                onChange={(e) =>
                  setLanguage(e.target.value)
                }
              >
                {Object.entries(LANGUAGES).map(
                  ([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="setting-row">
              <div>
                <strong>{t("history")}</strong>
                <span>{t("savedLocally")}</span>
              </div>

              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);

                  if (user?.id) {
                    localStorage.removeItem(
                      `${STORAGE_KEY}-${user.id}`
                    );
                  }

                  setMessages([]);
                  setCurrentPage("chat");
                }}
              >
                {t("clear")}
              </button>
            </div>

            <div className="setting-row">
              <div>
                <strong>{t("plan")}</strong>
                <span>{t("planDesc")}</span>
              </div>

              <button
                className="secondary-button"
                type="button"
                onClick={() =>
                  setCurrentPage("plans")
                }
              >
                {t("plans")}
              </button>
            </div>
          </div>
        </main>
      );
    }

    if (currentPage === "profile") {
      return (
        <main className="feature-page">
          <div className="feature-header">
            <div className="feature-icon">👤</div>

            <div>
              <h1>{t("profile")}</h1>
              <p>{t("accountText")}</p>
            </div>
          </div>

          <div className="feature-card profile-card">
            <div className="large-avatar">👤</div>

            <h2>{user?.name || t("user")}</h2>

            <span className="plan-badge">
              {user?.plan === "free" ? t("freePlan") : (user?.plan || "free").toUpperCase()}
            </span>

            <div className="profile-info">
              <div>
                <strong>{user?.email || ""}</strong>

                <span>
                  {credits} {t("credits")}
                </span>
              </div>
            </div>

            <button
              className="feature-button"
              type="button"
              onClick={() =>
                setCurrentPage("plans")
              }
            >
              {t("plans")}
            </button>

            <div className="payment-history">
              <h3>Historique des paiements</h3>
              {paymentHistory.length === 0 ? (
                <p>Aucun paiement enregistré.</p>
              ) : (
                paymentHistory.map((payment) => (
                  <div className="payment-history-item" key={payment.reference}>
                    <div className="payment-history-main">
                      <strong>{payment.planId.toUpperCase()}</strong>
                      <span>{payment.credits.toLocaleString("fr-FR")} crédits</span>
                      <small>{payment.paymentMethod || "PAPI"}</small>
                    </div>
                    <div className="payment-history-side">
                      <strong>{formatMGA(payment.amount)}</strong>
                      <span>{payment.status === "paid" ? "SUCCESS" : payment.status.toUpperCase()}</span>
                      <small>{payment.paidAt || payment.createdAt ? new Date(payment.paidAt || payment.createdAt).toLocaleString("fr-FR") : ""}</small>
                      {payment.paymentReference && <small>Réf. {payment.paymentReference}</small>}
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              className="secondary-button"
              type="button"
              onClick={handleLogout}
            >
              Déconnexion
            </button>
          </div>
        </main>
      );
    }

    return messages.length === 0 ? (
      <WelcomeScreen onAction={handleAction} />
    ) : (
      <main className="chat-content">
        <div className="messages">
          {messages.map((item, index) => (
            <MessageBubble
              key={item.createdAt || index}
              role={item.role}
              content={item.content}
            />
          ))}

          {loading && (
            <MessageBubble
              role="assistant"
              content=""
              loading
            />
          )}
        </div>
      </main>
    );
  };

  if (authChecking) {
    return (
      <div className="auth-loading">
        N-AI Chat V2...
      </div>
    );
  }

  if (!user) {
    return (
      <AuthPage
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  return (
    <div className="app">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={handleNewChat}
        onNavigate={handleNavigate}
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={handleSelectConversation}
      />

      <section className="main-panel">
        <Topbar
          credits={credits}
          onMenuOpen={() => setSidebarOpen(true)}
          onProfileClick={() =>
            handleNavigate("profile")
          }
        />

        {renderPage()}

        {currentPage === "chat" && (
          <Composer
            message={message}
            onMessageChange={setMessage}
            onSend={handleSend}
          />
        )}
      </section>
    </div>
  );
}

export default App;
