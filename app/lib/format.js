// Pure display helpers. No React in here.

export function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

export function getSenderName(sender, senderName) {
  if (senderName) {
    return senderName;
  }

  if (!sender) {
    return "Unknown sender";
  }

  const local = sender.split("@")[0];

  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function getPreview(message) {
  const body =
    message.bodyText ||
    message.body_text ||
    message.bodyHtml ||
    message.body_html ||
    "";

  return String(body)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

export function getInitial(value) {
  return (
    String(value || "F")
      .trim()
      .charAt(0)
      .toUpperCase() || "F"
  );
}

export function formatFileSize(bytes) {
  if (bytes === undefined || bytes === null) return "";

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** "1 message" / "3 messages" */
export function countLabel(count) {
  return `${count} message${count === 1 ? "" : "s"}`;
}
