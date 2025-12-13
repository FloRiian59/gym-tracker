import { useState } from "react";
import TrainingInfos from "./TrainingInfos";

const TrainingPage = ({ profile }) => {
  const today = new Date().getDay();
  const isWeekend = today === 0 || today === 6;
  const [dayIndex, setDayIndex] = useState(isWeekend ? 1 : today);

  return (
    <div>
      {isWeekend && (
        <div className="warning-text-container">
          <span>
            {" "}
            Pas de séance programmée aujourd’hui, mais vous pouvez composer
            votre séance ci-dessous :
          </span>
        </div>
      )}
      <TrainingInfos key={profile} dayIndex={dayIndex} profile={profile} />
    </div>
  );
};

export default TrainingPage;
