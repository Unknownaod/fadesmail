import Icon from "./Icon";
import Logo from "./Logo";

export default function Topbar({
  search,
  onSearchChange,
  onOpenSidebar,
  onRefresh,
  mailbox,
  user,
  onLogout,
}) {
  return (
    <header className="topbar">
      <button
        className="mobile-menu"
        onClick={onOpenSidebar}
        aria-label="Open menu"
      >
        <Icon name="menu" size={20} />
      </button>

      <div className="brand">
        <Logo size={34} />

        <div className="brand-copy">
          <strong>Fades</strong>

          <span>Mail</span>
        </div>
      </div>

      <div className="search-box">
        <Icon name="search" size={18} />

        <input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search your mail"
        />

        {search && (
          <button
            className="clear-search"
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
          >
            <Icon name="close" size={15} />
          </button>
        )}
      </div>

      <div className="top-actions">
        <button
          className="icon-button"
          type="button"
          title="Refresh"
          aria-label="Refresh"
          onClick={onRefresh}
        >
          <Icon name="refresh" size={18} />
        </button>

        <button
          className="icon-button"
          type="button"
          title="Settings"
          aria-label="Settings"
          onClick={() => {
            window.location.href = "/settings";
          }}
        >
          <Icon name="settings" size={18} />
        </button>

        <div className="account">
          <Logo size={25} />

          <div className="account-info">
            <strong>{mailbox?.email || "Fades Mail"}</strong>

            <span>{user?.username ? `@${user.username}` : "Fades Mail"}</span>
          </div>

          <button
            className="logout-button"
            type="button"
            onClick={onLogout}
            title="Sign out"
          >
            <Icon name="logout" size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}
