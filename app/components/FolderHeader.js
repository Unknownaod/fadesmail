import Icon from "./Icon";

// Title row above the message list: folder name, unread badge, count, "Empty trash".
export default function FolderHeader({
  mailbox,
  title,
  resolvedActiveFolder,
  unreadCount,
  messageCount,
  actionLoading,
  onEmptyTrash,
}) {
  return (
    <div className="content-header">
      <div>
        <div className="breadcrumb">
          <span className="breadcrumb-dot" />

          {mailbox?.email || "Mailbox"}
        </div>

        <div className="content-title-row">
          <h1>{title}</h1>

          {unreadCount > 0 && resolvedActiveFolder === "inbox" && (
            <span className="title-badge">{unreadCount} unread</span>
          )}
        </div>
      </div>

      <div className="content-actions">
        {resolvedActiveFolder === "trash" && messageCount > 0 && (
          <button
            className="empty-trash-button"
            type="button"
            onClick={onEmptyTrash}
            disabled={actionLoading}
          >
            <Icon name="trash" size={15} />

            Empty trash
          </button>
        )}

        <span className="message-count">{messageCount}</span>

        <span>{messageCount === 1 ? "message" : "messages"}</span>
      </div>
    </div>
  );
}
