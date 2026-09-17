"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_MAIL_API_URL ||
  "https://mail-api.fades.lol";

const SYSTEM_FOLDERS = [
  { type: "inbox", name: "Inbox", icon: "⌂" },
  { type: "starred", name: "Starred", icon: "★" },
  { type: "sent", name: "Sent", icon: "↗" },
  { type: "drafts", name: "Drafts", icon: "□" },
  { type: "archive", name: "Archive", icon: "▣" },
  { type: "spam", name: "Spam", icon: "!" },
  { type: "trash", name: "Trash", icon: "♲" },
];

function formatDate(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

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

function getSenderName(sender, senderName) {
  if (senderName) return senderName;

  if (!sender) return "Unknown sender";

  const local = sender.split("@")[0];

  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getPreview(message) {
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
    .slice(0, 140);
}

export default function Home() {
  const [mailboxes, setMailboxes] = useState([]);
  const [mailbox, setMailbox] = useState(null);

  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState("inbox");

  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);

  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  const currentFolder = useMemo(() => {
    return (
      folders.find((folder) => folder.type === activeFolder) ||
      SYSTEM_FOLDERS.find((folder) => folder.type === activeFolder)
    );
  }, [folders, activeFolder]);

  const loadMailboxes = useCallback(async () => {
    try {
      setError("");

      const response = await fetch(
        `${API_URL}/mail/mailboxes`
      );

      if (!response.ok) {
        throw new Error(
          `Mailbox request failed (${response.status})`
        );
      }

      const data = await response.json();

      const items = Array.isArray(data)
        ? data
        : data.mailboxes || [];

      setMailboxes(items);

      if (items.length > 0) {
        setMailbox(items[0]);
      }
    } catch (err) {
      console.error(err);
      setError(
        "Unable to connect to Fades Mail. Make sure the mail API is online."
      );
    }
  }, []);

  const loadFolders = useCallback(async () => {
    if (!mailbox?.id) return;

    try {
      const response = await fetch(
        `${API_URL}/mail/folders?mailboxId=${mailbox.id}`
      );

      if (!response.ok) {
        throw new Error(
          `Folder request failed (${response.status})`
        );
      }

      const data = await response.json();

      const items = Array.isArray(data)
        ? data
        : data.folders || [];

      setFolders(items);
    } catch (err) {
      console.error(err);
    }
  }, [mailbox]);

  const loadMessages = useCallback(async () => {
    if (!mailbox?.id) return;

    setMessagesLoading(true);

    try {
      const params = new URLSearchParams();

      params.set("mailboxId", mailbox.id);

      if (activeFolder === "starred") {
        params.set("starred", "true");
      } else if (activeFolder) {
        params.set("folder", activeFolder);
      }

      if (search.trim()) {
        params.set("search", search.trim());
      }

      params.set("limit", "100");
      params.set("offset", "0");

      const response = await fetch(
        `${API_URL}/mail/messages?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(
          `Message request failed (${response.status})`
        );
      }

      const data = await response.json();

      const items = Array.isArray(data)
        ? data
        : data.messages || [];

      setMessages(items);
    } catch (err) {
      console.error(err);
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [mailbox, activeFolder, search]);

  useEffect(() => {
    loadMailboxes();
  }, [loadMailboxes]);

  useEffect(() => {
    if (!mailbox) return;

    loadFolders();
  }, [mailbox, loadFolders]);

  useEffect(() => {
    if (!mailbox) return;

    loadMessages();
  }, [mailbox, loadMessages]);

  async function openMessage(message) {
    if (!mailbox?.id) return;

    try {
      const response = await fetch(
        `${API_URL}/mail/messages/${message.id}?mailboxId=${mailbox.id}`
      );

      if (!response.ok) {
        throw new Error(
          `Message request failed (${response.status})`
        );
      }

      const data = await response.json();

      setSelectedMessage(data.message || data);

      if (!message.isRead) {
        await fetch(
          `${API_URL}/mail/messages/${message.id}/read`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              mailboxId: mailbox.id,
            }),
          }
        );

        loadMessages();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function toggleStar(message) {
    if (!mailbox?.id) return;

    const endpoint = message.isStarred
      ? "unstar"
      : "star";

    try {
      await fetch(
        `${API_URL}/mail/messages/${message.id}/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mailboxId: mailbox.id,
          }),
        }
      );

      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? {
                ...item,
                isStarred: !message.isStarred,
              }
            : item
        )
      );

      if (selectedMessage?.id === message.id) {
        setSelectedMessage((current) => ({
          ...current,
          isStarred: !message.isStarred,
        }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function moveMessage(message, folder) {
    if (!mailbox?.id) return;

    try {
      await fetch(
        `${API_URL}/mail/messages/${message.id}/move`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mailboxId: mailbox.id,
            folder,
          }),
        }
      );

      setSelectedMessage(null);
      await loadMessages();
      await loadFolders();
    } catch (err) {
      console.error(err);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();

    if (!mailbox?.id) return;

    if (!composeTo.trim()) return;

    setSending(true);

    try {
      const recipients = composeTo
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);

      const response = await fetch(
        `${API_URL}/mail/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mailboxId: mailbox.id,
            sender: mailbox.email,
            recipients,
            subject: composeSubject,
            bodyText: composeBody,
            folder: "sent",
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => null);

        throw new Error(
          data?.message ||
            `Send failed (${response.status})`
        );
      }

      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      setComposeOpen(false);

      if (activeFolder === "sent") {
        await loadMessages();
      }
    } catch (err) {
      console.error(err);
      alert(err.message || "Unable to send message.");
    } finally {
      setSending(false);
    }
  }

  function selectFolder(type) {
    setSelectedMessage(null);
    setSearch("");
    setActiveFolder(type);
    setSidebarOpen(false);
  }

  function closeMessage() {
    setSelectedMessage(null);
  }

  const unreadCount = folders.reduce(
    (total, folder) =>
      total + Number(folder.unreadCount || 0),
    0
  );

  return (
    <main className="mail-app">
      <header className="topbar">
        <button
          className="mobile-menu"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>

        <div className="brand">
          <div className="brand-mark">F</div>
          <span>Fades Mail</span>
        </div>

        <div className="search-box">
          <span className="search-icon">⌕</span>

          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search mail"
          />

          {search && (
            <button
              className="clear-search"
              onClick={() => setSearch("")}
            >
              ×
            </button>
          )}
        </div>

        <div className="top-actions">
          <button
            className="icon-button"
            title="Refresh"
            onClick={() => {
              loadFolders();
              loadMessages();
            }}
          >
            ↻
          </button>

          <div className="account">
            <div className="avatar">
              {mailbox?.email?.[0]?.toUpperCase() || "F"}
            </div>

            <div className="account-info">
              <strong>
                {mailbox?.email || "Fades Mail"}
              </strong>
              <span>Fades Mail</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mail-layout">
        <aside
          className={`sidebar ${
            sidebarOpen ? "sidebar-open" : ""
          }`}
        >
          <div className="sidebar-header">
            <button
              className="compose-button"
              onClick={() => {
                setComposeOpen(true);
                setSidebarOpen(false);
              }}
            >
              <span>＋</span>
              Compose
            </button>

            <button
              className="close-sidebar"
              onClick={() => setSidebarOpen(false)}
            >
              ×
            </button>
          </div>

          <nav className="folder-nav">
            {SYSTEM_FOLDERS.map((folder) => {
              const databaseFolder = folders.find(
                (item) => item.type === folder.type
              );

              const unread = Number(
                databaseFolder?.unreadCount || 0
              );

              return (
                <button
                  key={folder.type}
                  className={`folder-button ${
                    activeFolder === folder.type
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    selectFolder(folder.type)
                  }
                >
                  <span className="folder-icon">
                    {folder.icon}
                  </span>

                  <span className="folder-name">
                    {folder.name}
                  </span>

                  {unread > 0 && (
                    <span className="unread-count">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {folders.filter(
            (folder) => folder.type === "custom"
          ).length > 0 && (
            <div className="custom-folders">
              <div className="section-label">
                Folders
              </div>

              {folders
                .filter(
                  (folder) => folder.type === "custom"
                )
                .map((folder) => (
                  <button
                    key={folder.id}
                    className={`folder-button ${
                      activeFolder === folder.type &&
                      currentFolder?.id === folder.id
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setActiveFolder(folder.type)
                    }
                  >
                    <span className="folder-icon">
                      ▫
                    </span>

                    <span className="folder-name">
                      {folder.name}
                    </span>
                  </button>
                ))}
            </div>
          )}

          <div className="sidebar-bottom">
            <div className="storage-label">
              <span>Fades Mail</span>
              <span>Online</span>
            </div>

            <div className="storage-bar">
              <span />
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <button
            className="sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          />
        )}

        <section className="mail-content">
          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}

          {selectedMessage ? (
            <article className="message-view">
              <div className="message-toolbar">
                <button
                  className="toolbar-button"
                  onClick={closeMessage}
                >
                  ←
                  <span>Back</span>
                </button>

                <div className="toolbar-spacer" />

                <button
                  className="toolbar-button"
                  onClick={() =>
                    toggleStar(selectedMessage)
                  }
                >
                  <span
                    className={
                      selectedMessage.isStarred
                        ? "star active-star"
                        : "star"
                    }
                  >
                    ★
                  </span>
                </button>

                <button
                  className="toolbar-button"
                  onClick={() =>
                    moveMessage(
                      selectedMessage,
                      "archive"
                    )
                  }
                >
                  ▣
                </button>

                <button
                  className="toolbar-button danger"
                  onClick={() =>
                    moveMessage(
                      selectedMessage,
                      "trash"
                    )
                  }
                >
                  ♲
                </button>
              </div>

              <div className="message-header">
                <h1>
                  {selectedMessage.subject ||
                    "(No subject)"}
                </h1>

                <div className="message-meta">
                  <div className="sender-avatar">
                    {getSenderName(
                      selectedMessage.sender,
                      selectedMessage.senderName
                    )[0]?.toUpperCase() || "?"}
                  </div>

                  <div className="sender-details">
                    <strong>
                      {getSenderName(
                        selectedMessage.sender,
                        selectedMessage.senderName
                      )}
                    </strong>

                    <span>
                      {selectedMessage.sender}
                    </span>

                    <span>
                      To:{" "}
                      {Array.isArray(
                        selectedMessage.recipients
                      )
                        ? selectedMessage.recipients
                            .map((recipient) =>
                              typeof recipient ===
                              "string"
                                ? recipient
                                : recipient.address
                            )
                            .join(", ")
                        : "you"}
                    </span>
                  </div>

                  <time>
                    {formatDate(
                      selectedMessage.receivedAt ||
                        selectedMessage.received_at
                    )}
                  </time>
                </div>
              </div>

              <div className="message-body">
                {selectedMessage.bodyHtml ||
                selectedMessage.body_html ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html:
                        selectedMessage.bodyHtml ||
                        selectedMessage.body_html,
                    }}
                  />
                ) : (
                  <div className="plain-body">
                    {selectedMessage.bodyText ||
                      selectedMessage.body_text ||
                      ""}
                  </div>
                )}
              </div>

              <div className="message-reply">
                <button
                  onClick={() => {
                    setComposeTo(
                      selectedMessage.sender || ""
                    );
                    setComposeSubject(
                      `Re: ${
                        selectedMessage.subject || ""
                      }`
                    );
                    setComposeOpen(true);
                  }}
                >
                  ↩ Reply
                </button>

                <button
                  onClick={() => {
                    setComposeTo(
                      selectedMessage.sender || ""
                    );
                    setComposeSubject(
                      `Fwd: ${
                        selectedMessage.subject || ""
                      }`
                    );
                    setComposeOpen(true);
                  }}
                >
                  ↪ Forward
                </button>
              </div>
            </article>
          ) : (
            <>
              <div className="content-header">
                <div>
                  <div className="breadcrumb">
                    Mailbox
                  </div>

                  <h1>
                    {currentFolder?.name ||
                      activeFolder}
                  </h1>
                </div>

                <div className="content-actions">
                  <span>
                    {messages.length}{" "}
                    {messages.length === 1
                      ? "message"
                      : "messages"}
                  </span>
                </div>
              </div>

              <div className="message-list">
                {messagesLoading ? (
                  <div className="empty-state">
                    <div className="spinner" />
                    <p>Loading mail...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">
                      ✉
                    </div>

                    <h2>
                      {search
                        ? "No matching mail"
                        : "Your inbox is empty"}
                    </h2>

                    <p>
                      {search
                        ? "Try a different search."
                        : "Messages sent to your Fades Mail address will appear here."}
                    </p>

                    {!search &&
                      activeFolder === "inbox" && (
                        <button
                          className="empty-compose"
                          onClick={() =>
                            setComposeOpen(true)
                          }
                        >
                          Compose a message
                        </button>
                      )}
                  </div>
                ) : (
                  messages.map((message) => {
                    const sender = getSenderName(
                      message.sender,
                      message.senderName
                    );

                    const receivedAt =
                      message.receivedAt ||
                      message.received_at;

                    return (
                      <button
                        key={message.id}
                        className={`message-row ${
                          message.isRead
                            ? ""
                            : "unread"
                        }`}
                        onClick={() =>
                          openMessage(message)
                        }
                      >
                        <div className="row-avatar">
                          {sender[0]?.toUpperCase() ||
                            "?"}
                        </div>

                        <div className="row-main">
                          <div className="row-top">
                            <strong>{sender}</strong>

                            <span className="row-date">
                              {formatDate(receivedAt)}
                            </span>
                          </div>

                          <div className="row-subject">
                            {message.subject ||
                              "(No subject)"}
                          </div>

                          <div className="row-preview">
                            {getPreview(message)}
                          </div>
                        </div>

                        <button
                          className={`row-star ${
                            message.isStarred
                              ? "starred"
                              : ""
                          }`}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleStar(message);
                          }}
                          aria-label="Star message"
                        >
                          ★
                        </button>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {composeOpen && (
        <div
          className="compose-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setComposeOpen(false);
            }
          }}
        >
          <form
            className="compose-window"
            onSubmit={sendMessage}
          >
            <div className="compose-header">
              <div>
                <strong>New message</strong>
                <span>
                  {mailbox?.email || ""}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  setComposeOpen(false)
                }
              >
                ×
              </button>
            </div>

            <div className="compose-fields">
              <input
                value={composeTo}
                onChange={(event) =>
                  setComposeTo(event.target.value)
                }
                placeholder="Recipients"
                required
              />

              <input
                value={composeSubject}
                onChange={(event) =>
                  setComposeSubject(
                    event.target.value
                  )
                }
                placeholder="Subject"
              />

              <textarea
                value={composeBody}
                onChange={(event) =>
                  setComposeBody(event.target.value)
                }
                placeholder="Write your message..."
              />
            </div>

            <div className="compose-footer">
              <span>
                Separate multiple recipients with
                commas.
              </span>

              <button
                className="send-button"
                type="submit"
                disabled={sending}
              >
                {sending ? "Sending..." : "Send"}
                <span>↗</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}


### `app/globals.css`

css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

:root {
  --bg: #0d0e10;
  --surface: #131518;
  --surface-2: #181a1e;
  --surface-3: #1d2025;
  --border: #292c31;
  --border-light: #34383f;

  --text: #f4f4f5;
  --text-secondary: #a5a8ae;
  --text-muted: #6f737b;

  --accent: #d6a85c;
  --accent-hover: #e3b86d;

  --danger: #e06b6b;

  --radius: 12px;
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  min-height: 100%;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

button,
input,
textarea {
  font: inherit;
}

button {
  border: 0;
}

button:focus-visible,
input:focus-visible,
textarea:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.mail-app {
  min-height: 100vh;
  background: var(--bg);
}

/* TOP BAR */

.topbar {
  height: 70px;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 24px;
  border-bottom: 1px solid var(--border);
  background: rgba(13, 14, 16, 0.96);
  position: sticky;
  top: 0;
  z-index: 50;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 205px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.brand-mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: var(--accent);
  color: #111;
  font-weight: 800;
  box-shadow: 0 4px 18px rgba(214, 168, 92, 0.18);
}

.search-box {
  height: 42px;
  flex: 1;
  max-width: 680px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 13px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
}

.search-icon {
  color: var(--text-muted);
  font-size: 22px;
  line-height: 1;
}

.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 14px;
}

.search-box input::placeholder {
  color: var(--text-muted);
}

.clear-search {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}

.clear-search:hover {
  background: var(--surface-3);
  color: var(--text);
}

.top-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 13px;
}

.icon-button {
  width: 38px;
  height: 38px;
  border-radius: 9px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 20px;
}

.icon-button:hover {
  background: var(--surface-2);
  color: var(--text);
}

.account {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar,
.row-avatar,
.sender-avatar {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--surface-3);
  border: 1px solid var(--border-light);
  color: var(--accent);
  font-weight: 700;
}

.avatar {
  width: 36px;
  height: 36px;
  font-size: 13px;
}

.account-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.account-info strong {
  font-size: 12px;
  color: var(--text);
}

.account-info span {
  font-size: 11px;
  color: var(--text-muted);
}

/* LAYOUT */

.mail-layout {
  display: flex;
  min-height: calc(100vh - 70px);
}

.sidebar {
  width: 245px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  padding: 20px 12px;
  border-right: 1px solid var(--border);
  background: #101113;
}

.sidebar-header {
  margin-bottom: 20px;
}

.compose-button {
  width: 100%;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border-radius: 10px;
  background: var(--accent);
  color: #111;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background 0.15s ease,
    transform 0.15s ease;
}

.compose-button:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.compose-button span {
  font-size: 18px;
}

.folder-nav {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.folder-button {
  width: 100%;
  height: 40px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  text-align: left;
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease;
}

.folder-button:hover {
  background: var(--surface-2);
  color: var(--text);
}

.folder-button.active {
  background: rgba(214, 168, 92, 0.11);
  color: var(--accent);
}

.folder-icon {
  width: 19px;
  color: inherit;
  text-align: center;
  font-size: 15px;
}

.folder-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
}

.unread-count {
  min-width: 20px;
  padding: 2px 5px;
  border-radius: 10px;
  background: var(--surface-3);
  color: var(--text-secondary);
  font-size: 10px;
  text-align: center;
}

.custom-folders {
  margin-top: 25px;
}

.section-label {
  padding: 0 12px 9px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.sidebar-bottom {
  margin-top: auto;
  padding: 14px 10px 4px;
}

.storage-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--text-muted);
  font-size: 10px;
}

.storage-label span:last-child {
  color: #7da47d;
}

.storage-bar {
  height: 3px;
  overflow: hidden;
  border-radius: 5px;
  background: var(--surface-3);
}

.storage-bar span {
  display: block;
  width: 12%;
  height: 100%;
  background: var(--accent);
}

.mail-content {
  min-width: 0;
  flex: 1;
  background: var(--bg);
}

/* CONTENT HEADER */

.content-header {
  min-height: 105px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  border-bottom: 1px solid var(--border);
}

.breadcrumb {
  margin-bottom: 5px;
  color: var(--text-muted);
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.09em;
}

.content-header h1 {
  margin: 0;
  font-size: 25px;
  letter-spacing: -0.035em;
}

.content-actions {
  color: var(--text-muted);
  font-size: 12px;
}

/* MESSAGE LIST */

.message-list {
  width: 100%;
}

.message-row {
  width: 100%;
  min-height: 76px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 13px 28px;
  border-bottom: 1px solid var(--border);
  background: transparent;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: background 0.12s ease;
}

.message-row:hover {
  background: var(--surface);
}

.message-row.unread {
  background: rgba(255, 255, 255, 0.018);
}

.message-row.unread .row-top strong,
.message-row.unread .row-subject {
  color: var(--text);
  font-weight: 700;
}

.row-avatar {
  width: 38px;
  height: 38px;
  font-size: 12px;
}

.row-main {
  min-width: 0;
  flex: 1;
}

.row-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.row-top strong {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-date {
  flex-shrink: 0;
  color: var(--text-muted);
  font-size: 10px;
}

.row-subject {
  overflow: hidden;
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-preview {
  overflow: hidden;
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-star {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 7px;
  background: transparent;
  color: #484c53;
  cursor: pointer;
  font-size: 16px;
}

.row-star:hover,
.row-star.starred {
  color: var(--accent);
}

/* EMPTY */

.empty-state {
  min-height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  text-align: center;
}

.empty-icon {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  margin-bottom: 18px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  color: var(--accent);
  font-size: 23px;
}

.empty-state h2 {
  margin: 0 0 8px;
  font-size: 17px;
}

.empty-state p {
  max-width: 390px;
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.6;
}

.empty-compose {
  margin-top: 20px;
  padding: 9px 15px;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  font-size: 12px;
}

.empty-compose:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.spinner {
  width: 25px;
  height: 25px;
  margin-bottom: 13px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ERROR */

.error-banner {
  margin: 18px 28px 0;
  padding: 12px 14px;
  border: 1px solid rgba(224, 107, 107, 0.3);
  border-radius: 9px;
  background: rgba(224, 107, 107, 0.08);
  color: #e9a0a0;
  font-size: 12px;
}

/* MESSAGE VIEW */

.message-view {
  min-height: calc(100vh - 70px);
}

.message-toolbar {
  height: 62px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 25px;
  border-bottom: 1px solid var(--border);
}

.toolbar-spacer {
  flex: 1;
}

.toolbar-button {
  min-width: 38px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 10px;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
}

.toolbar-button:hover {
  background: var(--surface-2);
  color: var(--text);
}

.toolbar-button.danger:hover {
  color: var(--danger);
}

.star {
  color: #484c53;
  font-size: 17px;
}

.active-star {
  color: var(--accent);
}

.message-header {
  padding: 35px 42px 28px;
  border-bottom: 1px solid var(--border);
}

.message-header h1 {
  margin: 0 0 26px;
  font-size: 26px;
  line-height: 1.3;
  letter-spacing: -0.035em;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 13px;
}

.sender-avatar {
  width: 42px;
  height: 42px;
  font-size: 13px;
}

.sender-details {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.sender-details strong {
  font-size: 13px;
}

.sender-details span {
  color: var(--text-muted);
  font-size: 11px;
}

.message-meta time {
  margin-left: auto;
  color: var(--text-muted);
  font-size: 11px;
}

.message-body {
  max-width: 850px;
  padding: 38px 42px;
  color: #d9dadd;
  font-size: 14px;
  line-height: 1.75;
}

.message-body img {
  max-width: 100%;
}

.message-body a {
  color: var(--accent);
}

.plain-body {
  white-space: pre-wrap;
}

.message-reply {
  display: flex;
  gap: 10px;
  padding: 0 42px 42px;
}

.message-reply button {
  padding: 9px 15px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 12px;
}

.message-reply button:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* COMPOSE */

.compose-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  padding: 24px;
  background: rgba(0, 0, 0, 0.45);
}

.compose-window {
  width: min(620px, calc(100vw - 32px));
  min-height: 480px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-light);
  border-radius: 13px;
  background: #111316;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.55);
}

.compose-header {
  min-height: 58px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 0 19px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.compose-header div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.compose-header strong {
  font-size: 13px;
}

.compose-header span {
  color: var(--text-muted);
  font-size: 10px;
}

.compose-header button {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 20px;
}

.compose-header button:hover {
  background: var(--surface-3);
  color: var(--text);
}

.compose-fields {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.compose-fields input {
  height: 48px;
  padding: 0 18px;
  border: 0;
  border-bottom: 1px solid var(--border);
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 12px;
}

.compose-fields input::placeholder {
  color: var(--text-muted);
}

.compose-fields textarea {
  min-height: 300px;
  flex: 1;
  resize: none;
  padding: 18px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  line-height: 1.65;
}

.compose-fields textarea::placeholder {
  color: var(--text-muted);
}

.compose-footer {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px 10px 18px;
  border-top: 1px solid var(--border);
}

.compose-footer > span {
  color: var(--text-muted);
  font-size: 10px;
}

.send-button {
  height: 38px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 15px;
  border-radius: 8px;
  background: var(--accent);
  color: #111;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
}

.send-button:hover {
  background: var(--accent-hover);
}

.send-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

/* MOBILE */

.mobile-menu,
.close-sidebar,
.sidebar-overlay {
  display: none;
}

@media (max-width: 900px) {
  .topbar {
    gap: 12px;
    padding: 0 15px;
  }

  .brand {
    min-width: auto;
  }

  .brand span {
    display: none;
  }

  .mobile-menu {
    width: 36px;
    height: 36px;
    display: grid;
    place-items: center;
    border-radius: 8px;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-size: 18px;
  }

  .mobile-menu:hover {
    background: var(--surface-2);
  }

  .search-box {
    max-width: none;
  }

  .account-info,
  .icon-button {
    display: none;
  }

  .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: -280px;
    z-index: 90;
    width: 265px;
    transition: left 0.2s ease;
    box-shadow: 15px 0 40px rgba(0, 0, 0, 0.35);
  }

  .sidebar.sidebar-open {
    left: 0;
  }

  .close-sidebar {
    position: absolute;
    top: 18px;
    right: 15px;
    display: grid;
    width: 32px;
    height: 32px;
    place-items: center;
    border-radius: 7px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 20px;
  }

  .sidebar-overlay {
    position: fixed;
    inset: 0;
    z-index: 80;
    display: block;
    background: rgba(0, 0, 0, 0.6);
  }

  .content-header {
    padding: 20px;
  }

  .message-row {
    padding: 12px 16px;
  }

  .message-header {
    padding: 28px 20px 22px;
  }

  .message-body {
    padding: 28px 20px;
  }

  .message-reply {
    padding: 0 20px 30px;
  }

  .message-toolbar {
    padding: 0 12px;
  }
}

@media (max-width: 600px) {
  .topbar {
    height: 62px;
  }

  .mail-layout {
    min-height: calc(100vh - 62px);
  }

  .search-box {
    height: 38px;
  }

  .content-header {
    min-height: 88px;
  }

  .content-header h1 {
    font-size: 21px;
  }

  .message-row {
    min-height: 70px;
  }

  .row-avatar {
    width: 34px;
    height: 34px;
  }

  .row-preview {
    max-width: 220px;
  }

  .message-header h1 {
    font-size: 21px;
  }

  .message-meta {
    align-items: flex-start;
  }

  .message-meta time {
    display: none;
  }

  .compose-backdrop {
    align-items: stretch;
    justify-content: stretch;
    padding: 0;
  }

  .compose-window {
    width: 100%;
    min-height: 100%;
    border: 0;
    border-radius: 0;
  }

  .compose-footer > span {
    display: none;
  }

  .compose-footer {
    justify-content: flex-end;
  }
}
