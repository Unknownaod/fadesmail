// Personal mail providers: a favicon here would put the Gmail logo on every person.
const PUBLIC_MAIL_DOMAINS = new Set([
  "gmail.com", "outlook.com", "hotmail.com", "yahoo.com",
  "icloud.com", "proton.me", "protonmail.com", "fades.lol",
]);

export function getSenderDomain(sender) {
  const match = String(sender || "").toLowerCase().match(/@([^@\s>]+)/);
  return match ? match[1] : "";
}

export function getAvatarUrl(message) {
  // 1. Whatever your API provides (real profile picture, or a verified BIMI logo)
  const fromApi =
    message.senderAvatar || message.sender_avatar ||
    message.avatarUrl || message.avatar_url;
  if (fromApi) return fromApi;

  // 2. Company icon looked up by the sender's domain
  const domain = getSenderDomain(message.sender);
  if (!domain || PUBLIC_MAIL_DOMAINS.has(domain)) return "";

  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}
