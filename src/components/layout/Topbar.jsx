import {
  Menu,
  Sparkles,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getAccount } from "../../services/accountService.js";

function Topbar({ onMenuOpen, onProfileClick }) {
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    getAccount(1)
      .then((data) => {
        if (data?.success) {
          setCredits(data.account.credits);
        }
      })
      .catch(() => {});
  }, []);

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
          <span>{credits} crédits</span>
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
