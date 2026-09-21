import Icon from "./Icon";
import { SYSTEM_FOLDERS } from "../lib/config";

export default function Sidebar({
  open,
  mailbox,
  folders,
  unreadCount,
  resolvedActiveFolder,
  activeCustomFolderId,
  onCompose,
  onClose,
  onSelectFolder,
}) {
  const customFolders = folders.filter((folder) => folder.type === "custom");

  return (
    <>
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <button className="compose-button" type="button" onClick={onCompose}>
            <Icon name="plus" size={18} />

            <span>Compose</span>
          </button>

          <button
            className="close-sidebar"
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="mail-summary">
          <div>
            <span className="summary-label">Mailbox</span>

            <strong>{mailbox?.email || "Loading..."}</strong>
          </div>

          {unreadCount > 0 && (
            <span className="summary-count">{unreadCount}</span>
          )}
        </div>

        <nav className="folder-nav">
          <div className="nav-label">Mail</div>

          {SYSTEM_FOLDERS.map((folder) => {
            const databaseFolder = folders.find(
              (item) => item.type === folder.type
            );

            const unread = Number(databaseFolder?.unreadCount || 0);

            const active =
              resolvedActiveFolder === folder.type && !activeCustomFolderId;

            return (
              <button
                key={folder.type}
                type="button"
                className={`folder-button ${active ? "active" : ""}`}
                onClick={() => onSelectFolder(folder.type)}
              >
                <span className="folder-icon">
                  <Icon name={folder.icon} size={17} />
                </span>

                <span className="folder-name">{folder.name}</span>

                {unread > 0 && <span className="unread-count">{unread}</span>}
              </button>
            );
          })}
        </nav>

        {customFolders.length > 0 && (
          <div className="custom-folders">
            <div className="nav-label">Folders</div>

            {customFolders.map((folder) => {
              const active = activeCustomFolderId === String(folder.id);
              const unread = Number(folder.unreadCount || 0);

              return (
                <button
                  key={folder.id}
                  type="button"
                  className={`folder-button ${active ? "active" : ""}`}
                  onClick={() => onSelectFolder("custom", folder.id)}
                >
                  <span className="folder-icon">
                    <Icon name="draft" size={17} />
                  </span>

                  <span className="folder-name">{folder.name}</span>

                  {unread > 0 && <span className="unread-count">{unread}</span>}
                </button>
              );
            })}
          </div>
        )}

        <div className="sidebar-bottom">
          <div className="status-card">
            <div className="status-dot" />

            <div>
              <strong>Fades Mail</strong>

              <span>All systems operational</span>
            </div>
          </div>
        </div>
      </aside>

      {open && (
        <button
          className="sidebar-overlay"
          type="button"
          onClick={onClose}
          aria-label="Close menu"
        />
      )}
    </>
  );
}
