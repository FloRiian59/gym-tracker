import { useState, useEffect } from "react";
import TrainingInfos from "./TrainingInfos";
import {
  getTemplates,
  getSessionsByDate,
  startSessionFromTemplate,
} from "../queries";

const TrainingPage = () => {
  const today = new Date();
  const todayLocal = today.toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
  });
  const [d, m, y] = todayLocal.split("/");
  const todayISO = `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  const prettyDay = today.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const [phase, setPhase] = useState("loading");
  const [templates, setTemplates] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState(null);

  /* ── Init ── */
  useEffect(() => {
    const init = async () => {
      try {
        const [sessions, tpls] = await Promise.all([
          getSessionsByDate(todayISO),
          getTemplates(),
        ]);
        setTemplates(tpls);

        // Cherche si une session active est mémorisée
        const savedSessionId = localStorage.getItem(
          `activeSessionId_${todayISO}`,
        );
        const savedTemplate = localStorage.getItem(
          `activeTemplate_${todayISO}`,
        );

        if (savedSessionId && savedTemplate) {
          const exists = sessions.find((s) => s.id === savedSessionId);
          if (exists) {
            setSessionId(savedSessionId);
            setActiveTemplate(JSON.parse(savedTemplate));
            setPhase("training");
            return;
          }
        }
        setPhase("start");
      } catch (err) {
        console.error("Erreur init TrainingPage :", err.message);
        setPhase("start");
      }
    };
    init();
  }, [todayISO]);

  /* ── Démarrer une séance ──
     startSessionFromTemplate réutilise automatiquement la session
     existante si le label est identique aujourd'hui */
  const handleStart = async (template) => {
    try {
      const session = await startSessionFromTemplate(todayISO, template.name);
      setSessionId(session.id);
      setActiveTemplate(template);
      localStorage.setItem(`activeSessionId_${todayISO}`, session.id);
      localStorage.setItem(
        `activeTemplate_${todayISO}`,
        JSON.stringify(template),
      );
      setPhase("training");
    } catch (err) {
      console.error("Erreur démarrage séance :", err.message);
    }
  };

  const handleStartFree = () =>
    handleStart({ id: "free", name: "Séance libre", exercises: [] });

  /* ── Changer de séance ──
     On efface juste la session active en mémoire.
     La session précédente reste en base. */
  const handleChangeSession = () => {
    localStorage.removeItem(`activeSessionId_${todayISO}`);
    localStorage.removeItem(`activeTemplate_${todayISO}`);
    setPhase("start");
    setSessionId(null);
    setActiveTemplate(null);
  };

  /* ── Loading ── */
  if (phase === "loading")
    return (
      <div className="empty-state">
        <i
          className="ti ti-loader-2"
          style={{ animation: "spin 1s linear infinite" }}
          aria-hidden="true"
        />
        <p className="empty-state__sub">Chargement…</p>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  /* ── Écran de démarrage ── */
  if (phase === "start")
    return (
      <div>
        <div className="session-meta">
          <span className="session-meta__day">{prettyDay}</span>
        </div>
        <div className="session-title">Quelle séance ?</div>

        {templates.length > 0 ?
          <>
            <h3 style={{ marginBottom: 12 }}>Mes séances</h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 24,
              }}
            >
              {templates.map((t) => (
                <button
                  key={t.id}
                  className="drawer-item"
                  onClick={() => handleStart(t)}
                >
                  <span
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 2,
                    }}
                  >
                    <span style={{ color: "var(--text)", fontWeight: 600 }}>
                      {t.name}
                    </span>
                    <span style={{ fontSize: 12, color: "var(--text3)" }}>
                      {t.exercises.length > 0 ?
                        t.exercises.map((e) => e.name).join(" · ")
                      : "Aucun exercice — configure dans Profil"}
                    </span>
                  </span>
                  <i className="ti ti-arrow-right" aria-hidden="true" />
                </button>
              ))}
            </div>
          </>
        : <div className="empty-state" style={{ padding: "32px 0" }}>
            <i className="ti ti-layout-list" aria-hidden="true" />
            <p className="empty-state__title">Pas encore de séance</p>
            <p className="empty-state__sub">
              Crée ta première séance dans l'onglet Profil
            </p>
          </div>
        }

        <h3 style={{ marginBottom: 12 }}>Ou composer librement</h3>
        <button className="drawer-item" onClick={handleStartFree}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <i
              className="ti ti-plus"
              style={{ color: "var(--accent)", fontSize: 18 }}
              aria-hidden="true"
            />
            <span style={{ color: "var(--text)", fontWeight: 600 }}>
              Séance libre
            </span>
          </span>
          <i className="ti ti-arrow-right" aria-hidden="true" />
        </button>
      </div>
    );

  /* ── Mode entraînement ── */
  return (
    <TrainingInfos
      todayISO={todayISO}
      sessionId={sessionId}
      activeTemplate={activeTemplate}
      onChangeSession={handleChangeSession}
    />
  );
};

export default TrainingPage;
