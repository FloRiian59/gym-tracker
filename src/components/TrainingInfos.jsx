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
  const session = TrainingData.find((s) => s.day === todayName);

  const [modalOpen, setModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedExo, setSelectedExo] = useState(null);
  const [selectedSerie, setSelectedSerie] = useState(1);
  const [isWarmup, setIsWarmup] = useState(false);
  const [charge, setCharge] = useState("");
  const [reps, setReps] = useState("");
  const [rpe, setRpe] = useState("");
  const [isPR, setIsPR] = useState(false);
  const [mode, setMode] = useState("add");
  const [selectedPerf, setSelectedPerf] = useState(null);

  const [perfs, setPerfs] = useState(() => {
    const saved = localStorage.getItem(`trainingPerfs_${profile}`);
    if (!saved) return {};
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error("Erreur parsing localStorage pour", profile, e);
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem(`trainingPerfs_${profile}`, JSON.stringify(perfs));
  }, [perfs, profile]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.setItem(`trainingPerfs_${profile}`, JSON.stringify(perfs));
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      localStorage.setItem(`trainingPerfs_${profile}`, JSON.stringify(perfs));
    };
  }, [perfs, profile]);

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

  const handleSubmit = () => {
    if (!selectedExo) return;

    const newPerf = {
      serie: isWarmup ? null : selectedSerie,
      charge: parseInt(charge) || 0,
      reps: parseInt(reps) || 0,
      rpe: parseInt(rpe) || 0,
      isPR: isPR && !isWarmup,
      isWarmup: isWarmup,
    };

    const today = new Date();
    const isoDate = today.toISOString().split("T")[0];
    const prettyDate = today.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // On garde TOUTES les perfs existantes
    const updatedPerfs = { ...perfs };

    // On ne met à jour QUE l'exercice actuel
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
    setModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setCharge("");
    setReps("");
    setRpe("");
    setIsPR(false);
    setMode("add");
  };

  const openActionModal = (exoId, perf) => {
    setSelectedExo({ id: exoId });
    setSelectedPerf(perf);
    setActionModalOpen(true);
  };

  const handleDelete = () => {
    if (!selectedExo || !selectedPerf) return;

    const today = new Date();
    const isoDate = today.toISOString().split("T")[0];
    const prettyDate = today.toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const updatedPerfs = { ...perfs };
    const currentExoData = updatedPerfs[selectedExo.id];

    if (currentExoData) {
      updatedPerfs[selectedExo.id] = {
        ...currentExoData,
        series: currentExoData.series.filter(
          (s) => s.serie !== selectedPerf.serie
        ),
        lastUpdated: isoDate,
        dateLabel: prettyDate,
        dayName: todayName,
      };
    }

    setPerfs(updatedPerfs);
    setActionModalOpen(false);
    setSelectedPerf(null);
  };

  const handleEdit = () => {
    setActionModalOpen(false);
    openModal(selectedExo, "edit", selectedPerf);
  };

  if (!session) return null;

  const { muscles, exercises } = session;

  return (
    <div className="training-container">
      <div className="training-infos">
        <div className="training-date">Séance du {todayName}</div>
        <div className="training-muscle">{muscles.join(" / ")}</div>
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {exercises[muscle].map((exo, index) => (
                  <React.Fragment key={index}>
                    <tr>
                      <td>{exo.name}</td>
                      <td>
                        {perfs[exo.id]?.series.map((s) => (
                          <div
                            key={s.serie}
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
                        {perfs[exo.id]?.series.map((s) => (
                          <div
                            key={s.serie}
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
                        {perfs[exo.id]?.series.map((s) => (
                          <div
                            key={s.serie}
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
                    value={charge}
                    onChange={(e) => setCharge(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <span style={{ marginLeft: "10px" }}>kg</span>
                </div>
              </label>
              <label>
                Reps :
                <input
                  type="number"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                />
              </label>
              <label>
                RPE (1-10) :
                <input
                  type="number"
                  value={rpe}
                  onChange={(e) => setRpe(e.target.value)}
                  min="1"
                  max="10"
                />
              </label>
              <label>
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

      {/* Petite modale pour actions (modifier/supprimer) */}
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
