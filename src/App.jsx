import { useState } from "react";
import Header from "./components/Header";
import NavBtn from "./components/NavBtn";
import TrainingPage from "./components/TrainingPage";
import TrainingHistory from "./components/TrainingHistory";
import Footer from "./components/Footer";

function App() {
  const [activeProfile, setActiveProfile] = useState(() => {
    return localStorage.getItem("activeProfile") || "florian";
  });

  const [activeMode, setActiveMode] = useState("saisie");

  const handleProfileChange = (profile) => {
    setActiveProfile(profile);
    localStorage.setItem("activeProfile", profile);
  };

  const handleSwitch = (mode) => {
    setActiveMode(mode);
  };

  return (
    <div className="app-container">
      <Header />
      <NavBtn onSwitch={handleSwitch} />
      {activeMode === "saisie" ? (
        <TrainingPage profile={activeProfile} />
      ) : (
        <TrainingHistory profile={activeProfile} />
      )}
      <Footer
        onProfileChange={handleProfileChange}
        activeProfile={activeProfile}
      />
    </div>
  );
}

export default App;
