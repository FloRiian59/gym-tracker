import { useState, useEffect, useCallback, useRef } from "react";
import {
  getSetsBySession,
  getExercisesGrouped,
  getProfile,
  addSet,
  updateSet,
  deleteSet,
  startSession,
  completeSession,
} from "../queries";

const FINISH_MESSAGES = [
  "Bravo pour ta motivation ! 💪",
  "Maintenant place au cardio ! 🏃",
  "Les courbatures de demain te remercient. 🙏",
  "Arnold serait fier. Enfin, peut-être.",
  "GG. Maintenant mange des protéines. MAINTENANT.",
  "Séance validée. Netflix peut commencer.",
  "Tu viens de battre ta version d'hier. Respect.",
  "La salle te manquera demain. Ou pas.",
  "C'est pas les abdos qui se font en regardant, hein.",
  "Récup' bien, le muscle se construit au repos.",
  "Une séance de plus dans le sac. Légendaire.",
  "Tu peux manger des pâtes maintenant. T'as mérité.",
  "Cbum approuve ce message.",
  "Objectif atteint. Prochain objectif : revenir demain.",
  "Pain is temporary. Les PR sont éternels.",
  "T'as transpiré ou t'as juste pris une douche froide ?",
  "Séance terminée. Le shaker t'attend.",
  "Même les jours sans motivation comptent. Chapeau.",
  "Somewhere, someone is skipping leg day. Pas toi.",
];

/* ── Calcul kcal estimé ──
   Formule : MET × poids(kg) × durée(h)
   MET varie selon le temps de repos (intensité estimée) :
   - repos court (90s)  → MET 5.5 (haute intensité)
   - repos moyen (120s) → MET 4.5
   - repos long (180s+) → MET 3.5 (faible intensité) */
const estimateKcal = (durationMs, profile) => {
  if (!profile?.weight_kg || !durationMs) return null;
  const durationH = durationMs / 3600000;
  const restTime = profile.rest_time || "90";
  const MET =
    restTime === "90" ? 5.5
    : restTime === "120" ? 4.5
    : 3.5;
  return Math.round(MET * profile.weight_kg * durationH);
};

