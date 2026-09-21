// Helpers for email addresses / recipient objects.

export function normalizeRecipient(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value.trim();
  }

  return (value.address || value.email || value.value || "").trim();
}

export function getRecipientName(recipient) {
  if (!recipient) return "";

  if (typeof recipient === "string") {
    return recipient;
  }

  return (
    recipient.displayName ||
    recipient.name ||
    recipient.username ||
    normalizeRecipient(recipient)
  );
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function uniqueEmails(values) {
  const result = [];
  const seen = new Set();

  for (const value of values || []) {
    const email = normalizeRecipient(value).toLowerCase();

    if (!email || seen.has(email)) {
      continue;
    }

    seen.add(email);
    result.push(email);
  }

  return result;
}
