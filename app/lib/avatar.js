// Personal mail providers: a favicon here would put the Gmail logo on every person.
// (Keep in sync with PUBLIC_MAIL_DOMAINS in the server's services/avatar.js.)
const PUBLIC_MAIL_DOMAINS = new Set([
  "gmail.com", "outlook.com", "hotmail.com", "yahoo.com",
  "icloud.com", "proton.me", "protonmail.com", "fades.lol",
]);

export function getSenderDomain(sender) {
  const match = String(sender || "").toLowerCase().match(/@([^@\s>]+)/);
  return match ? match[1] : "";
}

/**
 * Ordered list of image URLs to try for a sender:
 *   1. What the API resolved (uploaded profile picture, verified BIMI logo,
 *      or Gravatar for personal mail)
 *   2. Company favicon looked up by the sender's domain
 * When every candidate fails, the component falls back to the sender's initial.
 */
export function getAvatarCandidates(message) {
  const candidates = [];

  const fromApi =
    message.senderAvatar || message.sender_avatar ||
    message.avatarUrl || message.avatar_url;
  if (fromApi) candidates.push(fromApi);

  const domain = getSenderDomain(message.sender);
  if (domain && !PUBLIC_MAIL_DOMAINS.has(domain)) {
    candidates.push(
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`
    );
  }

  return candidates;
}

// Kept for any existing callers: the first candidate, or "".
export function getAvatarUrl(message) {
  return getAvatarCandidates(message)[0] || "";
}

// True when the API resolved this sender's logo from a verified BIMI record.
export function isBimiVerified(message) {
  return (
    (message.senderAvatarSource || message.sender_avatar_source) === "bimi"
  );
}
