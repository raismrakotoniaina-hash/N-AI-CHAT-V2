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

function Sidebar({
  open,
  onClose,
  onNewChat,
  onNavigate,
}) {
  const menuItems = [
    {
      icon: MessageSquare,
      label: "Chats",
      page: "chat",
    },
    {
      icon: Image,
      label: "Image Studio",
      page: "image",
    },
    {
      icon: Search,
      label: "Recherche IA",
      page: "research",
    },
    {
      icon: Brain,
      label: "Mémoire",
      page: "memory",
    },
  ];

  const handleNewChat = () => {
    if (onNewChat) {
      onNewChat();
    }
  };

  const handleNavigate = (page) => {
    if (onNavigate) {
      onNavigate(page);
    }

    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      <aside
        className={`sidebar ${
          open ? "open" : ""
        }`}
      >
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-logo">
              N
            </div>

            <div className="brand-text">
              <strong>N-AI</strong>
              <span>CHAT V2</span>
            </div>
          </div>

          <button
            className="close-sidebar"
            onClick={onClose}
            aria-label="Fermer le menu"
            type="button"
          >
            <X size={19} />
          </button>
        </div>

        <button
          className="new-chat"
          onClick={handleNewChat}
          type="button"
        >
          <Plus size={19} />
          <span>
            Nouvelle conversation
          </span>
        </button>

        <nav className="navigation">
          {menuItems.map((item) => {
            const Icon = item.icon;

            return (
              <button
                className="nav-item"
                key={item.label}
                type="button"
                onClick={() =>
                  handleNavigate(item.page)
                }
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button
            className="nav-item"
            type="button"
            onClick={() =>
              handleNavigate("settings")
            }
          >
            <Settings size={18} />
            <span>Paramètres</span>
          </button>

          <button
            className="user-card"
            type="button"
            onClick={() =>
              handleNavigate("profile")
            }
          >
            <div className="user-avatar">
              <User size={17} />
            </div>

            <div className="user-info">
              <strong>
                Utilisateur
              </strong>
              <span>Free Plan</span>
            </div>

            <ChevronDown size={16} />
          </button>
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
