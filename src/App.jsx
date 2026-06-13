import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { getProfile } from "./queries";
import Header from "./components/Header";
import TrainingPage from "./components/TrainingPage";
import TrainingHistory from "./components/TrainingHistory";
import DashboardPage from "./components/DashboardPage";
import ProfilePage from "./components/ProfilePage";
import AuthPage from "./components/AuthPage";

/* ─── Page hors ligne ── */
const OfflinePage = ({ onRetry }) => (
  <div
    style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg)",
      padding: "24px 20px",
      textAlign: "center",
    }}
  >
    <i
      className="ti ti-wifi-off"
      style={{ fontSize: 56, color: "var(--text3)", marginBottom: 20 }}
      aria-hidden="true"
    />
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 22,
        fontWeight: 700,
        color: "var(--text)",
        marginBottom: 8,
      }}
    >
      Pas de connexion
    </div>
    <p
      style={{
        fontSize: 14,
        color: "var(--text3)",
        marginBottom: 32,
        maxWidth: 280,
        lineHeight: 1.6,
      }}
    >
      Gym Tracker a besoin d'une connexion internet pour accéder à tes données.
    </p>
    <button
      className="btn btn--primary"
      style={{ padding: "12px 28px", fontSize: 15 }}
      onClick={onRetry}
    >
      <i className="ti ti-refresh" aria-hidden="true" /> Réessayer
    </button>
  </div>
);

function App() {
  const [activeMode, setActiveMode] = useState("saisie");
  const [theme, setTheme] = useState(
    () => localStorage.getItem("appTheme") || "premium",
  );
  const [user, setUser] = useState(undefined);
  const [username, setUsername] = useState("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  /* ── Thème ── */
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("appTheme", theme);
  }, [theme]);

  /* ── Détection réseau ── */
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  /* ── Auth ── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  /* ── Username depuis profile ── */
  useEffect(() => {
    if (!user || !isOnline) return;
    getProfile()
      .then((profile) => {
        setUsername(
          profile?.username || user.email?.split("@")[0] || "Champion",
        );
      })
      .catch(() => {
        setUsername(user.email?.split("@")[0] || "Champion");
      });
  }, [user, isOnline]);

  const handleLeaveProfile = (destination = "dashboard") => {
    getProfile().then((profile) => {
      if (profile?.username) setUsername(profile.username);
    });
    setActiveMode(destination);
  };

  /* ── Hors ligne ── */
  if (!isOnline)
    return (
      <>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <OfflinePage onRetry={() => window.location.reload()} />
      </>
    );

  /* ── Chargement initial ── */
  if (user === undefined)
    return (
      <div className="app-loader">
        <i
          className="ti ti-loader-2"
          style={{
            fontSize: 32,
            color: "var(--accent)",
            animation: "spin 1s linear infinite",
          }}
          aria-hidden="true"
        />
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  /* ── Non connecté ── */
  if (!user) return <AuthPage />;

  /* ── App ── */
  return (
    <div className="app-container">
      <Header
        username={username}
        onProfileClick={() => setActiveMode("profil")}
        activeMode={activeMode}
      />

      <main className="page">
        {activeMode === "saisie" && <TrainingPage user={user} />}
        {activeMode === "dashboard" && (
          <DashboardPage user={user} username={username} />
        )}
        {activeMode === "historique" && <TrainingHistory user={user} />}
        {activeMode === "profil" && (
          <ProfilePage
            theme={theme}
            onThemeChange={setTheme}
            user={user}
            onBack={() => handleLeaveProfile("dashboard")}
          />
        )}
      </main>

      {activeMode !== "profil" && (
        <nav className="bottom-nav" aria-label="Navigation principale">
          <button
            className={`bottom-nav__tab ${activeMode === "saisie" ? "bottom-nav__tab--active" : ""}`}
            onClick={() => setActiveMode("saisie")}
          >
            <i className="ti ti-barbell" aria-hidden="true" />
            <span>Saisie</span>
          </button>
          <button
            className={`bottom-nav__tab ${activeMode === "dashboard" ? "bottom-nav__tab--active" : ""}`}
            onClick={() => setActiveMode("dashboard")}
          >
            <i className="ti ti-chart-bar" aria-hidden="true" />
            <span>Dashboard</span>
          </button>
          <button
            className={`bottom-nav__tab ${activeMode === "historique" ? "bottom-nav__tab--active" : ""}`}
            onClick={() => setActiveMode("historique")}
          >
            <i className="ti ti-calendar-stats" aria-hidden="true" />
            <span>Historique</span>
          </button>
        </nav>
      )}
    </div>
  );
}

export default App;
