import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import Header from "./components/Header";
import TrainingPage from "./components/TrainingPage";
import TrainingHistory from "./components/TrainingHistory";
import ProfilePage from "./components/ProfilePage";
import AuthPage from "./components/AuthPage";

function App() {
  const [activeMode, setActiveMode] = useState("saisie");
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("appTheme") || "premium";
  });

  // null = on ne sait pas encore, false = non connecté, object = utilisateur connecté
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("appTheme", theme);
  }, [theme]);

  /* ── Vérification de la session au démarrage ── */
  useEffect(() => {
    // Récupère la session active immédiatement
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Écoute les changements d'état (connexion, déconnexion, refresh token)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ── Chargement initial ── */
  if (user === undefined)
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <div className="empty-state">
          <i
            className="ti ti-loader-2"
            style={{
              animation: "spin 1s linear infinite",
              fontSize: 32,
              color: "var(--accent)",
            }}
            aria-hidden="true"
          />
        </div>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  /* ── Non connecté → écran auth ── */
  if (!user) return <AuthPage />;

  /* ── Connecté → app normale ── */
  return (
    <div className="app-container">
      <Header />

      <main className="page">
        {activeMode === "saisie" && <TrainingPage user={user} />}
        {activeMode === "historique" && <TrainingHistory user={user} />}
        {activeMode === "profil" && (
          <ProfilePage theme={theme} onThemeChange={setTheme} user={user} />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Navigation principale">
        <button
          className={`bottom-nav__tab ${activeMode === "saisie" ? "bottom-nav__tab--active" : ""}`}
          onClick={() => setActiveMode("saisie")}
        >
          <i className="ti ti-barbell" aria-hidden="true" />
          <span>Saisie</span>
        </button>
        <button
          className={`bottom-nav__tab ${activeMode === "historique" ? "bottom-nav__tab--active" : ""}`}
          onClick={() => setActiveMode("historique")}
        >
          <i className="ti ti-calendar-stats" aria-hidden="true" />
          <span>Historique</span>
        </button>
        <button
          className={`bottom-nav__tab ${activeMode === "profil" ? "bottom-nav__tab--active" : ""}`}
          onClick={() => setActiveMode("profil")}
        >
          <i className="ti ti-user" aria-hidden="true" />
          <span>Profil</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
