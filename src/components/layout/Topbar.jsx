import {
  Menu,
  Sparkles,
  User,
} from "lucide-react";

function Topbar({ onMenuOpen, onProfileClick }) {
  return (
    <header className="topbar">
      <button
        className="menu-button"
        onClick={onMenuOpen}
        aria-label="Ouvrir le menu"
        type="button"
      >
        <Menu size={21} />
      </button>

      <div className="mobile-brand">
        <div className="mini-logo">N</div>
        <strong>N-AI Chat</strong>
      </div>

      <div className="topbar-right">
        <div className="credits">
          <Sparkles size={15} />
          <span>20 crédits</span>
        </div>

        <button
          className="profile-button"
          aria-label="Profil utilisateur"
          type="button"
          onClick={onProfileClick}
        >
          <div className="profile-avatar">
            <User size={15} />
          </div>
        </button>
      </div>
    </header>
  );
}

export default Topbar;
