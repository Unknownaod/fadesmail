import Icon from "./Icon";
import SenderAvatar from "./SenderAvatar";
import VerifiedBadge from "./VerifiedBadge";
import { formatDate, formatFileSize, getSenderName } from "../lib/format";
import { getSenderDomain } from "../lib/avatar";
import { normalizeRecipient } from "../lib/recipients";
import { buildForward, buildReply, buildReplyAll } from "../lib/reply";

// The open-message screen: toolbar, header, body, attachments, reply buttons.
export default function MessageView({
  message,
  mailbox,
  folderName,
  resolvedActiveFolder,
  actionLoading,
  onBack,
  onToggleStar,
  onToggleRead,
  onArchive,
  onSpam,
  onNotSpam,
  onTrash,
  onCompose,
}) {
  const inTrash = resolvedActiveFolder === "trash";
  const htmlBody = message.bodyHtml || message.body_html;
  const attachments = Array.isArray(message.attachments)
    ? message.attachments
    : [];

  // Set by the API when the sender's logo came from a verified BIMI record.
  const isBimiVerified =
    (message.senderAvatarSource || message.sender_avatar_source) === "bimi";

  return (
    <article className="message-view">
      <div className="message-toolbar">
        <button
          className="toolbar-button toolbar-back"
          type="button"
          onClick={onBack}
        >
          <Icon name="arrowLeft" size={18} />

          <span>Back to {folderName || "mail"}</span>
        </button>

        <div className="toolbar-spacer" />

        <button
          className={`toolbar-icon ${message.isStarred ? "is-starred" : ""}`}
          type="button"
          onClick={() => onToggleStar(message)}
          title="Star"
        >
          <Icon name="star" size={18} />
        </button>

        <button
          className="toolbar-icon"
          type="button"
          onClick={() => onToggleRead(message)}
          title={message.isRead ? "Mark as unread" : "Mark as read"}
          disabled={actionLoading}
        >
          <Icon name={message.isRead ? "mail" : "check"} size={18} />
        </button>

        <button
          className="toolbar-icon"
          type="button"
          onClick={() => onArchive(message)}
          title="Archive"
          disabled={actionLoading}
        >
          <Icon name="archive" size={18} />
        </button>

        {resolvedActiveFolder === "spam" ? (
          <button
            className="toolbar-icon"
            type="button"
            onClick={() => onNotSpam(message)}
            title="Not spam"
            disabled={actionLoading}
          >
            <Icon name="inboxAction" size={18} />
          </button>
        ) : (
          <button
            className="toolbar-icon spam"
            type="button"
            onClick={() => onSpam(message)}
            title="Report spam"
            disabled={actionLoading}
          >
            <Icon name="ban" size={18} />
          </button>
        )}

        <button
          className="toolbar-icon danger"
          type="button"
          onClick={() => onTrash(message)}
          title={inTrash ? "Delete permanently" : "Delete"}
          disabled={actionLoading}
        >
          <Icon name="trash" size={18} />
        </button>
      </div>

      <div className="message-paper">
        <div className="message-header">
          <div className="message-title-row">
            <div>
              <div className="message-kicker">{folderName || "Message"}</div>

              <h1>{message.subject || "(No subject)"}</h1>
            </div>
          </div>

          <div className="message-meta">
            {/* Verified BIMI logo / Gravatar -> company favicon -> initial */}
            <SenderAvatar message={message} size={36} />

            <div className="sender-details">
              <strong>
                {getSenderName(message.sender, message.senderName)}

                {isBimiVerified && (
                  <VerifiedBadge domain={getSenderDomain(message.sender)} />
                )}
              </strong>

              <span>{message.sender}</span>

              <span className="recipient-line">
                To{" "}
                {Array.isArray(message.recipients)
                  ? message.recipients.map(normalizeRecipient).join(", ")
                  : "you"}
              </span>

              {Array.isArray(message.cc) && message.cc.length > 0 && (
                <span className="recipient-line">
                  Cc {message.cc.map(normalizeRecipient).join(", ")}
                </span>
              )}
            </div>

            <time>
              {formatDate(
                message.receivedAt ||
                  message.received_at ||
                  message.createdAt ||
                  message.created_at
              )}
            </time>
          </div>
        </div>

        <div className="message-body">
          {htmlBody ? (
            <div dangerouslySetInnerHTML={{ __html: htmlBody }} />
          ) : (
            <div className="plain-body">
              {message.bodyText || message.body_text || ""}
            </div>
          )}
        </div>

        {attachments.length > 0 && (
          <div className="message-attachments">
            <span className="message-attachments-label">Attachments</span>

            <div className="message-attachments-list">
              {attachments.map((attachment, index) => (
                <a
                  key={attachment.id || `${attachment.name}-${index}`}
                  className="message-attachment"
                  href={attachment.url || attachment.data || "#"}
                  download={attachment.name}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon name="attachment" size={15} />

                  <span>{attachment.name || "Attachment"}</span>

                  {attachment.size ? (
                    <em>{formatFileSize(attachment.size)}</em>
                  ) : null}
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="message-reply">
          <button type="button" onClick={() => onCompose(buildReply(message))}>
            <Icon name="reply" size={17} />

            Reply
          </button>

          <button
            type="button"
            onClick={() => onCompose(buildReplyAll(message, mailbox?.email))}
          >
            <Icon name="replyAll" size={17} />

            Reply all
          </button>

          <button
            type="button"
            onClick={() => onCompose(buildForward(message))}
          >
            <Icon name="forward" size={17} />

            Forward
          </button>

          <button type="button" onClick={() => onToggleRead(message)}>
            <Icon name={message.isRead ? "mail" : "check"} size={17} />

            {message.isRead ? "Mark unread" : "Mark read"}
          </button>
        </div>
      </div>
    </article>
  );
}
