import "../css/Header.css";
import logo from "../../public/assets/Logo.png";
const Header = () => {
  return (
    <header>
      <img className="logo" src={logo} alt="logo app" />
      <h1>Gym Tracker</h1>
    </header>
  );
};

export default Header;
