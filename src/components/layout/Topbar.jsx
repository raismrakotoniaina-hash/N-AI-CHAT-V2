import { Menu, Sparkles, User } from "lucide-react";
import { useTranslation } from "../../services/i18n";

function Topbar({ onMenuOpen, onProfileClick }) {
  const { t } = useTranslation();
  return (
    <header className="topbar">
      <button className="menu-button" onClick={onMenuOpen} aria-label="Menu" type="button"><Menu size={21} /></button>
      <div className="mobile-brand"><div className="mini-logo">N</div><strong>N-AI Chat</strong></div>
      <div className="topbar-right">
        <div className="credits"><Sparkles size={15} /><span>20 {t("credits")}</span></div>
        <button className="profile-button" aria-label={t("profile")} type="button" onClick={onProfileClick}><div className="profile-avatar"><User size={15} /></div></button>
      </div>
    </header>
  );
}
export default Topbar;
