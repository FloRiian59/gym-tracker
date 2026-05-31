import { useState } from "react";
import { supabase } from "../supabaseClient";

const AuthPage = () => {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Remplis tous les champs.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setSuccess("Compte créé ! Tu es maintenant connecté.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        // App.jsx détecte automatiquement la connexion via onAuthStateChange
      }
    } catch (err) {
      // Traduction des erreurs Supabase en français
      const msg = err.message;
      if (msg.includes("Invalid login credentials"))
        setError("Email ou mot de passe incorrect.");
      else if (msg.includes("User already registered"))
        setError("Un compte existe déjà avec cet email.");
      else if (msg.includes("Password should be at least"))
        setError("Le mot de passe doit faire au moins 6 caractères.");
      else setError("Une erreur est survenue. Réessaie.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        padding: "24px 20px",
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: "center" }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: ".06em",
            textTransform: "uppercase",
            color: "var(--accent)",
            marginBottom: 8,
          }}
        >
          Gym Tracker
        </div>
        <div style={{ fontSize: 14, color: "var(--text3)" }}>
          {mode === "login" ?
            "Content de te revoir 💪"
          : "Crée ton compte gratuitement"}
        </div>
      </div>

      {/* Carte */}
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--bg2)",
          border: "0.5px solid var(--border2)",
          borderRadius: "var(--radius-xl)",
          padding: "28px 24px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.40)",
        }}
      >
        {/* Toggle login / signup */}
        <div className="nav-segment" style={{ marginBottom: 24 }}>
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError(null);
              setSuccess(null);
            }}
            style={{ flex: 1 }}
          >
            Connexion
          </button>
          <button
            className={mode === "signup" ? "active" : ""}
            onClick={() => {
              setMode("signup");
              setError(null);
              setSuccess(null);
            }}
            style={{ flex: 1 }}
          >
            Inscription
          </button>
        </div>

        {/* Formulaire */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="form-group">
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="ton@email.com"
                autoComplete="email"
              />
            </label>
          </div>

          <div className="form-group">
            <label>
              Mot de passe
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="6 caractères minimum"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
              />
            </label>
          </div>

          {/* Erreur */}
          {error && (
            <div
              style={{
                background: "rgba(239,68,68,0.10)",
                border: "0.5px solid rgba(239,68,68,0.30)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                fontSize: 13,
                color: "var(--danger)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <i className="ti ti-alert-circle" aria-hidden="true" />
              {error}
            </div>
          )}

          {/* Succès */}
          {success && (
            <div
              style={{
                background: "var(--pr-bg)",
                border: "0.5px solid rgba(34,197,94,0.25)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                fontSize: 13,
                color: "var(--pr)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <i className="ti ti-check" aria-hidden="true" />
              {success}
            </div>
          )}

          <button
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: 15,
              marginTop: 4,
            }}
          >
            {loading ?
              <>
                <i
                  className="ti ti-loader-2"
                  style={{ animation: "spin .8s linear infinite" }}
                  aria-hidden="true"
                />{" "}
                Chargement…
              </>
            : mode === "login" ?
              "Se connecter"
            : "Créer mon compte"}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default AuthPage;
