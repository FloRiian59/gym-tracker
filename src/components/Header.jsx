const Header = () => {
  return (
    <header>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "16px",
          fontWeight: 700,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--accent)",
        }}
      >
        Gym Tracker
      </span>
    </header>
  );
};

export default Header;
