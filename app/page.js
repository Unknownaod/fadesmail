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
