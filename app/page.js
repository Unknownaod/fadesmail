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
  /*
   * ==========================================
   * AUTHENTICATION
   * ==========================================
   */

  const [authLoading, setAuthLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const [authMode, setAuthMode] = useState("signin");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] =
    useState(false);

  /*
   * ==========================================
   * MAILBOX
   * ==========================================
   */

  const [mailbox, setMailbox] = useState(null);

  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] =
    useState("inbox");

  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] =
    useState(null);

  const [messagesLoading, setMessagesLoading] =
    useState(false);

  const [mailError, setMailError] = useState("");

  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  /*
   * ==========================================
   * COMPOSE
   * ==========================================
   */

  const [composeOpen, setComposeOpen] =
    useState(false);

  const [composeTo, setComposeTo] =
    useState("");

  const [composeSubject, setComposeSubject] =
    useState("");

  const [composeBody, setComposeBody] =
    useState("");

  const [sending, setSending] = useState(false);

  /*
   * ==========================================
   * CURRENT FOLDER
   * ==========================================
   */

  const currentFolder = useMemo(() => {
    return (
      folders.find(
        (folder) => folder.type === activeFolder
      ) ||
      SYSTEM_FOLDERS.find(
        (folder) => folder.type === activeFolder
      )
    );
  }, [folders, activeFolder]);

  /*
   * ==========================================
   * CHECK MAIL AUTH
   * ==========================================
   */

  const checkAuth = useCallback(async () => {
    try {
      setAuthLoading(true);

      const response = await fetch(
        `${API_URL}/auth/me`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        setAuthenticated(false);
        setUser(null);
        return;
      }

      const data = await response.json();

      const authenticatedUser =
        data?.user || data?.account || data;

      if (
        !authenticatedUser ||
        authenticatedUser.error
      ) {
        setAuthenticated(false);
        setUser(null);
        return;
      }

      setUser(authenticatedUser);
      setAuthenticated(true);
    } catch (error) {
      console.error(
        "[Fades Mail] Auth check failed:",
        error
      );

      setAuthenticated(false);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  /*
   * ==========================================
   * SIGN IN / SIGN UP
   * ==========================================
   */

  async function submitAuth(event) {
    event.preventDefault();

    setAuthError("");
    setAuthSubmitting(true);

    try {
      const endpoint =
        authMode === "signin"
          ? "/auth/signin"
          : "/auth/signup";

      const body =
        authMode === "signin"
          ? {
              email: email.trim().toLowerCase(),
              password,
            }
          : {
              username:
                username.trim().toLowerCase(),
              email:
                email.trim().toLowerCase(),
              password,
            };

      const response = await fetch(
        `${API_URL}${endpoint}`,
        {
          method: "POST",
          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(body),
        }
      );

      const data = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Authentication failed."
        );
      }

      const authenticatedUser =
        data?.user ||
        data?.account ||
        data;

      setUser(authenticatedUser);
      setAuthenticated(true);

      setPassword("");
      setAuthError("");
    } catch (error) {
      console.error(
        "[Fades Mail] Authentication error:",
        error
      );

      setAuthError(
        error.message ||
          "Unable to authenticate."
      );
    } finally {
      setAuthSubmitting(false);
    }
  }

  /*
   * ==========================================
   * LOGOUT
   * ==========================================
   */

  async function logout() {
    try {
      await fetch(
        `${API_URL}/auth/logout`,
        {
          method: "POST",
          credentials: "include",
        }
      );
    } catch (error) {
      console.error(
        "[Fades Mail] Logout failed:",
        error
      );
    }

    setAuthenticated(false);
    setUser(null);
    setMailbox(null);
    setFolders([]);
    setMessages([]);
    setSelectedMessage(null);
  }

  /*
   * ==========================================
   * LOAD CURRENT USER'S MAILBOX
   * ==========================================
   */

  const loadMailbox = useCallback(async () => {
    try {
      setMailError("");

      const response = await fetch(
        `${API_URL}/mail/me`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setAuthenticated(false);
          setUser(null);
        }

        throw new Error(
          `Mailbox request failed (${response.status})`
        );
      }

      const data = await response.json();

      const currentMailbox =
        data?.mailbox ||
        data;

      if (
        !currentMailbox ||
        !currentMailbox.id
      ) {
        throw new Error(
          "No mailbox is associated with this account."
        );
      }

      setMailbox(currentMailbox);
    } catch (error) {
      console.error(
        "[Fades Mail] Mailbox error:",
        error
      );

      setMailbox(null);

      setMailError(
        error.message ||
          "Unable to load your mailbox."
      );
    }
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    loadMailbox();
  }, [authenticated, loadMailbox]);

  /*
   * ==========================================
   * LOAD FOLDERS
   * ==========================================
   */

  const loadFolders = useCallback(async () => {
    if (!mailbox?.id) return;

    try {
      const response = await fetch(
        `${API_URL}/mail/folders?mailboxId=${mailbox.id}`,
        {
          credentials: "include",
        }
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
    } catch (error) {
      console.error(
        "[Fades Mail] Folder error:",
        error
      );
    }
  }, [mailbox]);

  useEffect(() => {
    if (!mailbox) return;

    loadFolders();
  }, [mailbox, loadFolders]);

  /*
   * ==========================================
   * LOAD MESSAGES
   * ==========================================
   */

  const loadMessages = useCallback(async () => {
    if (!mailbox?.id) return;

    setMessagesLoading(true);

    try {
      const params = new URLSearchParams();

      params.set(
        "mailboxId",
        String(mailbox.id)
      );

      if (activeFolder === "starred") {
        params.set("starred", "true");
      } else if (activeFolder) {
        params.set(
          "folder",
          activeFolder
        );
      }

      if (search.trim()) {
        params.set(
          "search",
          search.trim()
        );
      }

      params.set("limit", "100");
      params.set("offset", "0");

      const response = await fetch(
        `${API_URL}/mail/messages?${params.toString()}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          setAuthenticated(false);
          setUser(null);
        }

        throw new Error(
          `Message request failed (${response.status})`
        );
      }

      const data = await response.json();

      const items = Array.isArray(data)
        ? data
        : data.messages || [];

      setMessages(items);
    } catch (error) {
      console.error(
        "[Fades Mail] Message error:",
        error
      );

      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [
    mailbox,
    activeFolder,
    search,
  ]);

  useEffect(() => {
    if (!mailbox) return;

    loadMessages();
  }, [mailbox, loadMessages]);

  /*
   * ==========================================
   * OPEN MESSAGE
   * ==========================================
   */

  async function openMessage(message) {
    if (!mailbox?.id) return;

    try {
      const response = await fetch(
        `${API_URL}/mail/messages/${message.id}?mailboxId=${mailbox.id}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Message request failed (${response.status})`
        );
      }

      const data = await response.json();

      const openedMessage =
        data?.message || data;

      setSelectedMessage(openedMessage);

      if (!message.isRead) {
        await fetch(
          `${API_URL}/mail/messages/${message.id}/read`,
          {
            method: "POST",
            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              mailboxId: mailbox.id,
            }),
          }
        );

        loadMessages();
        loadFolders();
      }
    } catch (error) {
      console.error(
        "[Fades Mail] Open message error:",
        error
      );
    }
  }

  /*
   * ==========================================
   * STAR MESSAGE
   * ==========================================
   */

  async function toggleStar(message) {
    if (!mailbox?.id) return;

    const endpoint = message.isStarred
      ? "unstar"
      : "star";

    try {
      const response = await fetch(
        `${API_URL}/mail/messages/${message.id}/${endpoint}`,
        {
          method: "POST",
          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            mailboxId: mailbox.id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Star request failed (${response.status})`
        );
      }

      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? {
                ...item,
                isStarred:
                  !message.isStarred,
              }
            : item
        )
      );

      if (
        selectedMessage?.id ===
        message.id
      ) {
        setSelectedMessage((current) => ({
          ...current,
          isStarred:
            !message.isStarred,
        }));
      }

      loadFolders();
    } catch (error) {
      console.error(
        "[Fades Mail] Star error:",
        error
      );
    }
  }

  /*
   * ==========================================
   * MOVE MESSAGE
   * ==========================================
   */

  async function moveMessage(
    message,
    folder
  ) {
    if (!mailbox?.id) return;

    try {
      const response = await fetch(
        `${API_URL}/mail/messages/${message.id}/move`,
        {
          method: "POST",
          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            mailboxId: mailbox.id,
            folder,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Move request failed (${response.status})`
        );
      }

      setSelectedMessage(null);

      await loadMessages();
      await loadFolders();
    } catch (error) {
      console.error(
        "[Fades Mail] Move error:",
        error
      );
    }
  }

  /*
   * ==========================================
   * SEND MESSAGE
   * ==========================================
   */

  async function sendMessage(event) {
    event.preventDefault();

    if (!mailbox?.id) return;

    if (!composeTo.trim()) return;

    setSending(true);

    try {
      const recipients = composeTo
        .split(",")
        .map((email) =>
          email.trim()
        )
        .filter(Boolean);

      const response = await fetch(
        `${API_URL}/mail/messages`,
        {
          method: "POST",
          credentials: "include",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            mailboxId: mailbox.id,
            sender: mailbox.email,
            recipients,
            subject:
              composeSubject,
            bodyText: composeBody,
            folder: "sent",
          }),
        }
      );

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => null);

        throw new Error(
          data?.message ||
            `Send failed (${response.status})`
        );
      }

      setComposeTo("");
      setComposeSubject("");
      setComposeBody("");
      setComposeOpen(false);

      await loadFolders();

      if (activeFolder === "sent") {
        await loadMessages();
      }
    } catch (error) {
      console.error(
        "[Fades Mail] Send error:",
        error
      );

      alert(
        error.message ||
          "Unable to send message."
      );
    } finally {
      setSending(false);
    }
  }

  /*
   * ==========================================
   * FOLDER SELECTION
   * ==========================================
   */

  function selectFolder(type) {
    setSelectedMessage(null);
    setSearch("");
    setActiveFolder(type);
    setSidebarOpen(false);
  }

  function closeMessage() {
    setSelectedMessage(null);
  }

  /*
   * ==========================================
   * UNREAD COUNT
   * ==========================================
   */

  const unreadCount = folders.reduce(
    (total, folder) =>
      total +
      Number(folder.unreadCount || 0),
    0
  );

  /*
   * ==========================================
   * AUTH LOADING SCREEN
   * ==========================================
   */

  if (authLoading) {
    return (
      <main className="auth-page">
        <div className="auth-loading">
          <div className="auth-logo">
            F
          </div>

          <div className="spinner" />

          <p>
            Checking Fades Mail...
          </p>
        </div>
      </main>
    );
  }

  /*
   * ==========================================
   * SIGN IN / SIGN UP SCREEN
   * ==========================================
   */

  if (!authenticated) {
    return (
      <main className="auth-page">
        <div className="auth-container">

          <div className="auth-brand">
            <div className="auth-logo">
              F
            </div>

            <div>
              <strong>
                Fades Mail
              </strong>

              <span>
                Your email. Your mailbox.
              </span>
            </div>
          </div>

          <div className="auth-card">

            <div className="auth-heading">
              <h1>
                {authMode === "signin"
                  ? "Welcome back"
                  : "Create your mailbox"}
              </h1>

              <p>
                {authMode === "signin"
                  ? "Sign in to access your Fades Mail inbox."
                  : "Create your Fades Mail account and get your @fades.lol address."}
              </p>
            </div>

            <form
              className="auth-form"
              onSubmit={submitAuth}
            >

              {authMode === "signup" && (
                <label>
                  Username

                  <input
                    type="text"
                    value={username}
                    onChange={(event) =>
                      setUsername(
                        event.target.value
                      )
                    }
                    placeholder="yourname"
                    autoComplete="username"
                    required
                  />

                  <small>
                    Your email will be
                    {" "}
                    {username
                      ? `${username.toLowerCase()}@fades.lol`
                      : "yourname@fades.lol"}
                  </small>
                </label>
              )}

              <label>
                Email

                <input
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                Password

                <input
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Your password"
                  autoComplete={
                    authMode === "signin"
                      ? "current-password"
                      : "new-password"
                  }
                  required
                />
              </label>

              {authError && (
                <div className="auth-error">
                  {authError}
                </div>
              )}

              <button
                className="auth-submit"
                type="submit"
                disabled={authSubmitting}
              >
                {authSubmitting
                  ? "Please wait..."
                  : authMode === "signin"
                  ? "Sign in"
                  : "Create mailbox"}

                {!authSubmitting && (
                  <span>→</span>
                )}
              </button>
            </form>

            <div className="auth-switch">
              <span>
                {authMode === "signin"
                  ? "Don't have an account?"
                  : "Already have an account?"}
              </span>

              <button
                type="button"
                onClick={() => {
                  setAuthError("");

                  setAuthMode(
                    authMode === "signin"
                      ? "signup"
                      : "signin"
                  );
                }}
              >
                {authMode === "signin"
                  ? "Sign up"
                  : "Sign in"}
              </button>
            </div>
          </div>

          <div className="auth-footer">
            <span>
              Fades Mail
            </span>

            <span>•</span>

            <span>
              fades.lol
            </span>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ==========================================
   * MAIL APPLICATION
   * ==========================================
   */

  return (
    <main className="mail-app">

      <header className="topbar">

        <button
          className="mobile-menu"
          onClick={() =>
            setSidebarOpen(true)
          }
          aria-label="Open menu"
        >
          ☰
        </button>

        <div className="brand">
          <div className="brand-mark">
            F
          </div>

          <span>
            Fades Mail
          </span>
        </div>

        <div className="search-box">

          <span className="search-icon">
            ⌕
          </span>

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search mail"
          />

          {search && (
            <button
              className="clear-search"
              onClick={() =>
                setSearch("")
              }
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
              {(
                mailbox?.email ||
                user?.username ||
                "F"
              )[0]?.toUpperCase()}
            </div>

            <div className="account-info">

              <strong>
                {mailbox?.email ||
                  "Fades Mail"}
              </strong>

              <span>
                {user?.username
                  ? `@${user.username}`
                  : "Fades Mail"}
              </span>

            </div>

            <button
              className="logout-button"
              onClick={logout}
              title="Sign out"
            >
              ↪
            </button>

          </div>
        </div>
      </header>

      <div className="mail-layout">

        <aside
          className={`sidebar ${
            sidebarOpen
              ? "sidebar-open"
              : ""
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
              onClick={() =>
                setSidebarOpen(false)
              }
            >
              ×
            </button>

          </div>

          <nav className="folder-nav">

            {SYSTEM_FOLDERS.map(
              (folder) => {
                const databaseFolder =
                  folders.find(
                    (item) =>
                      item.type ===
                      folder.type
                  );

                const unread =
                  Number(
                    databaseFolder?.unreadCount ||
                      0
                  );

                return (
                  <button
                    key={folder.type}
                    className={`folder-button ${
                      activeFolder ===
                      folder.type
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      selectFolder(
                        folder.type
                      )
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
              }
            )}

          </nav>

          {folders.filter(
            (folder) =>
              folder.type === "custom"
          ).length > 0 && (
            <div className="custom-folders">

              <div className="section-label">
                Folders
              </div>

              {folders
                .filter(
                  (folder) =>
                    folder.type ===
                    "custom"
                )
                .map((folder) => (
                  <button
                    key={folder.id}
                    className={`folder-button ${
                      activeFolder ===
                        folder.type &&
                      currentFolder?.id ===
                        folder.id
                        ? "active"
                        : ""
                    }`}
                    onClick={() => {
                      setActiveFolder(
                        folder.type
                      );

                      setSidebarOpen(
                        false
                      );
                    }}
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
              <span>
                Fades Mail
              </span>

              <span>
                Online
              </span>
            </div>

            <div className="storage-bar">
              <span />
            </div>

          </div>
        </aside>

        {sidebarOpen && (
          <button
            className="sidebar-overlay"
            onClick={() =>
              setSidebarOpen(false)
            }
            aria-label="Close menu"
          />
        )}

        <section className="mail-content">

          {mailError && (
            <div className="error-banner">
              {mailError}
            </div>
          )}

          {selectedMessage ? (
            <article className="message-view">

              <div className="message-toolbar">

                <button
                  className="toolbar-button"
                  onClick={
                    closeMessage
                  }
                >
                  ←
                  <span>
                    Back
                  </span>
                </button>

                <div className="toolbar-spacer" />

                <button
                  className="toolbar-button"
                  onClick={() =>
                    toggleStar(
                      selectedMessage
                    )
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
                    )[0]?.toUpperCase() ||
                      "?"}
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
                            .map(
                              (
                                recipient
                              ) =>
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
                      selectedMessage.sender ||
                        ""
                    );

                    setComposeSubject(
                      `Re: ${
                        selectedMessage.subject ||
                        ""
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
                      selectedMessage.sender ||
                        ""
                    );

                    setComposeSubject(
                      `Fwd: ${
                        selectedMessage.subject ||
                        ""
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
                    {mailbox?.email ||
                      "Mailbox"}
                  </div>

                  <h1>
                    {currentFolder?.name ||
                      activeFolder}
                  </h1>

                </div>

                <div className="content-actions">
                  <span>
                    {messages.length}{" "}
                    {messages.length ===
                    1
                      ? "message"
                      : "messages"}
                  </span>
                </div>

              </div>

              <div className="message-list">

                {messagesLoading ? (
                  <div className="empty-state">

                    <div className="spinner" />

                    <p>
                      Loading mail...
                    </p>

                  </div>
                ) : messages.length ===
                  0 ? (
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
                      activeFolder ===
                        "inbox" && (
                        <button
                          className="empty-compose"
                          onClick={() =>
                            setComposeOpen(
                              true
                            )
                          }
                        >
                          Compose a message
                        </button>
                      )}

                  </div>
                ) : (
                  messages.map(
                    (message) => {
                      const sender =
                        getSenderName(
                          message.sender,
                          message.senderName
                        );

                      const receivedAt =
                        message.receivedAt ||
                        message.received_at;

                      return (
                        <div
                          key={message.id}
                          className={`message-row ${
                            message.isRead
                              ? ""
                              : "unread"
                          }`}
                          onClick={() =>
                            openMessage(
                              message
                            )
                          }
                          role="button"
                          tabIndex={0}
                          onKeyDown={(
                            event
                          ) => {
                            if (
                              event.key ===
                                "Enter" ||
                              event.key ===
                                " "
                            ) {
                              openMessage(
                                message
                              );
                            }
                          }}
                        >

                          <div className="row-avatar">
                            {sender[0]?.toUpperCase() ||
                              "?"}
                          </div>

                          <div className="row-main">

                            <div className="row-top">

                              <strong>
                                {sender}
                              </strong>

                              <span className="row-date">
                                {formatDate(
                                  receivedAt
                                )}
                              </span>

                            </div>

                            <div className="row-subject">
                              {message.subject ||
                                "(No subject)"}
                            </div>

                            <div className="row-preview">
                              {getPreview(
                                message
                              )}
                            </div>

                          </div>

                          <button
                            className={`row-star ${
                              message.isStarred
                                ? "starred"
                                : ""
                            }`}
                            onClick={(
                              event
                            ) => {
                              event.stopPropagation();

                              toggleStar(
                                message
                              );
                            }}
                            aria-label="Star message"
                          >
                            ★
                          </button>

                        </div>
                      );
                    }
                  )
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
              event.target ===
              event.currentTarget
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

                <strong>
                  New message
                </strong>

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
                  setComposeTo(
                    event.target.value
                  )
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
                  setComposeBody(
                    event.target.value
                  )
                }
                placeholder="Write your message..."
              />

            </div>

            <div className="compose-footer">

              <span>
                Separate multiple recipients
                with commas.
              </span>

              <button
                className="send-button"
                type="submit"
                disabled={sending}
              >
                {sending
                  ? "Sending..."
                  : "Send"}

                <span>
                  ↗
                </span>
              </button>

            </div>

          </form>
        </div>
      )}

    </main>
  );
}

