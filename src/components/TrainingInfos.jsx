import { useState, useEffect, useCallback } from "react";
import {
  getSetsBySession,
  getExercisesGrouped,
  addSet,
  updateSet,
  deleteSet,
} from "../queries";

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

  const [loading, setLoading] = useState(true);
  const [displayPerfs, setDisplayPerfs] = useState({});
  const [exerciseMap, setExerciseMap] = useState({});
  const [allExercises, setAllExercises] = useState({});

  // Mode libre
  const [freeExercises, setFreeExercises] = useState(() => {
    const saved = localStorage.getItem(`freeExercises_${todayISO}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Modales
  const [modalOpen, setModalOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);
  const [addExoDrawer, setAddExoDrawer] = useState(false);
  const [selectedExo, setSelectedExo] = useState(null);
  const [selectedPerf, setSelectedPerf] = useState(null);
  const [mode, setMode] = useState("add");
  const [filterMuscle, setFilterMuscle] = useState("");

  // Formulaire
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

  /* ── Chargement ── */
  const load = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const [grouped, perfs] = await Promise.all([
        getExercisesGrouped(),
        getSetsBySession(sessionId),
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
    } catch (err) {
      console.error("Erreur chargement :", err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Exercices à afficher ── */
  const exercisesToShow =
    isFree ? freeExercises : activeTemplate?.exercises || [];

  /* ── Stats ── */
  const allSeries = Object.values(displayPerfs).flatMap((e) => e.series || []);
  const totalSeries = allSeries.filter((s) => !s.isWarmup).length;
  const totalVolume = allSeries
    .filter((s) => !s.isWarmup)
    .reduce((acc, s) => acc + (s.charge || 0) * (s.reps || 0), 0);
  const totalPR = allSeries.filter((s) => s.isPR).length;

  const resolveUUID = (exoName) => exerciseMap[exoName] || null;

  /* ── Modales ── */
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

  /* ── Soumettre ── */
  const handleSubmit = async () => {
    if (!selectedExo || !sessionId) return;
    const exerciseUUID = resolveUUID(selectedExo.name);
    if (!exerciseUUID) {
      alert(`Exercice "${selectedExo.name}" introuvable en base.`);
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
      alert("Erreur lors de la sauvegarde. Vérifie ta connexion.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Supprimer ── */
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

  /* ── Chips ── */
  const SerieChips = ({ exoName }) => {
    const uuid = exerciseMap[exoName];
    const series = uuid ? displayPerfs[uuid]?.series || [] : [];
    if (!series.length)
      return <span style={{ color: "var(--text3)", fontSize: 12 }}>—</span>;
    return series.map((s, i) => (
      <span
        key={i}
        onClick={() => openAction(exoName, s)}
        className={`chip ${
          s.isWarmup ? "chip--warmup"
          : s.isPR ? "chip--pr"
          : "chip--accent"
        }`}
      >
        {s.charge}kg×{s.reps}
      </span>
    ));
  };

  const RpeChips = ({ exoName }) => {
    const uuid = exerciseMap[exoName];
    const series = uuid ? displayPerfs[uuid]?.series || [] : [];
    if (!series.length)
      return <span style={{ color: "var(--text3)", fontSize: 12 }}>—</span>;
    return series.map((s, i) => (
      <span
        key={i}
        onClick={() => openAction(exoName, s)}
        className={`chip ${
          s.isWarmup ? "chip--warmup"
          : s.isPR ? "chip--pr"
          : ""
        }`}
      >
        {s.rpe > 0 ? s.rpe : "—"}
      </span>
    ));
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
        <button className="badge badge--accent" onClick={onChangeSession}>
          <i
            className="ti ti-refresh"
            style={{ fontSize: 11 }}
            aria-hidden="true"
          />{" "}
          Changer
        </button>
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

      {/* ── Table exercices ── */}
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
      : <div className="training-table-container" style={{ marginBottom: 16 }}>
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
                    <div style={{ fontWeight: 500, color: "var(--text)" }}>
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
                  <td style={{ textAlign: "center" }}>
                    <button className="btn--add" onClick={() => openAdd(exo)}>
                      +
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }

      {/* ── Bouton ajouter (mode libre) ── */}
      {isFree && (
        <button
          className="btn btn--ghost"
          style={{ width: "100%", marginBottom: 24 }}
          onClick={() => setAddExoDrawer(true)}
        >
          <i className="ti ti-plus" aria-hidden="true" /> Ajouter un exercice
        </button>
      )}

      {/* ── Drawer ajout exercice libre ── */}
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
                <i className="ti ti-x" aria-hidden="true"></i>
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

      {/* ── Modale ajout / édition ── */}
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
            {!isWarmup && (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>
                  Série n°
                  <select
                    value={selectedSerie}
                    onChange={(e) => setSelectedSerie(parseInt(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
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

      {/* ── Modale actions ── */}
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
                <i className="ti ti-pencil"> Modifier</i>
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

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default TrainingInfos;
