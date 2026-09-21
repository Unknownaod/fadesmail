import Icon from "./Icon";
import SenderAvatar from "./SenderAvatar";
import VerifiedBadge from "./VerifiedBadge";
import { getSenderDomain, isBimiVerified } from "../lib/avatar";
import { formatDate, getPreview, getSenderName } from "../lib/format";

// One row in the message list.
export default function MessageRow({
  message,
  isSelected,
  resolvedActiveFolder,
  onOpen,
  onToggleSelect,
  onToggleStar,
  onToggleRead,
  onSpam,
  onTrash,
}) {
  const sender = getSenderName(message.sender, message.senderName);

  const receivedAt =
    message.receivedAt ||
    message.received_at ||
    message.createdAt ||
    message.created_at;

  const inTrash = resolvedActiveFolder === "trash";

  // Row buttons shouldn't also open the message.
  const stop = (handler) => (event) => {
    event.stopPropagation();
    handler(message);
  };

  return (
    <div
      className={`message-row ${message.isRead ? "" : "unread"} ${
        isSelected ? "selected" : ""
      }`}
      onClick={() => onOpen(message)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(message);
        }
      }}
    >
      <div className="row-select" onClick={(event) => event.stopPropagation()}>
        <input
          className="row-check"
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(message.id)}
          aria-label={`Select message from ${sender}`}
        />
      </div>

      {/* BIMI logo / Gravatar -> company favicon -> initial */}
      <SenderAvatar message={message} size={32} />

      <div className="row-main">
        <div className="row-top">
          <strong>
            {sender}

            {isBimiVerified(message) && (
              <VerifiedBadge
                compact
                domain={getSenderDomain(message.sender)}
              />
            )}
          </strong>

          <span className="row-date">{formatDate(receivedAt)}</span>
        </div>

        <div className="row-subject">{message.subject || "(No subject)"}</div>

        <div className="row-preview">{getPreview(message)}</div>
      </div>

      <div className="row-actions">
        <button
          className={`row-star ${message.isStarred ? "starred" : ""}`}
          type="button"
          onClick={stop(onToggleStar)}
          aria-label="Star message"
        >
          <Icon name="star" size={17} />
        </button>

        <button
          className="row-action"
          type="button"
          onClick={stop(onToggleRead)}
          title={message.isRead ? "Mark unread" : "Mark read"}
          aria-label={message.isRead ? "Mark unread" : "Mark read"}
        >
          <Icon name={message.isRead ? "mail" : "check"} size={16} />
        </button>

        {resolvedActiveFolder !== "spam" && (
          <button
            className="row-action spam"
            type="button"
            onClick={stop(onSpam)}
            title="Report spam"
            aria-label="Report spam"
          >
            <Icon name="ban" size={16} />
          </button>
        )}

        <button
          className="row-action danger"
          type="button"
          onClick={stop(onTrash)}
          title={inTrash ? "Delete permanently" : "Delete"}
          aria-label={inTrash ? "Delete permanently" : "Delete message"}
        >
          <Icon name="trash" size={16} />
        </button>
      </div>

      <div className="row-chevron">
        <Icon name="chevron" size={16} />
      </div>
    </div>
  );
}
