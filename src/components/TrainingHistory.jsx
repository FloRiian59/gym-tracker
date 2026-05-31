import { useState, useEffect, useRef } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { getAllSessions } from "../queries";

const TrainingHistory = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [selectedDate, setSelectedDate] = useState(today);
  const [history, setHistory] = useState([]); // [{ date, sessions: [{ id, label, exercises }] }]
  const [loading, setLoading] = useState(true);
  const dayRefs = useRef({});

  /* ── Chargement ── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const allSessions = await getAllSessions();

        // Grouper les sessions par date
        // Une date peut avoir plusieurs sessions (ex: Jambes + Séance libre)
        const byDate = {};

        allSessions.forEach((s) => {
          if (!s.sets || s.sets.length === 0) return;

          const date = s.session_date;
          if (!byDate[date]) byDate[date] = { date, sessions: [] };

          // Grouper les sets de cette session par exercice
          const byExo = s.sets.reduce((acc, set) => {
            const name = set.exercises?.name || "Inconnu";
            if (!acc[name]) acc[name] = { exoName: name, series: [] };
            acc[name].series.push({
              id: set.id,
              serie: set.set_number,
              charge: set.weight_kg,
              reps: set.reps,
              rpe: set.rpe,
              isWarmup: set.is_warmup,
              isPR: set.is_pr,
            });
            return acc;
          }, {});

          byDate[date].sessions.push({
            id: s.id,
            label: s.label || "Séance",
            exercises: Object.values(byExo),
          });
        });

        // Trier par date décroissante
        const sorted = Object.values(byDate).sort((a, b) =>
          b.date.localeCompare(a.date),
        );
        setHistory(sorted);
      } catch (err) {
        console.error("Erreur chargement historique :", err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getLocalDateString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const handleDateClick = (date) => {
    const n = new Date(date);
    n.setHours(0, 0, 0, 0);
    setSelectedDate(n);
    const dateStr = getLocalDateString(n);
    dayRefs.current[dateStr]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const tileContent = ({ date, view }) => {
    if (view !== "month") return null;
    const hasSession = history.some((d) => d.date === getLocalDateString(date));
    return hasSession ? <div className="calendar-dot" /> : null;
  };

  const formatDateLabel = (dateStr) => {
    const dateObj = new Date(dateStr + "T12:00:00");
    return dateObj.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  /* ── Loading ── */
  if (loading)
    return (
      <div className="empty-state">
        <i
          className="ti ti-loader-2"
          style={{ animation: "spin 1s linear infinite" }}
          aria-hidden="true"
        />
        <p className="empty-state__sub">Chargement de l'historique…</p>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  if (history.length === 0)
    return (
      <div className="empty-state">
        <i className="ti ti-calendar-off" aria-hidden="true" />
        <p className="empty-state__title">Aucune séance enregistrée</p>
        <p className="empty-state__sub">Commence à saisir tes perfs !</p>
      </div>
    );

  const dateStr = getLocalDateString(selectedDate);
  const filteredHistory = history.filter((d) => d.date === dateStr);

  return (
    <div>
      <div className="session-title">Historique</div>

      <Calendar
        onClickDay={handleDateClick}
        value={selectedDate}
        tileContent={tileContent}
        locale="fr-FR"
      />

      {filteredHistory.length > 0 ?
        filteredHistory.map((day) => (
          <div key={day.date} ref={(el) => (dayRefs.current[day.date] = el)}>
            {/* Date header */}
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                color: "var(--text3)",
                marginBottom: 12,
              }}
            >
              {formatDateLabel(day.date)}
            </div>

            {/* Une carte par session de la journée */}
            {day.sessions.map((session, si) => (
              <div
                key={session.id}
                className="history-day animate-in"
                style={{ marginBottom: 12 }}
              >
                <div className="history-day__header">
                  <span className="history-day__date">{session.label}</span>
                  <span className="history-day__count">
                    {session.exercises.length} exo
                    {session.exercises.length > 1 ? "s" : ""}
                  </span>
                </div>

                {session.exercises.map((exo, i) => (
                  <div key={i} className="history-exo">
                    <div className="history-exo__name">{exo.exoName}</div>
                    <div className="history-exo__series">
                      {exo.series.map((s, j) => (
                        <span
                          key={j}
                          className={`history-serie ${
                            s.isWarmup ? "history-serie--warmup"
                            : s.isPR ? "history-serie--pr"
                            : ""
                          }`}
                        >
                          {s.isWarmup ?
                            "🔥"
                          : s.isPR ?
                            "🏆"
                          : `S${s.serie}`}
                          &nbsp;{s.charge}kg × {s.reps}
                          {s.rpe > 0 && ` · RPE ${s.rpe}`}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))
      : <div className="empty-state" style={{ padding: "32px 24px" }}>
          <i className="ti ti-calendar-x" aria-hidden="true" />
          <p className="empty-state__title">Aucune séance ce jour</p>
          <p className="empty-state__sub">
            Clique sur un jour marqué d'un point
          </p>
        </div>
      }

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default TrainingHistory;
