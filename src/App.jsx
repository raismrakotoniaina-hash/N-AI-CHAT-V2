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

  useEffect(() => {
    try {
      const key = user?.id
        ? `${STORAGE_KEY}-${user.id}`
        : STORAGE_KEY;

      const saved = localStorage.getItem(key);

      if (saved) {
        const parsed = JSON.parse(saved);

        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
    } catch (error) {
      console.error("Erreur chargement historique:", error);
    }
  }, [user?.id]);

  useEffect(() => {
    try {
      const key = user?.id
        ? `${STORAGE_KEY}-${user.id}`
        : STORAGE_KEY;

      localStorage.setItem(key, JSON.stringify(messages));
    } catch (error) {
      console.error("Erreur sauvegarde historique:", error);
    }
  }, [messages, user?.id]);

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

  const handleAuthenticated = (account) => {
    setUser(account);
    setCredits(account.credits ?? 0);
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
  };

  const handleNewChat = () => {
    setMessages([]);
    setMessage("");
    setLoading(false);
    setCurrentPage("chat");
    setSidebarOpen(false);
    localStorage.removeItem(STORAGE_KEY);

    if (user?.id) {
      localStorage.removeItem(`${STORAGE_KEY}-${user.id}`);
    }
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

            <div className="memory-empty">
              <span>🧠</span>

              <strong>{t("noMemory")}</strong>

              <small>{t("memorySoon")}</small>
            </div>
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
