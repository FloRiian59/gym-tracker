import "../css/Footer.css";

const Footer = ({ onProfileChange, activeProfile }) => {
  return (
    <footer>
      <button
        className={`florian ${activeProfile === "florian" ? "active" : ""}`}
        onClick={() => onProfileChange("florian")}
      >
        Florian
      </button>
      <button
        className={`julien ${activeProfile === "julien" ? "active" : ""}`}
        onClick={() => onProfileChange("julien")}
      >
        Julien
      </button>
    </footer>
  );
};

export default Footer;
