import { useState, useEffect } from "react";
import { getAllSessions } from "../queries";

const DashboardPage = ({ user, username }) => {
  const [loading,  setLoading]  = useState(true);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getAllSessions();
        setSessions(data);
      } catch (err) {
        console.error("Erreur dashboard :", err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const now    = new Date();
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));

  /* ── Séances COMPLÉTÉES cette semaine ── */
  const thisWeekCompleted = sessions.filter(s => {
    if (!s.completed_at) return false;
    const d = new Date(s.session_date + "T12:00:00");
    return d >= monday && d <= now;
  });

  const thisWeekSets = thisWeekCompleted.flatMap(s => s.sets || []);
  const weekVolume   = thisWeekSets.reduce((acc, s) => acc + (s.weight_kg || 0) * (s.reps || 0), 0);
  const weekSeries   = thisWeekSets.filter(s => !s.is_warmup).length;
  const weekPR       = thisWeekSets.filter(s => s.is_pr).length;
  const weekDays     = thisWeekCompleted.length;

  /* ── Grille semaine — toutes sessions (pas seulement completed) ── */
  const sessionDates = new Set(
    sessions
      .filter(s => s.completed_at)
      .map(s => s.session_date)
  );

  const weekDayLabels = ["L", "M", "M", "J", "V", "S", "D"];
  const weekGrid = weekDayLabels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    return {
      label,
      isToday:  d.toDateString() === now.toDateString(),
      hasSess:  sessionDates.has(dateStr),
      isPast:   d <= now,
    };
  });

  /* ── PR récents 30 jours ── */
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const recentPRs = sessions
    .filter(s => new Date(s.session_date + "T12:00:00") >= thirtyDaysAgo)
    .flatMap(s => (s.sets || [])
      .filter(set => set.is_pr)
      .map(set => ({
        exoName: set.exercises?.name || "Inconnu",
        charge:  set.weight_kg,
        reps:    set.reps,
        date:    s.session_date,
        label:   s.label,
      }))
    )
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  /* ── Séances récentes complétées ── */
  const recentSessions = sessions
    .filter(s => s.completed_at && s.sets && s.sets.length > 0)
    .slice(0, 4)
    .map(s => {
      const sets     = s.sets || [];
      const volume   = sets.reduce((acc, set) => acc + (set.weight_kg || 0) * (set.reps || 0), 0);
      const hasPR    = sets.some(set => set.is_pr);
      const exoCount = new Set(sets.map(set => set.exercise_id)).size;
      const dateObj  = new Date(s.session_date + "T12:00:00");
      const dateLabel = dateObj.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
      return { id: s.id, label: s.label || "Séance", dateLabel, volume, hasPR, exoCount };
    });

  const hour     = now.getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  if (loading) return (
    <div className="empty-state">
      <i className="ti ti-loader-2" style={{ animation: "spin 1s linear infinite" }} aria-hidden="true" />
      <p className="empty-state__sub">Chargement…</p>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div>
      {/* ── Greeting ── */}
      <div className="dashboard-greeting">
        <div className="dashboard-greeting__sub">{greeting},</div>
        <div className="session-title" style={{ marginBottom: 0, textTransform: "capitalize" }}>
          {username} 👋
        </div>
      </div>

      {/* ── Grille semaine ── */}
      <div className="dashboard-section">
        <div className="dashboard-section__header">
          <h3>Cette semaine</h3>
          <span className="dashboard-section__count">
            {weekDays} séance{weekDays > 1 ? "s" : ""}
          </span>
        </div>
        <div className="week-grid">
          {weekGrid.map((day, i) => (
            <div key={i} className="week-grid__day">
              <span className={`week-grid__label ${day.isToday ? "week-grid__label--today" : ""}`}>
                {day.label}
              </span>
              <div className={`week-grid__dot
                ${day.hasSess ? "week-grid__dot--done" : ""}
                ${day.isToday && !day.hasSess ? "week-grid__dot--today" : ""}
                ${!day.isPast && !day.isToday ? "week-grid__dot--future" : ""}
              `}>
                {day.hasSess && <i className="ti ti-check" aria-hidden="true" />}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats semaine ── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__label">Séries</div>
          <div className="stat-card__value">{weekSeries}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Volume</div>
          <div className="stat-card__value">
            {weekVolume >= 1000 ? (weekVolume / 1000).toFixed(1) : weekVolume}
            <span>{weekVolume >= 1000 ? "t" : "kg"}</span>
          </div>
        </div>
        <div className="stat-card stat-card--pr">
          <div className="stat-card__label">PR</div>
          <div className="stat-card__value">{weekPR}</div>
        </div>
      </div>

      {/* ── PR récents ── */}
      {recentPRs.length > 0 && (
        <div className="dashboard-section">
          <div className="dashboard-section__header">
            <h3>PR récents — 30 jours</h3>
          </div>
          <div className="dashboard-list">
            {recentPRs.map((pr, i) => {
              const dateLabel = new Date(pr.date + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
              return (
                <div key={i} className="dashboard-card">
                  <span>
                    <span className="dashboard-card__title">🏆 {pr.exoName}</span>
                    <span className="dashboard-card__sub">{pr.label} · {dateLabel}</span>
                  </span>
                  <span className="dashboard-card__value dashboard-card__value--pr">
                    {pr.charge}kg×{pr.reps}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Séances récentes ── */}
      {recentSessions.length > 0 && (
        <div className="dashboard-section">
          <div className="dashboard-section__header">
            <h3>Séances récentes</h3>
          </div>
          <div className="dashboard-list">
            {recentSessions.map(s => (
              <div key={s.id} className="dashboard-card">
                <span>
                  <span className="dashboard-card__title">{s.hasPR && "🏆 "}{s.label}</span>
                  <span className="dashboard-card__sub">{s.dateLabel} · {s.exoCount} exo{s.exoCount > 1 ? "s" : ""}</span>
                </span>
                <span className="dashboard-card__value">
                  {s.volume >= 1000 ? `${(s.volume/1000).toFixed(1)}t` : `${s.volume}kg`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Empty state ── */}
      {sessions.filter(s => s.completed_at).length === 0 && (
        <div className="empty-state" style={{ padding: "48px 0" }}>
          <i className="ti ti-barbell" aria-hidden="true" />
          <p className="empty-state__title">Aucune séance complétée</p>
          <p className="empty-state__sub">Termine ta première séance pour voir tes stats ici !</p>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default DashboardPage;