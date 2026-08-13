import { Outlet, NavLink } from 'react-router-dom';

const Layout = () => {
  return (
    <>
      <main className="container main-content-padding" id="app-content">
        <Outlet />
      </main>

      <nav className="bottom-nav" id="bottom-nav" aria-label="Menu principale">
        <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
            <span className="nav-icon" aria-hidden="true">🏠</span>
            <span className="nav-text">Home</span>
        </NavLink>
        <NavLink to="/plants" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon" aria-hidden="true">🪴</span>
            <span className="nav-text">Piante</span>
        </NavLink>
        <NavLink to="/add-plant" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon" aria-hidden="true">➕</span>
            <span className="nav-text">Aggiungi</span>
        </NavLink>
        <NavLink to="/events" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon" aria-hidden="true">📊</span>
            <span className="nav-text">Eventi</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon" aria-hidden="true">⚙️</span>
            <span className="nav-text">Opzioni</span>
        </NavLink>
      </nav>
    </>
  );
};

export default Layout;
