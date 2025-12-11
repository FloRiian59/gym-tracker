import React from "react";
import { useState, useEffect } from "react";
import "../css/TrainingInfos.css";
import TrainingData from "../data/TrainingData";

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

  // États
  const [modalOpen, setModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null); // null = programmée
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

  // Perfs globales (historique + sauvegarde)
  const [perfs, setPerfs] = useState(() => {
    const saved = localStorage.getItem(`trainingPerfs_${profile}`);
    return saved ? JSON.parse(saved) : {};
  });

  // Perfs affichées (reset quand changement de séance/jour)
  const [displayPerfs, setDisplayPerfs] = useState({});
  const [currentDate, setCurrentDate] = useState(todayName);

  // Chargement + reset auto quand changement de jour
  useEffect(() => {
    const saved = localStorage.getItem(`trainingPerfs_${profile}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      setPerfs(parsed);

      // Reset complet si changement de jour
      if (todayName !== currentDate) {
        setDisplayPerfs({});
        setCurrentDate(todayName);
      } else {
        setDisplayPerfs(parsed);
      }
    }
  }, [profile, todayName, currentDate]);

  // Sauvegarde dans localStorage
  useEffect(() => {
    localStorage.setItem(`trainingPerfs_${profile}`, JSON.stringify(perfs));
  }, [perfs, profile]);

  // Sauvegarde à la fermeture
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.setItem(`trainingPerfs_${profile}`, JSON.stringify(perfs));
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [perfs, profile]);

  // Détermination de la séance
  let session;
  if (selectedSession === null) {
    session = TrainingData.find((s) => s.day === todayName);
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
      const exoPerfs = perfs[exo.id] || { series: [] };
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

    const today = new Date();
    const isoDate = today.toISOString().split("T")[0];
    const prettyDate = today.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const updatedPerfs = { ...perfs };
    const currentExoData = updatedPerfs[selectedExo.id] || { series: [] };

    const updatedSeries =
      mode === "edit"
        ? currentExoData.series.map((s) =>
            s.serie === selectedSerie ? newPerf : s
          )
        : [...currentExoData.series, newPerf];

    updatedPerfs[selectedExo.id] = {
      series: updatedSeries,
      lastUpdated: isoDate,
      dateLabel: prettyDate,
      dayName: todayName,
      exoName: selectedExo.name,
    };

    setPerfs(updatedPerfs);
    setDisplayPerfs(updatedPerfs);
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

    const updatedPerfs = { ...perfs };
    const currentExoData = updatedPerfs[selectedExo.id];

    if (currentExoData) {
      updatedPerfs[selectedExo.id] = {
        ...currentExoData,
        series: currentExoData.series.filter(
          (s) => s.serie !== selectedPerf.serie
        ),
      };
    }

    setPerfs(updatedPerfs);
    setDisplayPerfs(updatedPerfs);
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

        {/* DRAWER QUI MONTE DEPUIS LE BAS */}
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
                    setDisplayPerfs({});
                    setDrawerOpen(false);
                  }}
                >
                  Séance programmée ({muscles.join(" / ")})
                </div>
                <div
                  className="drawer-option"
                  onClick={() => {
                    setSelectedSession("pecs-triceps");
                    setDisplayPerfs({});
                    setDrawerOpen(false);
                  }}
                >
                  Pecs / Triceps
                </div>
                <div
                  className="drawer-option"
                  onClick={() => {
                    setSelectedSession("dos-biceps");
                    setDisplayPerfs({});
                    setDrawerOpen(false);
                  }}
                >
                  Dos / Biceps
                </div>
                <div
                  className="drawer-option"
                  onClick={() => {
                    setSelectedSession("epaules");
                    setDisplayPerfs({});
                    setDrawerOpen(false);
                  }}
                >
                  Épaules
                </div>
                <div
                  className="drawer-option"
                  onClick={() => {
                    setSelectedSession("biceps-triceps");
                    setDisplayPerfs({});
                    setDrawerOpen(false);
                  }}
                >
                  Biceps / Triceps
                </div>
                <div
                  className="drawer-option"
                  onClick={() => {
                    setSelectedSession("pecs");
                    setDisplayPerfs({});
                    setDrawerOpen(false);
                  }}
                >
                  Pecs
                </div>
              </div>
            </div>
          </>
        )}
      </div>

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
                {exercises[muscle].map((exo) => (
                  <React.Fragment key={exo.id}>
                    <tr>
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
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* MODALES — inchangées */}
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
          <div className="modal-content" style={{ width: "300px" }}>
            <h2 style={{ margin: "0" }}>
              Actions pour la série {selectedPerf?.serie}
            </h2>
            <div
              className="modal-actions"
              style={{ display: "flex", justifyContent: "space-around" }}
            >
              <button onClick={handleEdit}>Modifier</button>
              <button
                onClick={handleDelete}
                style={{ background: "red", color: "white" }}
              >
                Supprimer
              </button>
              <button onClick={() => setActionModalOpen(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainingInfos;
