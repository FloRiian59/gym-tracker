import { useState } from "react";
import TrainingInfos from "./TrainingInfos";

const TrainingPage = ({ profile }) => {
  const today = new Date().getDay();
  const isWeekend = today === 0 || today === 6;
  const [dayIndex, setDayIndex] = useState(isWeekend ? 1 : today);

  const handleDayChange = (e) => {
    const newDayIndex = Number(e.target.value);
    setDayIndex(newDayIndex);
  };

  return (
    <div>
      {isWeekend && (
        <div
          style={{
            marginBottom: "20px",
            color: "red",
            textAlign: "center",
            fontSize: "12px",
          }}
        >
          Pas de séance aujourd’hui (weekend), mais vous pouvez consulter les
          séances ci-dessous :
        </div>
      )}
      {isWeekend && (
        <div
          style={{
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            justifyContent: "center",
            color: "white",
          }}
        >
          <label>Choisir un jour : </label>
          <select value={dayIndex} onChange={handleDayChange}>
            <option value={1}>Lundi</option>
            <option value={2}>Mardi</option>
            <option value={3}>Mercredi</option>
            <option value={4}>Jeudi</option>
            <option value={5}>Vendredi</option>
          </select>
        </div>
      )}
      <TrainingInfos key={profile} dayIndex={dayIndex} profile={profile} />
    </div>
  );
};

export default TrainingPage;
