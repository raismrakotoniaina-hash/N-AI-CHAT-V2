import {
  Plus,
  MessageSquare,
  Image,
  Search,
  Brain,
  Settings,
  User,
  X,
  ChevronDown,
} from "lucide-react";

function Sidebar({ open, onClose }) {
  const menuItems = [
    {
      icon: MessageSquare,
      label: "Chats",
    },
    {
      icon: Image,
      label: "Image Studio",
    },
    {
      icon: Search,
      label: "Recherche IA",
    },
    {
      icon: Brain,
      label: "Mémoire",
    },
  ];

  return (
    <>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-logo">N</div>

            <div className="brand-text">
              <strong>N-AI</strong>
              <span>CHAT V2</span>
            </div>
          </div>

          <button
            className="close-sidebar"
            onClick={onClose}
            aria-label="Fermer le menu"
          >
            <X size={19} />
          </button>
        </div>

        <button className="new-chat">
          <Plus size={19} />
          <span>Nouvelle conversation</span>
        </button>

        <nav className="navigation">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button className="nav-item" key={item.label}>
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button className="nav-item">
            <Settings size={18} />
            <span>Paramètres</span>
          </button>

          <div className="user-card">
            <div className="user-avatar">
              <User size={17} />
            </div>

            <div className="user-info">
              <strong>Utilisateur</strong>
              <span>Free Plan</span>
            </div>

            <ChevronDown size={16} />
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="mobile-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
    </>
  );
}

export default Sidebar;
