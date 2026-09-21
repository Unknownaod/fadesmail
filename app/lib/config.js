// App-wide constants. Change the API URL / folder list here.

export const API_URL =
  process.env.NEXT_PUBLIC_MAIL_API_URL || "https://mail-api.fades.lol";

export const LOGO_SRC = "/logo.png";

export const SYSTEM_FOLDERS = [
  { type: "inbox", name: "Inbox", icon: "inbox" },
  { type: "starred", name: "Starred", icon: "star" },
  { type: "sent", name: "Sent", icon: "send" },
  { type: "drafts", name: "Drafts", icon: "draft" },
  { type: "archive", name: "Archive", icon: "archive" },
  { type: "spam", name: "Spam", icon: "spam" },
  { type: "trash", name: "Trash", icon: "trash" },
];
