import React from "react";
import { useState, useEffect } from "react";
import "../css/TrainingInfos.css";
import TrainingData from "../data/TrainingData";
import FullBodyData from "../data/FullBodyData";
const dayMap = {
  1: "Lundi",
  2: "Mardi",
  3: "Mercredi",
  4: "Jeudi",
  5: "Vendredi",
  6: "Samedi",
  0: "Dimanche",
};

const TrainingInfos = ({ dayIndex, profile }) => {
  const todayName = dayMap[dayIndex];
  const today = new Date();
  const todayLocal = today.toLocaleDateString("fr-FR", {
    timeZone: "Europe/Paris",
  });
  const [day, month, year] = todayLocal.split("/");
  const todayISO = `${year.padStart(4, "0")}-${month.padStart(
    2,
    "0"
  )}-${day.padStart(2, "0")}`;

  // États
  const [modalOpen, setModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedExo, setSelectedExo] = useState(null);
  const [selectedSerie, setSelectedSerie] = useState(1);
  const [isWarmup, setIsWarmup] = useState(false);
  const [charge, setCharge] = useState("");
  const [reps, setReps] = useState("");
  const [rpe, setRpe] = useState("");
  const [isPR, setIsPR] = useState(false);
  const [mode, setMode] = useState("add");
  const [selectedPerf, setSelectedPerf] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedFullBodyMuscles, setSelectedFullBodyMuscles] = useState([]);
  const [selectedFullBodyExercises, setSelectedFullBodyExercises] = useState(
    {}
  );

  const getExercisesForMuscle = (muscle) => {
    return FullBodyData.exercises[muscle] || [];
  };

  // Perfs globales (toutes les dates)
  const [allPerfs, setAllPerfs] = useState(() => {
    const saved = localStorage.getItem(`trainingPerfs_${profile}`);
    return saved ? JSON.parse(saved) : {};
  });

  // Perfs affichées (uniquement pour la date actuelle)
  const [displayPerfs, setDisplayPerfs] = useState({});

  // Chargement des perfs pour la date actuelle
  useEffect(() => {
    const saved = localStorage.getItem(`trainingPerfs_${profile}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setAllPerfs(parsed);
      setDisplayPerfs(parsed[todayISO] || {});
    }
  }, [profile, todayISO, selectedSession]);

  // Sauvegarde selectedSession dans localStorage
  useEffect(() => {
    if (selectedSession !== null) {
      localStorage.setItem(`selectedSession_${profile}`, selectedSession);
    }
  }, [selectedSession, profile]);

  // Chargement de selectedSession au montage
  useEffect(() => {
    const savedSession = localStorage.getItem(`selectedSession_${profile}`);
    if (savedSession) {
      setSelectedSession(savedSession);
    }
  }, [profile]);

  // Sauvegarde des perfs dans localStorage
  useEffect(() => {
    localStorage.setItem(`trainingPerfs_${profile}`, JSON.stringify(allPerfs));
  }, [allPerfs, profile]);

  // Sauvegarde à la fermeture
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.setItem(
        `trainingPerfs_${profile}`,
        JSON.stringify(allPerfs)
      );
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [allPerfs, profile]);

  // Sauvegarde des muscles Full Body
  useEffect(() => {
    if (selectedFullBodyMuscles.length > 0) {
      localStorage.setItem(
        `fullBodyMuscles_${profile}`,
        JSON.stringify(selectedFullBodyMuscles)
      );
    }
  }, [selectedFullBodyMuscles, profile]);

  // Sauvegarde des exercices Full Body
  useEffect(() => {
    if (Object.keys(selectedFullBodyExercises).length > 0) {
      localStorage.setItem(
        `fullBodyExercises_${profile}`,
        JSON.stringify(selectedFullBodyExercises)
      );
    }
  }, [selectedFullBodyExercises, profile]);

  // Chargement des muscles Full Body
  useEffect(() => {
    const savedMuscles = localStorage.getItem(`fullBodyMuscles_${profile}`);
    if (savedMuscles) {
      setSelectedFullBodyMuscles(JSON.parse(savedMuscles));
    }
  }, [profile]);

  // Chargement des exercices Full Body
  useEffect(() => {
    const savedExercises = localStorage.getItem(`fullBodyExercises_${profile}`);
    if (savedExercises) {
      setSelectedFullBodyExercises(JSON.parse(savedExercises));
    }
  }, [profile]);

  // Détermination de la séance
  // Détermination de la séance
  let session;
  if (selectedSession === null) {
    session = TrainingData.find((s) => s.day === todayName);
  } else if (selectedSession === "full-body") {
    session = FullBodyData;
  } else {
    session = TrainingData.find((s) => {
      const muscleList = s.muscles;
      switch (selectedSession) {
        case "pecs":
          return muscleList.length === 1 && muscleList.includes("Pecs");
        case "epaules":
          return muscleList.includes("Épaules");
        case "biceps-triceps":
          return (
            muscleList.length === 2 &&
            muscleList.includes("Biceps") &&
            muscleList.includes("Triceps")
          );
        case "pecs-triceps":
          return muscleList.some((m) =>
            ["Pecs", "Triceps", "Épaules"].includes(m)
          );
        case "dos-biceps":
          return muscleList.some((m) => ["Dos", "Biceps"].includes(m));
        default:
          return false;
      }
    });
  }
  // Si aucune séance n'est trouvée
  if (!session) {
    return (
      <div className="training-container">
        <div className="training-infos">
          <div className="training-date">Séance du {todayName}</div>
          <div
            className="training-muscle"
            style={{ fontSize: "1.8em", color: "#666" }}
          >
            Aucune séance sélectionnée
          </div>
        </div>
      </div>
    );
  }

  const { muscles, exercises } = session;

  // Ouverture modale
  const openModal = (exo, mode = "add", perf = null) => {
    setSelectedExo(exo);
    setMode(mode);
    if (mode === "edit" && perf) {
      setSelectedSerie(perf.serie || 1);
      setCharge(perf.charge.toString());
      setReps(perf.reps.toString());
      setRpe(perf.rpe ? perf.rpe.toString() : "");
      setIsPR(perf.isPR || false);
      setIsWarmup(perf.isWarmup || false);
    } else {
      const exoPerfs = displayPerfs[exo.id] || { series: [] };
      const effectiveSeries = exoPerfs.series.filter((s) => !s.isWarmup);
      const nextSerie =
        effectiveSeries.length > 0 ? effectiveSeries.length + 1 : 1;
      setSelectedSerie(nextSerie);
      setCharge("");
      setReps("");
      setRpe("");
      setIsPR(false);
      setIsWarmup(false);
    }
    setModalOpen(true);
  };

  const openActionModal = (exoId, perf) => {
    setSelectedExo(
      exercises[
        Object.keys(exercises).find((muscle) =>
          exercises[muscle].some((exo) => exo.id === exoId)
        )
      ].find((exo) => exo.id === exoId)
    );
    setSelectedPerf(perf);
    setActionModalOpen(true);
  };

  // Soumission
  const handleSubmit = () => {
    if (!selectedExo) return;
    const newPerf = {
      serie: isWarmup ? null : selectedSerie,
      charge: parseInt(charge) || 0,
      reps: parseInt(reps) || 0,
      rpe: parseInt(rpe) || 0,
      isPR: isPR && !isWarmup,
      isWarmup,
    };
    const prettyDate = today.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // Mise à jour des perfs pour la date actuelle
    const updatedAllPerfs = { ...allPerfs };
    const currentExoData = displayPerfs[selectedExo.id] || { series: [] };
    const updatedSeries =
      mode === "edit"
        ? currentExoData.series.map((s) =>
            s.serie === selectedSerie ? newPerf : s
          )
        : [...currentExoData.series, newPerf];

    updatedAllPerfs[todayISO] = {
      ...updatedAllPerfs[todayISO],
      [selectedExo.id]: {
        series: updatedSeries,
        lastUpdated: todayISO,
        dateLabel: prettyDate,
        dayName: todayName,
        exoName: selectedExo.name,
      },
    };

    setAllPerfs(updatedAllPerfs);
    setDisplayPerfs(updatedAllPerfs[todayISO]);
    setModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setCharge("");
    setReps("");
    setRpe("");
    setIsPR(false);
    setIsWarmup(false);
    setMode("add");
  };

  // Suppression
  const handleDelete = () => {
    if (!selectedExo || !selectedPerf) return;
    const updatedAllPerfs = { ...allPerfs };
    const currentExoData = updatedAllPerfs[todayISO]?.[selectedExo.id];
    if (currentExoData) {
      updatedAllPerfs[todayISO] = {
        ...updatedAllPerfs[todayISO],
        [selectedExo.id]: {
          ...currentExoData,
          series: currentExoData.series.filter(
            (s) => s.serie !== selectedPerf.serie
          ),
        },
      };
    }
    setAllPerfs(updatedAllPerfs);
    setDisplayPerfs(updatedAllPerfs[todayISO]);
    setActionModalOpen(false);
    setSelectedPerf(null);
  };

  const handleEdit = () => {
    setActionModalOpen(false);
    openModal(selectedExo, "edit", selectedPerf);
  };

  return (
    <div className="training-container">
      <div className="training-infos">
        <div className="training-date">Séance du {todayName}</div>
        <div className="muscle-selector" onClick={() => setDrawerOpen(true)}>
          <span className="muscle-text">
            {selectedSession === null
              ? muscles.join(" / ")
              : selectedSession === "full-body"
              ? "Full Body"
              : selectedSession === "pecs-triceps"
              ? "Pecs / Triceps"
              : selectedSession === "dos-biceps"
              ? "Dos / Biceps"
              : selectedSession === "epaules"
              ? "Épaules"
              : selectedSession === "biceps-triceps"
              ? "Biceps / Triceps"
              : selectedSession === "pecs"
              ? "Pecs"
              : muscles.join(" / ")}
          </span>
          <span className="dropdown-arrow">▼</span>
        </div>

        {/* DRAWER POUR CHOISIR LA SÉANCE */}
        {drawerOpen && (
          <>
            <div
              className="drawer-overlay"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="session-drawer">
              <div className="drawer-header">
                <h3>Choisir une séance</h3>
                <button onClick={() => setDrawerOpen(false)}>✕</button>
              </div>
              <div className="drawer-options">
                <div
                  className="drawer-option"
                  onClick={() => {
                    setSelectedSession(null);
                    setDisplayPerfs(allPerfs[todayISO] || {});
                    setDrawerOpen(false);
                  }}
                >
                  Séance programmée ({muscles.join(" / ")})
                </div>
                <div
                  className="drawer-option"
                  onClick={() => {
                    setSelectedSession("pecs-triceps");
                    setDisplayPerfs(allPerfs[todayISO] || {});
                    setDrawerOpen(false);
                  }}
                >
                  Pecs / Triceps
                </div>
                <div
                  className="drawer-option"
                  onClick={() => {
                    setSelectedSession("dos-biceps");
                    setDisplayPerfs(allPerfs[todayISO] || {});
                    setDrawerOpen(false);
                  }}
                >
                  Dos / Biceps
                </div>
                <div
                  className="drawer-option"
                  onClick={() => {
                    setSelectedSession("epaules");
                    setDisplayPerfs(allPerfs[todayISO] || {});
                    setDrawerOpen(false);
                  }}
                >
                  Épaules
                </div>
                <div
                  className="drawer-option"
                  onClick={() => {
                    setSelectedSession("biceps-triceps");
                    setDisplayPerfs(allPerfs[todayISO] || {});
                    setDrawerOpen(false);
                  }}
                >
                  Biceps / Triceps
                </div>
                <div
                  className="drawer-option"
                  onClick={() => {
                    setSelectedSession("pecs");
                    setDisplayPerfs(allPerfs[todayISO] || {});
                    setDrawerOpen(false);
                  }}
                >
                  Pecs
                </div>
                <div
                  className="drawer-option"
                  onClick={() => {
                    setSelectedSession("full-body");
                    setDisplayPerfs(allPerfs[todayISO] || {});
                    setDrawerOpen(false);
                  }}
                >
                  Full Body
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* SÉANCE FULL BODY */}
      {selectedSession === "full-body" ? (
        <div className="full-body-section">
          {/* Sélecteur pour ajouter un muscle */}
          <div className="full-body-muscle-selector">
            <select
              value=""
              onChange={(e) => {
                const muscle = e.target.value;
                if (muscle && !selectedFullBodyMuscles.includes(muscle)) {
                  setSelectedFullBodyMuscles([
                    ...selectedFullBodyMuscles,
                    muscle,
                  ]);
                }
              }}
            >
              <option value="">Ajouter un muscle</option>
              {FullBodyData.muscles
                .filter((m) => !selectedFullBodyMuscles.includes(m))
                .map((muscle) => (
                  <option key={muscle} value={muscle}>
                    {muscle}
                  </option>
                ))}
            </select>
          </div>

          {/* Affichage des muscles sélectionnés et de leurs exercices */}
          {selectedFullBodyMuscles.map((muscle) => (
            <div key={muscle} className="muscle-exercise-container">
              <h3 className="muscle-title">{muscle}</h3>

              {/* Sélecteur pour ajouter un exercice */}
              <div className="add-exercise-section">
                <select
                  value=""
                  onChange={(e) => {
                    const exerciseId = e.target.value;
                    if (exerciseId) {
                      const exercise = getExercisesForMuscle(muscle).find(
                        (exo) => exo.id === exerciseId
                      );
                      if (exercise) {
                        const currentExercises =
                          selectedFullBodyExercises[muscle] || [];
                        if (
                          !currentExercises.some(
                            (exo) => exo.id === exercise.id
                          )
                        ) {
                          setSelectedFullBodyExercises({
                            ...selectedFullBodyExercises,
                            [muscle]: [...currentExercises, exercise],
                          });
                        }
                      }
                    }
                  }}
                >
                  <option value="">Ajouter un exercice</option>
                  {getExercisesForMuscle(muscle)
                    .filter(
                      (exo) =>
                        !selectedFullBodyExercises[muscle]?.some(
                          (selectedExo) => selectedExo.id === exo.id
                        )
                    )
                    .map((exo) => (
                      <option key={exo.id} value={exo.id}>
                        {exo.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Tableau des exercices sélectionnés */}
              {selectedFullBodyExercises[muscle]?.length > 0 && (
                <table className="training-table">
                  <thead>
                    <tr>
                      <th>Exercice</th>
                      <th>Charge</th>
                      <th>Reps</th>
                      <th>RPE</th>
                      <th>Ajouter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedFullBodyExercises[muscle].map((exo) => (
                      <tr key={exo.id}>
                        <td>{exo.name}</td>
                        <td>
                          {displayPerfs[exo.id]?.series.map((s) => (
                            <div
                              key={`${exo.id}-${s.serie || "warmup"}`}
                              onClick={() => openActionModal(exo.id, s)}
                              style={{
                                cursor: "pointer",
                                color: s.isWarmup
                                  ? "#ff8c00"
                                  : s.isPR
                                  ? "#00ff00"
                                  : "#4fc3f7",
                              }}
                            >
                              {s.charge}kg
                            </div>
                          ))}
                        </td>
                        <td>
                          {displayPerfs[exo.id]?.series.map((s) => (
                            <div
                              key={`${exo.id}-${s.serie || "warmup"}`}
                              onClick={() => openActionModal(exo.id, s)}
                              style={{
                                cursor: "pointer",
                                color: s.isWarmup
                                  ? "#ff8c00"
                                  : s.isPR
                                  ? "#00ff00"
                                  : "#4fc3f7",
                              }}
                            >
                              {s.reps}
                            </div>
                          ))}
                        </td>
                        <td>
                          {displayPerfs[exo.id]?.series.map((s) => (
                            <div
                              key={`${exo.id}-${s.serie || "warmup"}`}
                              onClick={() => openActionModal(exo.id, s)}
                              style={{
                                cursor: "pointer",
                                color: s.isWarmup
                                  ? "#ff8c00"
                                  : s.isPR
                                  ? "#00ff00"
                                  : "#4fc3f7",
                              }}
                            >
                              {s.rpe || "-"}
                            </div>
                          ))}
                        </td>
                        <td>
                          <div className="add-perf-btn-container">
                            <button
                              className="add-perf-btn"
                              onClick={() => openModal(exo)}
                            >
                              +
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* SÉANCES CLASSIQUES */
        <div className="training-tables-scroll">
          {muscles.map((muscle) => (
            <div key={muscle} className="training-table-container">
              <h3 className="muscle-title">{muscle}</h3>
              <table className="training-table">
                <thead>
                  <tr>
                    <th>Exercice</th>
                    <th>Charge</th>
                    <th>Reps</th>
                    <th>RPE</th>
                    <th>Ajouter</th>
                  </tr>
                </thead>
                <tbody>
                  {exercises[muscle]?.map((exo) => (
                    <tr key={exo.id}>
                      <td>{exo.name}</td>
                      <td>
                        {displayPerfs[exo.id]?.series.map((s) => (
                          <div
                            key={`${exo.id}-${s.serie || "warmup"}`}
                            onClick={() => openActionModal(exo.id, s)}
                            style={{
                              cursor: "pointer",
                              color: s.isWarmup
                                ? "#ff8c00"
                                : s.isPR
                                ? "#00ff00"
                                : "#4fc3f7",
                            }}
                          >
                            {s.charge}kg
                          </div>
                        ))}
                      </td>
                      <td>
                        {displayPerfs[exo.id]?.series.map((s) => (
                          <div
                            key={`${exo.id}-${s.serie || "warmup"}`}
                            onClick={() => openActionModal(exo.id, s)}
                            style={{
                              cursor: "pointer",
                              color: s.isWarmup
                                ? "#ff8c00"
                                : s.isPR
                                ? "#00ff00"
                                : "#4fc3f7",
                            }}
                          >
                            {s.reps}
                          </div>
                        ))}
                      </td>
                      <td>
                        {displayPerfs[exo.id]?.series.map((s) => (
                          <div
                            key={`${exo.id}-${s.serie || "warmup"}`}
                            onClick={() => openActionModal(exo.id, s)}
                            style={{
                              cursor: "pointer",
                              color: s.isWarmup
                                ? "#ff8c00"
                                : s.isPR
                                ? "#00ff00"
                                : "#4fc3f7",
                            }}
                          >
                            {s.rpe || "-"}
                          </div>
                        ))}
                      </td>
                      <td>
                        <div className="add-perf-btn-container">
                          <button
                            className="add-perf-btn"
                            onClick={() => openModal(exo)}
                          >
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* MODALES */}
      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>
              {mode === "edit" ? "Modifier" : "Renseigner"} une performance
            </h2>
            <p>Exercice : {selectedExo?.name}</p>
            <div className="modal-form">
              <label className="warmup-label">
                <span>Échauffement</span>
                <input
                  type="checkbox"
                  checked={isWarmup}
                  onChange={(e) => setIsWarmup(e.target.checked)}
                />
              </label>
              <label>
                Série {isWarmup ? "(ignorée)" : ":"}
                <select
                  value={selectedSerie}
                  onChange={(e) => setSelectedSerie(parseInt(e.target.value))}
                  disabled={isWarmup}
                  style={{ opacity: isWarmup ? 0.5 : 1 }}
                >
                  {[1, 2, 3, 4, 5].map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Charge (kg) :
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    value={charge}
                    onChange={(e) => setCharge(e.target.value)}
                    style={{ flex: 1 }}
                    min="0"
                    step="0.5"
                  />
                  <span style={{ marginLeft: "10px" }}>kg</span>
                </div>
              </label>
              <label>
                Reps :
                <input
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  min="0"
                />
              </label>
              <label>
                RPE (1-10) :
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={rpe}
                  onChange={(e) => setRpe(e.target.value)}
                  min="1"
                  max="10"
                />
              </label>
              <label className="pr-label">
                PR
                <input
                  type="checkbox"
                  checked={isPR}
                  onChange={(e) => setIsPR(e.target.checked)}
                />
              </label>
              <div className="modal-actions">
                <button onClick={() => setModalOpen(false)}>Annuler</button>
                <button onClick={handleSubmit}>Valider</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {actionModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content modal-content--actions">
            <h2 style={{ margin: "0" }}>
              Actions pour la série {selectedPerf?.serie}
            </h2>
            <div className="modal-actions">
              <button onClick={handleEdit}>Modifier</button>
              <button onClick={handleDelete}>Supprimer</button>
              <button onClick={() => setActionModalOpen(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingInfos;
