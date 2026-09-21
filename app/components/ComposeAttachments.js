import Icon from "./Icon";
import { formatFileSize } from "../lib/format";

export default function ComposeAttachments({
  attachments,
  attachmentsLoading,
  attachmentInputRef,
  onChange,
  onRemove,
}) {
  return (
    <div className="compose-attachments">
      <input
        ref={attachmentInputRef}
        type="file"
        multiple
        className="attachment-input"
        onChange={onChange}
        hidden
      />

      <button
        className="attachment-button"
        type="button"
        onClick={() => attachmentInputRef.current?.click()}
        disabled={attachmentsLoading}
      >
        <Icon name="attachment" size={16} />

        <span>{attachmentsLoading ? "Attaching..." : "Add attachment"}</span>
      </button>

      {attachments.length > 0 && (
        <div className="attachment-chip-list">
          {attachments.map((attachment) => (
            <span className="attachment-chip" key={attachment.id}>
              <Icon name="attachment" size={13} />

              <span>{attachment.name}</span>

              <em>{formatFileSize(attachment.size)}</em>

              <button
                type="button"
                onClick={() => onRemove(attachment.id)}
                aria-label={`Remove ${attachment.name}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
