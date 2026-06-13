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
    <div className="auth-container">
      {/* Logo */}
      <div className="logo-section">
        <div className="logo-title">Gym Tracker</div>
        <div className="logo-subtitle">
          {mode === "login" ?
            "Content de te revoir 💪"
          : "Crée ton compte gratuitement"}
        </div>
      </div>

      {/* Carte */}
      <div className="auth-card">
        {/* Toggle login / signup */}
        <div className="nav-segment">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError(null);
              setSuccess(null);
            }}
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
          >
            Inscription
          </button>
        </div>

        {/* Formulaire */}
        <div className="form-container">
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
            <div className="error-message">
              <i className="ti ti-alert-circle" aria-hidden="true" />
              {error}
            </div>
          )}

          {/* Succès */}
          {success && (
            <div className="success-message">
              <i className="ti ti-check" aria-hidden="true" />
              {success}
            </div>
          )}

          <button
            className="btn btn--primary submit-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ?
              <>
                <i className="ti ti-loader-2 loading-icon" aria-hidden="true" />{" "}
                Chargement…
              </>
            : mode === "login" ?
              "Se connecter"
            : "Créer mon compte"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
