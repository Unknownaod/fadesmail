import Icon from "./Icon";
import RecipientField from "./RecipientField";
import ComposeAttachments from "./ComposeAttachments";

// The "New message" modal. `compose` is the object returned by useCompose().
export default function ComposeWindow({ compose, mailbox }) {
  const {
    closeComposer,
    sendMessage,
    sending,
    showCc,
    showBcc,
    composeSubject,
    setComposeSubject,
    composeBody,
    setComposeBody,
    recipientChips,
    attachments,
    attachmentsLoading,
    attachmentInputRef,
    handleAttachmentChange,
    removeAttachment,
  } = compose;

  return (
    <div
      className="compose-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closeComposer();
        }
      }}
    >
      <form className="compose-window" onSubmit={sendMessage}>
        <div className="compose-header">
          <div>
            <span className="compose-kicker">FADES MAIL</span>

            <strong>New message</strong>

            <span className="compose-account">
              Sending from {mailbox?.email || ""}
            </span>
          </div>

          <button
            type="button"
            onClick={closeComposer}
            aria-label="Close composer"
            disabled={sending}
          >
            <Icon name="close" size={19} />
          </button>
        </div>

        <div className="compose-fields">
          <RecipientField type="to" compose={compose} />

          {showCc && <RecipientField type="cc" compose={compose} />}

          {showBcc && <RecipientField type="bcc" compose={compose} />}

          <div className="compose-field">
            <span>Subject</span>

            <input
              value={composeSubject}
              onChange={(event) => setComposeSubject(event.target.value)}
              placeholder="Subject"
            />
          </div>

          <textarea
            value={composeBody}
            onChange={(event) => setComposeBody(event.target.value)}
            placeholder="Write your message..."
          />

          <ComposeAttachments
            attachments={attachments}
            attachmentsLoading={attachmentsLoading}
            attachmentInputRef={attachmentInputRef}
            onChange={handleAttachmentChange}
            onRemove={removeAttachment}
          />
        </div>

        <div className="compose-footer">
          <span>
            Enter or comma adds a recipient. Use ↑/↓ to navigate suggestions.
          </span>

          <button
            className="send-button"
            type="submit"
            disabled={sending || recipientChips.length === 0}
          >
            {sending ? "Sending..." : "Send"}

            <Icon name="send" size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
