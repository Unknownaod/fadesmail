import Icon from "./Icon";

export default function Toast({ toast, onDismiss }) {
  if (!toast) return null;

  return (
    <div
      className={`mail-toast ${toast.type === "error" ? "error" : "success"}`}
    >
      <span className="mail-toast-icon">
        {toast.type === "error" ? "!" : <Icon name="check" size={15} />}
      </span>

      <span>{toast.message}</span>

      <button type="button" onClick={onDismiss} aria-label="Dismiss notification">
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
