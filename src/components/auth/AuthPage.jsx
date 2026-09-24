import { useState } from "react";
import { apiUrl } from "../../config/api";

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login" ? { email, password } : { name, email, password };
      const response = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Authentication failed.");
      onAuthenticated(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">N</div>
        <div className="auth-badge">N-AI ENGINE V2</div>
        <h1>{mode === "login" ? "Tongasoa indray" : "Mamorona kaonty"}</h1>
        <p>{mode === "login" ? "Midira amin'ny kaontinao N-AI Chat." : "Mamorona kaonty hahazoana 20 crédits Free."}</p>

        <form onSubmit={submit} className="auth-form">
          {mode === "register" && (
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Anarana" minLength={2} required />
          )}
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" autoComplete="email" required />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Mot de passe (8 caractères minimum)" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} required />
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="feature-button" disabled={loading}>
            {loading ? "Miandry..." : mode === "login" ? "Hiditra" : "Hamorona kaonty"}
          </button>
        </form>

        <button className="auth-switch" type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "Tsy mbola manana kaonty? Misorata anarana" : "Efa manana kaonty? Hiditra"}
        </button>
      </div>
    </main>
  );
}

export default AuthPage;