/* ── Formater une durée en mm:ss ── */
const formatDuration = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h${String(minutes).padStart(2, "0")}`;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const TrainingInfos = ({
  todayISO,
  sessionId,
  activeTemplate,
  onChangeSession,
}) => {
  const today = new Date();
  const prettyDay = today.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const isFree = activeTemplate?.id === "free";

  /* ── State principal ── */
  const [loading, setLoading] = useState(true);
  const [displayPerfs, setDisplayPerfs] = useState({});
  const [exerciseMap, setExerciseMap] = useState({});
  const [allExercises, setAllExercises] = useState({});
  const [profile, setProfile] = useState(null);
  const [freeExercises, setFreeExercises] = useState(() => {
    const saved = localStorage.getItem(`freeExercises_${todayISO}`);
    return saved ? JSON.parse(saved) : [];
  });

  /* ── Timer ── */
  const [sessionStarted, setSessionStarted] = useState(() => {
    // Reprend le timer si la séance était déjà démarrée
    const saved = localStorage.getItem(`sessionStarted_${sessionId}`);
    return saved ? parseInt(saved) : null; // timestamp ms
  });
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  /* ── Résumé / modales ── */
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [finishMessage, setFinishMessage] = useState("");
  const [completing, setCompleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [addExoDrawer, setAddExoDrawer] = useState(false);
  const [confirmRemoveExoOpen, setConfirmRemoveExoOpen] = useState(false);
  const [selectedExo, setSelectedExo] = useState(null);
  const [selectedPerf, setSelectedPerf] = useState(null);
  const [exoToRemove, setExoToRemove] = useState(null);
  const [mode, setMode] = useState("add");
  const [filterMuscle, setFilterMuscle] = useState("");
  const [selectedSerie, setSelectedSerie] = useState(1);
  const [isWarmup, setIsWarmup] = useState(false);
  const [charge, setCharge] = useState("");
  const [reps, setReps] = useState("");
  const [rpe, setRpe] = useState("");
  const [isPR, setIsPR] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ── Persist freeExercises ── */
  useEffect(() => {
    if (isFree)
      localStorage.setItem(
        `freeExercises_${todayISO}`,
        JSON.stringify(freeExercises),
      );
  }, [freeExercises, todayISO, isFree]);

  /* ── Timer tick ── */
  useEffect(() => {
    if (!sessionStarted) return;
    const tick = () => setElapsed(Date.now() - sessionStarted);
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [sessionStarted]);

  /* ── Chargement ── */
  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const [grouped, perfs, prof] = await Promise.all([
        getExercisesGrouped(),
        getSetsBySession(sessionId),
        getProfile(),
      ]);
      const map = {};
      Object.entries(grouped).forEach(([muscleName, exos]) => {
        exos.forEach((exo) => {
          map[exo.name] = exo.id;
          exo.muscleName = muscleName;
        });
      });
      setExerciseMap(map);
      setAllExercises(grouped);
      setDisplayPerfs(perfs);
      setProfile(prof);
    } catch (err) {
      console.error("Erreur chargement :", err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  const exercisesToShow =
    isFree ? freeExercises : activeTemplate?.exercises || [];
  const allSeries = Object.values(displayPerfs).flatMap((e) => e.series || []);
  const totalSeries = allSeries.filter((s) => !s.isWarmup).length;
  const totalVolume = allSeries.reduce(
    (acc, s) => acc + (s.charge || 0) * (s.reps || 0),
    0,
  );
  const totalPR = allSeries.filter((s) => s.isPR).length;
  const resolveUUID = (exoName) => exerciseMap[exoName] || null;

  /* ── Démarrer la séance ── */
  const handleStart = async () => {
    try {
      await startSession(sessionId);
      const now = Date.now();
      setSessionStarted(now);
      localStorage.setItem(`sessionStarted_${sessionId}`, String(now));
    } catch (err) {
      console.error("Erreur démarrage :", err.message);
    }
  };

  /* ── Modales séries ── */
  const openAdd = (exo) => {
    setSelectedExo(exo);
    setMode("add");
    const uuid = resolveUUID(exo.name);
    const eff =
      uuid ? (displayPerfs[uuid]?.series || []).filter((s) => !s.isWarmup) : [];
    setSelectedSerie(eff.length + 1);
    setCharge("");
    setReps("");
    setRpe("");
    setIsPR(false);
    setIsWarmup(false);
    setModalOpen(true);
  };

  const openEdit = (exo, perf) => {
    setSelectedExo(exo);
    setMode("edit");
    setSelectedSerie(perf.serie || 1);
    setCharge(String(perf.charge));
    setReps(String(perf.reps));
    setRpe(perf.rpe ? String(perf.rpe) : "");
    setIsPR(perf.isPR || false);
    setIsWarmup(perf.isWarmup || false);
    setModalOpen(true);
  };

  const openAction = (exoName, perf) => {
    setSelectedExo({ name: exoName });
    setSelectedPerf(perf);
    setActionOpen(true);
  };

  const openConfirmRemoveExo = (exo) => {
    setExoToRemove(exo);
    setConfirmRemoveExoOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedExo || !sessionId) return;
    const exerciseUUID = resolveUUID(selectedExo.name);
    if (!exerciseUUID) {
      alert(`Exercice "${selectedExo.name}" introuvable.`);
      return;
    }
    setSaving(true);
    try {
      const setData = {
        serie: isWarmup ? null : selectedSerie,
        charge: parseFloat(charge) || 0,
        reps: parseInt(reps) || 0,
        rpe: parseInt(rpe) || 0,
        isWarmup,
        isPR,
      };
      if (mode === "add") {
        const newSet = await addSet(sessionId, exerciseUUID, setData);
        setDisplayPerfs((prev) => {
          const cur = prev[exerciseUUID] || {
            exoName: selectedExo.name,
            series: [],
          };
          return {
            ...prev,
            [exerciseUUID]: {
              ...cur,
              series: [
                ...cur.series,
                {
                  id: newSet.id,
                  serie: newSet.set_number,
                  charge: newSet.weight_kg,
                  reps: newSet.reps,
                  rpe: newSet.rpe,
                  isWarmup: newSet.is_warmup,
                  isPR: newSet.is_pr,
                },
              ],
            },
          };
        });
      } else {
        const updated = await updateSet(selectedPerf.id, setData);
        setDisplayPerfs((prev) => {
          const cur = prev[exerciseUUID] || {
            exoName: selectedExo.name,
            series: [],
          };
          return {
            ...prev,
            [exerciseUUID]: {
              ...cur,
              series: cur.series.map((s) =>
                s.id === selectedPerf.id ?
                  {
                    id: updated.id,
                    serie: updated.set_number,
                    charge: updated.weight_kg,
                    reps: updated.reps,
                    rpe: updated.rpe,
                    isWarmup: updated.is_warmup,
                    isPR: updated.is_pr,
                  }
                : s,
              ),
            },
          };
        });
      }
      setModalOpen(false);
    } catch (err) {
      console.error("Erreur sauvegarde :", err.message);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedExo || !selectedPerf) return;
    const exerciseUUID = resolveUUID(selectedExo.name);
    setSaving(true);
    try {
      await deleteSet(selectedPerf.id);
      if (exerciseUUID) {
        setDisplayPerfs((prev) => {
          const cur = prev[exerciseUUID];
          if (!cur) return prev;
          return {
            ...prev,
            [exerciseUUID]: {
              ...cur,
              series: cur.series.filter((s) => s.id !== selectedPerf.id),
            },
          };
        });
      }
      setActionOpen(false);
    } catch (err) {
      console.error("Erreur suppression :", err.message);
      alert("Erreur lors de la suppression.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveFreeExo = () => {
    if (!exoToRemove) return;
    setFreeExercises((prev) => prev.filter((e) => e.id !== exoToRemove.id));
    setConfirmRemoveExoOpen(false);
    setExoToRemove(null);
  };

  /* ── Terminer la séance ── */
  const handleFinish = async () => {
    if (allSeries.length === 0) {
      alert("Ajoute au moins une série avant de terminer !");
      return;
    }
    setCompleting(true);
    try {
      clearInterval(timerRef.current);
      await completeSession(sessionId);
      localStorage.removeItem(`sessionStarted_${sessionId}`);
      const msg =
        FINISH_MESSAGES[Math.floor(Math.random() * FINISH_MESSAGES.length)];
      setFinishMessage(msg);
      setSummaryOpen(true);
    } catch (err) {
      console.error("Erreur completion :", err.message);
    } finally {
      setCompleting(false);
    }
  };

  const summaryExercises = Object.entries(displayPerfs)
    .map(([uuid, data]) => {
      const warmups = data.series.filter((s) => s.isWarmup);
      const workSets = data.series.filter((s) => !s.isWarmup);
      const maxCharge =
        workSets.length > 0 ? Math.max(...workSets.map((s) => s.charge)) : 0;
      const volume = data.series.reduce(
        (acc, s) => acc + (s.charge || 0) * (s.reps || 0),
        0,
      );
      const hasPR = data.series.some((s) => s.isPR);
      return {
        name: data.exoName,
        warmups: warmups.length,
        sets: workSets.length,
        maxCharge,
        volume,
        hasPR,
        series: data.series,
      };
    })
    .filter((e) => e.series.length > 0);

  const kcal = estimateKcal(elapsed, profile);

  /* ── Chips ── */
  const SerieChips = ({ exoName }) => {
    const uuid = exerciseMap[exoName];
    const series = uuid ? displayPerfs[uuid]?.series || [] : [];
    if (!series.length)
      return <span style={{ color: "var(--text3)", fontSize: 12 }}>—</span>;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {series.map((s, i) => (
          <span
            key={i}
            onClick={() => openAction(exoName, s)}
            className={`chip ${
              s.isWarmup ? "chip--warmup"
              : s.isPR ? "chip--pr"
              : "chip--accent"
            }`}
            style={{ display: "inline-block", cursor: "pointer" }}
          >
            {s.charge}kg×{s.reps}
          </span>
        ))}
      </div>
    );
  };

  const RpeChips = ({ exoName }) => {
    const uuid = exerciseMap[exoName];
    const series = uuid ? displayPerfs[uuid]?.series || [] : [];
    if (!series.length)
      return <span style={{ color: "var(--text3)", fontSize: 12 }}>—</span>;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {series.map((s, i) => (
          <span
            key={i}
            onClick={() => openAction(exoName, s)}
            className={`chip ${
              s.isWarmup ? "chip--warmup"
              : s.isPR ? "chip--pr"
              : ""
            }`}
            style={{ display: "inline-block", cursor: "pointer" }}
          >
            {s.rpe > 0 ? s.rpe : "—"}
          </span>
        ))}
      </div>
    );
  };

  if (loading)
    return (
      <div className="empty-state">
        <i
          className="ti ti-loader-2"
          style={{ animation: "spin 1s linear infinite" }}
          aria-hidden="true"
        />
        <p className="empty-state__sub">Chargement de la séance…</p>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  const muscleNames = Object.keys(allExercises).sort();

  return (
    <div>
      {/* ── Header ── */}
      <div className="session-meta">
        <span className="session-meta__day">{prettyDay}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Timer affiché quand la séance est démarrée */}
          {sessionStarted && (
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 15,
                fontWeight: 700,
                color: "var(--accent)",
                letterSpacing: ".04em",
              }}
            >
              {formatDuration(elapsed)}
            </span>
          )}
          <button className="badge badge--accent" onClick={onChangeSession}>
            <i
              className="ti ti-refresh"
              style={{ fontSize: 11 }}
              aria-hidden="true"
            />{" "}
            Changer
          </button>
        </div>
      </div>
      <div className="session-title">{activeTemplate?.name || "Séance"}</div>

      {/* ── Stats ── */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__label">Séries</div>
          <div className="stat-card__value">{totalSeries}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Volume</div>
          <div className="stat-card__value">
            {totalVolume >= 1000 ?
              (totalVolume / 1000).toFixed(1)
            : totalVolume}
            <span>{totalVolume >= 1000 ? "t" : "kg"}</span>
          </div>
        </div>
        <div className="stat-card stat-card--pr">
          <div className="stat-card__label">PR</div>
          <div className="stat-card__value">{totalPR}</div>
        </div>
      </div>

      {/* ── Écran de démarrage (flou sur le tableau) ── */}
      <div style={{ position: "relative" }}>
        {/* Tableau avec flou si pas encore démarré */}
        <div
          style={{
            filter: sessionStarted ? "none" : "blur(3px)",
            transition: "filter .4s ease",
            pointerEvents: sessionStarted ? "auto" : "none",
            userSelect: sessionStarted ? "auto" : "none",
          }}
        >
          {exercisesToShow.length === 0 ?
            <div className="empty-state" style={{ padding: "32px 0" }}>
              <i className="ti ti-barbell" aria-hidden="true" />
              <p className="empty-state__title">Aucun exercice</p>
              <p className="empty-state__sub">
                {isFree ?
                  "Ajoute des exercices ci-dessous"
                : "Configure cette séance dans l'onglet Profil"}
              </p>
            </div>
          : <div
              className="training-table-container"
              style={{ marginBottom: 16 }}
            >
              <table className="training-table">
                <thead>
                  <tr>
                    <th className="col-exo">Exercice</th>
                    <th className="col-data">Charge × Reps</th>
                    <th className="col-data">RPE</th>
                    <th className="col-add"></th>
                  </tr>
                </thead>
                <tbody>
                  {exercisesToShow.map((exo, i) => (
                    <tr key={exo.exercise_id || exo.id || i}>
                      <td>
                        <div
                          style={{
                            fontWeight: 500,
                            color: "var(--text)",
                            cursor: isFree ? "pointer" : "default",
                          }}
                          onClick={() => isFree && openConfirmRemoveExo(exo)}
                        >
                          {exo.name}
                        </div>
                        {exo.muscleName && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text3)",
                              marginTop: 1,
                            }}
                          >
                            {exo.muscleName}
                          </div>
                        )}
                      </td>
                      <td>
                        <SerieChips exoName={exo.name} />
                      </td>
                      <td>
                        <RpeChips exoName={exo.name} />
                      </td>
                      <td
                        style={{ textAlign: "center", verticalAlign: "middle" }}
                      >
                        <button
                          className="btn--add"
                          onClick={() => openAdd(exo)}
                        >
                          +
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }

          {isFree && (
            <button
              className="btn btn--ghost"
              style={{ width: "100%", marginBottom: 16 }}
              onClick={() => setAddExoDrawer(true)}
            >
              <i className="ti ti-plus" aria-hidden="true" /> Ajouter un
              exercice
            </button>
          )}

          {allSeries.length > 0 && (
            <button
              className="btn btn--primary"
              style={{ width: "100%", marginBottom: 24, padding: "13px" }}
              onClick={handleFinish}
              disabled={completing}
            >
              {completing ?
                <>
                  <i
                    className="ti ti-loader-2"
                    style={{ animation: "spin .8s linear infinite" }}
                    aria-hidden="true"
                  />{" "}
                  Finalisation…
                </>
              : <>
                  <i className="ti ti-check" aria-hidden="true" /> Terminer la
                  séance
                </>
              }
            </button>
          )}
        </div>

        {/* ── Bouton Commencer (par-dessus le flou) ── */}
        {!sessionStarted && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <button
              className="btn btn--primary"
              style={{
                padding: "14px 32px",
                fontSize: 16,
                fontWeight: 700,
                boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
              }}
              onClick={handleStart}
            >
              <i className="ti ti-player-play" aria-hidden="true" /> Commencer
              la séance
            </button>
            <span style={{ fontSize: 12, color: "var(--text3)" }}>
              Le timer démarre automatiquement
            </span>
          </div>
        )}
      </div>

      {/* ── Drawer ajout exo libre ── */}
      {addExoDrawer && (
        <>
          <div
            className="drawer-overlay"
            onClick={() => {
              setAddExoDrawer(false);
              setFilterMuscle("");
            }}
          />
          <div
            className="drawer"
            style={{ maxHeight: "80vh", overflowY: "auto" }}
          >
            <div className="drawer-handle" />
            <div className="drawer-header">
              <span className="drawer-title">Ajouter un exercice</span>
              <button
                className="drawer-close"
                onClick={() => {
                  setAddExoDrawer(false);
                  setFilterMuscle("");
                }}
                aria-label="Fermer"
              >
                <i className="ti ti-x" aria-hidden="true" />
              </button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <select
                value={filterMuscle}
                onChange={(e) => setFilterMuscle(e.target.value)}
              >
                <option value="">Tous les muscles</option>
                {muscleNames.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="drawer-list">
              {Object.entries(allExercises)
                .filter(([muscle]) => !filterMuscle || muscle === filterMuscle)
                .sort(([a], [b]) => a.localeCompare(b))
                .flatMap(([muscle, exos]) =>
                  exos
                    .filter(
                      (exo) => !freeExercises.some((fe) => fe.id === exo.id),
                    )
                    .map((exo) => ({ ...exo, muscleName: muscle })),
                )
                .map((exo) => (
                  <button
                    key={exo.id}
                    className="drawer-item"
                    onClick={() => {
                      setFreeExercises((prev) => [...prev, exo]);
                      setAddExoDrawer(false);
                      setFilterMuscle("");
                    }}
                  >
                    <span>
                      <span style={{ color: "var(--text)", fontWeight: 500 }}>
                        {exo.name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: "var(--text3)",
                          marginLeft: 8,
                        }}
                      >
                        {exo.muscleName}
                      </span>
                    </span>
                    <i className="ti ti-plus" aria-hidden="true" />
                  </button>
                ))}
            </div>
          </div>
        </>
      )}

      {/* ── Modale ajout / édition série ── */}
      {modalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}
        >
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-title">
              {mode === "edit" ? "Modifier" : "Ajouter"} une série
            </div>
            <div className="modal-subtitle">{selectedExo?.name}</div>
            <label className="toggle-label">
              Échauffement
              <input
                type="checkbox"
                checked={isWarmup}
                onChange={(e) => setIsWarmup(e.target.checked)}
              />
            </label>
            <label className="toggle-label" style={{ marginBottom: 20 }}>
              Personal Record (PR)
              <input
                type="checkbox"
                checked={isPR}
                onChange={(e) => setIsPR(e.target.checked)}
                disabled={isWarmup}
              />
            </label>
            <div
              className="form-group"
              style={{
                marginBottom: 16,
                opacity: isWarmup ? 0.45 : 1,
                transition: "opacity .2s",
              }}
            >
              <label>
                Série n°
                {isWarmup && (
                  <span
                    style={{
                      fontWeight: 400,
                      textTransform: "none",
                      letterSpacing: 0,
                      marginLeft: 6,
                      color: "var(--text3)",
                    }}
                  >
                    (ignorée)
                  </span>
                )}
                <select
                  value={selectedSerie}
                  onChange={(e) => setSelectedSerie(parseInt(e.target.value))}
                  disabled={isWarmup}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-row-3">
              <div className="form-group">
                <label>
                  Charge (kg)
                  <input
                    type="number"
                    value={charge}
                    onChange={(e) => setCharge(e.target.value)}
                    min="0"
                    step="0.5"
                    placeholder="0"
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  Reps
                  <input
                    type="number"
                    value={reps}
                    onChange={(e) => setReps(e.target.value)}
                    min="0"
                    placeholder="0"
                  />
                </label>
              </div>
              <div className="form-group">
                <label>
                  RPE
                  <input
                    type="number"
                    value={rpe}
                    onChange={(e) => setRpe(e.target.value)}
                    min="1"
                    max="10"
                    placeholder="—"
                  />
                </label>
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="btn btn--ghost"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Annuler
              </button>
              <button
                className="btn btn--primary"
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? "Sauvegarde…" : "Valider"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale actions série ── */}
      {actionOpen && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setActionOpen(false)}
        >
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-title">
              {selectedPerf?.isWarmup ?
                "Échauffement"
              : `Série ${selectedPerf?.serie}`}
            </div>
            <div className="modal-subtitle">
              {selectedExo?.name} · {selectedPerf?.charge}kg ×{" "}
              {selectedPerf?.reps} reps
              {selectedPerf?.rpe > 0 && ` · RPE ${selectedPerf.rpe}`}
              {selectedPerf?.isPR && " · 🏆 PR"}
            </div>
            <div className="modal-actions">
              <button
                className="btn btn--ghost"
                onClick={() => {
                  setActionOpen(false);
                  openEdit(selectedExo, selectedPerf);
                }}
              >
                <i className="ti ti-pencil" aria-hidden="true" /> Modifier
              </button>
              <button
                className="btn btn--danger"
                onClick={handleDelete}
                disabled={saving}
              >
                <i className="ti ti-trash" aria-hidden="true" />{" "}
                {saving ? "…" : "Supprimer"}
              </button>
            </div>
            <div
              className="modal-actions modal-actions--single"
              style={{ marginTop: 10 }}
            >
              <button
                className="btn btn--ghost"
                onClick={() => setActionOpen(false)}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale confirmation suppression exo libre ── */}
      {confirmRemoveExoOpen && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setConfirmRemoveExoOpen(false)
          }
        >
          <div className="modal-sheet">
            <div className="modal-handle" />
            <div className="modal-title">Supprimer l'exercice</div>
            <div className="modal-subtitle">
              Veux-tu vraiment supprimer <strong>{exoToRemove?.name}</strong> de
              ta séance ?
            </div>
            <div className="modal-actions">
              <button
                className="btn btn--ghost"
                onClick={() => setConfirmRemoveExoOpen(false)}
              >
                Annuler
              </button>
              <button className="btn btn--danger" onClick={handleRemoveFreeExo}>
                <i className="ti ti-trash" aria-hidden="true" /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Écran résumé de fin de séance ── */}
      {summaryOpen && (
        <div className="modal-overlay">
          <div
            className="modal-sheet"
            style={{ maxHeight: "90vh", overflowY: "auto" }}
          >
            <div className="modal-handle" />
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
              <div
                className="modal-title"
                style={{ textAlign: "center", fontSize: 22 }}
              >
                Séance terminée !
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "var(--accent)",
                  fontStyle: "italic",
                  marginTop: 8,
                  padding: "10px 16px",
                  background: "var(--accent-bg)",
                  borderRadius: "var(--radius-md)",
                  border: "0.5px solid var(--accent-border)",
                }}
              >
                {finishMessage}
              </div>
            </div>

            {/* Stats globales + durée + kcal */}
            <div className="stats-grid" style={{ marginBottom: 12 }}>
              <div className="stat-card">
                <div className="stat-card__label">Séries</div>
                <div className="stat-card__value">{totalSeries}</div>
              </div>
              <div className="stat-card">
                <div className="stat-card__label">Volume</div>
                <div className="stat-card__value">
                  {totalVolume >= 1000 ?
                    (totalVolume / 1000).toFixed(1)
                  : totalVolume}
                  <span>{totalVolume >= 1000 ? "t" : "kg"}</span>
                </div>
              </div>
              <div className="stat-card stat-card--pr">
                <div className="stat-card__label">PR</div>
                <div className="stat-card__value">{totalPR}</div>
              </div>
            </div>

            {/* Durée + kcal */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: kcal ? "1fr 1fr" : "1fr",
                gap: 10,
                marginBottom: 20,
              }}
            >
              {elapsed > 0 && (
                <div className="stat-card">
                  <div className="stat-card__label">Durée</div>
                  <div className="stat-card__value" style={{ fontSize: 18 }}>
                    {formatDuration(elapsed)}
                  </div>
                </div>
              )}
              {kcal && (
                <div className="stat-card">
                  <div className="stat-card__label">~kcal</div>
                  <div
                    className="stat-card__value"
                    style={{ fontSize: 18, color: "var(--warmup)" }}
                  >
                    {kcal}
                    <span>kcal</span>
                  </div>
                </div>
              )}
            </div>

            {!kcal && (
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text3)",
                  textAlign: "center",
                  marginBottom: 16,
                  padding: "8px 14px",
                  background: "var(--bg3)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                💡 Renseigne ton poids dans le Profil pour estimer les kcal
                brûlées
              </div>
            )}

            {/* Détail exercices */}
            <h3 style={{ marginBottom: 12 }}>Détail des exercices</h3>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginBottom: 24,
              }}
            >
              {summaryExercises.map((exo, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--bg3)",
                    borderRadius: "var(--radius-md)",
                    border: "0.5px solid var(--border)",
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 6,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "var(--text)",
                      }}
                    >
                      {exo.hasPR && (
                        <span style={{ color: "var(--pr)", marginRight: 6 }}>
                          🏆
                        </span>
                      )}
                      {exo.name}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text3)" }}>
                      {exo.sets} série{exo.sets > 1 ? "s" : ""}
                      {exo.warmups > 0 && ` + ${exo.warmups} éch.`}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 16 }}>
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--text3)",
                          textTransform: "uppercase",
                          letterSpacing: ".06em",
                        }}
                      >
                        Max
                      </div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: "var(--accent)",
                        }}
                      >
                        {exo.maxCharge}kg
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--text3)",
                          textTransform: "uppercase",
                          letterSpacing: ".06em",
                        }}
                      >
                        Volume
                      </div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: "var(--text)",
                        }}
                      >
                        {exo.volume}kg
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                className="btn btn--primary"
                style={{ width: "100%", padding: "13px" }}
                onClick={() => {
                  setSummaryOpen(false);
                  onChangeSession();
                }}
              >
                <i className="ti ti-home" aria-hidden="true" /> Retour à
                l'accueil
              </button>
              <button
                className="btn btn--ghost"
                style={{ width: "100%" }}
                onClick={() => setSummaryOpen(false)}
              >
                Continuer la séance
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default TrainingInfos;
