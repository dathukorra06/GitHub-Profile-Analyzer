import { Outlet, Link } from 'react-router-dom';
import { GitGraph, Activity } from 'lucide-react';
import './Layout.css';

const Layout = () => {
  return (
    <div className="layout">
      <header className="glass-panel header">
        <div className="header-container container">
          <Link to="/" className="brand">
            <GitGraph className="brand-icon" size={28} />
            <span className="brand-text text-gradient">Profile Analyzer</span>
          </Link>
          <nav className="nav">
            <Link to="/" className="nav-link">
              <Activity size={20} />
              <span>Analyze</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container">
          <p className="text-secondary">
            Built with React & Vite. Powered by GitHub API.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
