import Icon from "./Icon";

// Appears above the list when one or more rows are ticked.
export default function BulkToolbar({
  selectedCount,
  allVisibleSelected,
  resolvedActiveFolder,
  actionLoading,
  onToggleSelectAll,
  onMarkRead,
  onMove,
  onTrash,
  onClear,
}) {
  const inTrash = resolvedActiveFolder === "trash";

  return (
    <div className="bulk-toolbar">
      <div className="bulk-toolbar-left">
        <button
          className="bulk-select-button"
          type="button"
          onClick={onToggleSelectAll}
          title={allVisibleSelected ? "Clear selection" : "Select all"}
        >
          <span className={`custom-checkbox ${allVisibleSelected ? "checked" : ""}`}>
            {allVisibleSelected && <Icon name="check" size={12} />}
          </span>
        </button>

        <span className="bulk-count">{selectedCount} selected</span>
      </div>

      <div className="bulk-actions">
        <button
          className="bulk-action"
          type="button"
          onClick={onMarkRead}
          disabled={actionLoading}
          title="Mark as read"
        >
          <Icon name="check" size={16} />

          <span>Read</span>
        </button>

        <button
          className="bulk-action"
          type="button"
          onClick={() => onMove("archive")}
          disabled={actionLoading}
          title="Archive"
        >
          <Icon name="archive" size={16} />

          <span>Archive</span>
        </button>

        <button
          className="bulk-action spam"
          type="button"
          onClick={() => onMove("spam")}
          disabled={actionLoading}
          title="Report spam"
        >
          <Icon name="ban" size={16} />

          <span>Spam</span>
        </button>

        <button
          className="bulk-action danger"
          type="button"
          onClick={onTrash}
          disabled={actionLoading}
          title={inTrash ? "Delete permanently" : "Move to trash"}
        >
          <Icon name="trash" size={16} />

          <span>{inTrash ? "Delete forever" : "Delete"}</span>
        </button>

        <button
          className="bulk-action"
          type="button"
          onClick={onClear}
          title="Clear selection"
        >
          <Icon name="close" size={16} />

          <span>Clear</span>
        </button>
      </div>
    </div>
  );
}
