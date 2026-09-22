import {
  Plus, MessageSquare, Image, Search, Brain, Settings, User, X, ChevronDown, CreditCard,
} from "lucide-react";
import { useTranslation } from "../../services/i18n";

function Sidebar({ open, onClose, onNewChat, onNavigate }) {
  const { t } = useTranslation();

  const menuItems = [
    { icon: MessageSquare, label: t("chats"), page: "chat" },
    { icon: Image, label: t("imageStudio"), page: "image" },
    { icon: Search, label: t("researchAI"), page: "research" },
    { icon: Brain, label: t("memory"), page: "memory" },
    { icon: CreditCard, label: t("plans"), page: "plans" },
  ];

  const handleNavigate = (page) => {
    onNavigate?.(page);
    onClose?.();
  };

  return (
    <>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-logo">N</div>
            <div className="brand-text"><strong>N-AI</strong><span>CHAT V2</span></div>
          </div>
          <button className="close-sidebar" onClick={onClose} aria-label="Close" type="button"><X size={19} /></button>
        </div>

        <button className="new-chat" onClick={onNewChat} type="button">
          <Plus size={19} /><span>{t("newChat")}</span>
        </button>

        <nav className="navigation">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button className="nav-item" key={item.page} type="button" onClick={() => handleNavigate(item.page)}>
                <Icon size={18} /><span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item" type="button" onClick={() => handleNavigate("settings")}>
            <Settings size={18} /><span>{t("settings")}</span>
          </button>

          <button className="user-card" type="button" onClick={() => handleNavigate("profile")}>
            <div className="user-avatar"><User size={17} /></div>
            <div className="user-info"><strong>{t("user")}</strong><span>{t("freePlan")}</span></div>
            <ChevronDown size={16} />
          </button>
        </div>
      </aside>

      {open && <div className="mobile-overlay" onClick={onClose} aria-hidden="true" />}
    </>
  );
}

export default Sidebar;
