import { useState } from "react";
import "../css/NavBtn.css";

const NavBtn = ({ onSwitch }) => {
  const [isActive, setIsActive] = useState("saisie");

  const handleClick = (mode) => {
    setIsActive(mode);
    onSwitch(mode);
  };

  return (
    <div className="nav-container">
      <button
        className={isActive === "saisie" ? "saisie" : "historique"}
        onClick={() => handleClick("saisie")}
      >
        Saisie
      </button>
      <button
        className={isActive === "historique" ? "saisie" : "historique"}
        onClick={() => handleClick("historique")}
      >
        Historique
      </button>
    </div>
  );
};

export default NavBtn;
