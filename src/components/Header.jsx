const Header = ({ username, onProfileClick, activeMode }) => {
  const initials = (username || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header>
      <span className="header__logo">Gym Tracker</span>
      <button
        className={`header__avatar ${activeMode === "profil" ? "header__avatar--active" : ""}`}
        onClick={onProfileClick}
        aria-label="Ouvrir le profil"
      >
        {initials}
      </button>
    </header>
  );
};

export default Header;
