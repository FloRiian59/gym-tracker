import { useState, useEffect, useRef } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../css/TrainingHistory.css";

const TrainingHistory = ({ profile }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [selectedDate, setSelectedDate] = useState(today);
  const [history, setHistory] = useState([]);
  const dayRefs = useRef({});

  useEffect(() => {
    const saved = localStorage.getItem(`trainingPerfs_${profile}`);
    if (!saved) return;

    try {
      const rawPerfs = JSON.parse(saved);
      const grouped = {};

      Object.values(rawPerfs).forEach((exo) => {
        if (!exo.lastUpdated) return;

        const date = exo.lastUpdated;
        const dateLabel =
          exo.dateLabel ||
          new Date(date).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });

        if (!grouped[date]) {
          grouped[date] = { date, dateLabel, exercises: [] };
        }
        grouped[date].exercises.push({
          exoName: exo.exoName || "Inconnu",
          series: exo.series || [],
        });
      });

      const sorted = Object.values(grouped).sort((a, b) =>
        b.date.localeCompare(a.date)
      );
      setHistory(sorted);
    } catch (e) {
      console.error("Erreur lecture perfs", e);
    }
  }, [profile]);

  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleDateClick = (date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    setSelectedDate(normalized);

    const dateStr = getLocalDateString(normalized);
    const ref = dayRefs.current[dateStr];
    if (ref) {
      ref.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };
  const tileContent = ({ date, view }) => {
    if (view !== "month") return null;
    const dateStr = getLocalDateString(date);
    const hasSession = history.some((day) => day.date === dateStr);
    return hasSession ? <div className="calendar-dot"></div> : null;
  };

  if (history.length === 0) {
    return (
      <div className="history-empty">
        <h2>Aucune séance enregistrée pour {profile}</h2>
        <p>Commence à saisir tes perfs !</p>
      </div>
    );
  }
  const dateStr = getLocalDateString(selectedDate);
  const filteredHistory = history.filter((day) => day.date === dateStr);

  return (
    <div className="training-history">
      <h1 className="history-title">Historique — {profile}</h1>
      <div className="calendar-wrapper">
        <Calendar
          onChange={handleDateClick}
          value={selectedDate}
          tileContent={tileContent}
          locale="fr-FR"
          showNeighboringMonth={false}
          weekStartDay={1}
        />
      </div>
      {filteredHistory.length > 0 ? (
        filteredHistory.map((day) => (
          <section
            key={day.date}
            ref={(el) => (dayRefs.current[day.date] = el)}
            className="history-day"
          >
            <h2 className="day-title">{day.dateLabel}</h2>

            {day.exercises.map((exo, i) => (
              <div key={i} className="history-exercise">
                <h3 className="exercise-name">{exo.exoName}</h3>
                <div className="series-grid">
                  {exo.series.map((s) => (
                    <div
                      key={s.serie || "warmup"}
                      className={`serie-card ${s.isPR ? "is-pr" : ""} ${
                        s.isWarmup ? "is-warmup" : ""
                      }`}
                    >
                      <div className="serie-number">
                        {s.isWarmup ? "Échauffement" : `Série ${s.serie}`}
                      </div>
                      <div className="serie-weight-reps">
                        {s.charge}kg × {s.reps}
                      </div>
                      {s.rpe > 0 && !s.isPR && (
                        <div className="serie-rpe">RPE {s.rpe}</div>
                      )}
                      {s.isPR && <div className="serie-pr">PR !</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>
        ))
      ) : (
        <div className="history-empty">
          <p>Aucune séance enregistrée ce jour-là</p>
        </div>
      )}
    </div>
  );
};

export default TrainingHistory;
