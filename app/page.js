"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const API_URL =
process.env.NEXT_PUBLIC_MAIL_API_URL ||
"https://mail-api.fades.lol";

const SYSTEM_FOLDERS = [
{ type: "inbox", name: "Inbox", icon: "inbox" },
{ type: "starred", name: "Starred", icon: "star" },
{ type: "sent", name: "Sent", icon: "send" },
{ type: "drafts", name: "Drafts", icon: "draft" },
{ type: "archive", name: "Archive", icon: "archive" },
{ type: "spam", name: "Spam", icon: "spam" },
{ type: "trash", name: "Trash", icon: "trash" },
];

function Icon({ name, size = 18 }) {
const common = {
width: size,
height: size,
viewBox: "0 0 24 24",
fill: "none",
stroke: "currentColor",
strokeWidth: "1.8",
strokeLinecap: "round",
strokeLinejoin: "round",
"aria-hidden": true,
};

const paths = {
inbox: (
<> <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5z" /> <path d="M4 14h4l1.5 2h5L16 14h4" />
</>
),
star: ( <path d="m12 3 2.78 5.63 6.22.9-4.5 4.38 1.06 6.19L12 17.18l-5.56 2.92 1.06-6.19L3 9.53l6.22-.9z" />
),
send: (
<> <path d="m21 3-8.5 18-2.8-7.7L2 10.5z" /> <path d="M9.7 13.3 21 3" />
</>
),
draft: (
<> <rect x="5" y="3" width="14" height="18" rx="2" /> <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
</>
),
archive: (
<> <path d="M4 7h16v13H4z" /> <path d="M3 4h18v3H3z" /> <path d="M9 11h6" />
</>
),
spam: (
<> <circle cx="12" cy="12" r="9" /> <path d="M12 7v6" /> <path d="M12 16h.01" />
</>
),
trash: (
<> <path d="M4 7h16" /> <path d="M9 7V4h6v3" /> <path d="m7 7 1 13h8l1-13" /> <path d="M10 11v5M14 11v5" />
</>
),
search: (
<> <circle cx="10.8" cy="10.8" r="6.8" /> <path d="m16 16 5 5" />
</>
),
refresh: (
<> <path d="M20 11a8 8 0 0 0-14.7-4L4 9" /> <path d="M4 4v5h5" /> <path d="M4 13a8 8 0 0 0 14.7 4L20 15" /> <path d="M20 20v-5h-5" />
</>
),
arrowLeft: (
<> <path d="m15 18-6-6 6-6" /> <path d="M9 12h10" />
</>
),
archiveAction: (
<> <path d="M4 7h16v13H4z" /> <path d="M3 4h18v3H3z" /> <path d="M9 11h6" />
</>
),
reply: (
<> <path d="M9 8 4 12l5 4" /> <path d="M4 12h10a6 6 0 0 1 6 6" />
</>
),
forward: (
<> <path d="m15 8 5 4-5 4" /> <path d="M20 12H10a6 6 0 0 0-6 6" />
</>
),
close: (
<> <path d="m6 6 12 12M18 6 6 18" />
</>
),
menu: (
<> <path d="M4 7h16M4 12h16M4 17h16" />
</>
),
logout: (
<> <path d="M10 5H5v14h5" /> <path d="M13 8l4 4-4 4" /> <path d="M17 12H9" />
</>
),
plus: (
<> <path d="M12 5v14M5 12h14" />
</>
),
mail: (
<> <rect x="3" y="5" width="18" height="14" rx="2" /> <path d="m4 7 8 6 8-6" />
</>
),
chevron: ( <path d="m9 18 6-6-6-6" />
),
};

return <svg {...common}>{paths[name]}</svg>;
}

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
.slice(0, 160);
}

function getInitial(value) {
return (
String(value || "F")
.trim()
.charAt(0)
.toUpperCase() || "F"
);
}

export default function Home() {
const [authLoading, setAuthLoading] = useState(true);
const [authenticated, setAuthenticated] = useState(false);
const [user, setUser] = useState(null);

const [authMode, setAuthMode] = useState("signin");

const [username, setUsername] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");

const [authError, setAuthError] = useState("");
const [authSubmitting, setAuthSubmitting] = useState(false);

const [mailbox, setMailbox] = useState(null);
const [folders, setFolders] = useState([]);
const [activeFolder, setActiveFolder] = useState("inbox");

const [messages, setMessages] = useState([]);
const [selectedMessage, setSelectedMessage] = useState(null);

const [messagesLoading, setMessagesLoading] = useState(false);
const [mailError, setMailError] = useState("");

const [search, setSearch] = useState("");
const [sidebarOpen, setSidebarOpen] = useState(false);

const [composeOpen, setComposeOpen] = useState(false);
const [composeTo, setComposeTo] = useState("");
const [composeSubject, setComposeSubject] = useState("");
const [composeBody, setComposeBody] = useState("");
const [sending, setSending] = useState(false);

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

const checkAuth = useCallback(async () => {
try {
setAuthLoading(true);


  const response = await fetch(`${API_URL}/auth/me`, {
    credentials: "include",
  });

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

async function submitAuth(event) {
event.preventDefault();


setAuthError("");
setAuthSubmitting(true);

try {
  const endpoint =
    authMode === "signin"
      ? "/auth/login"
      : "/auth/signup";

  const body =
    authMode === "signin"
      ? {
          email: email.trim().toLowerCase(),
          password,
        }
      : {
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          password,
        };

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
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

async function logout() {
try {
await fetch(`${API_URL}/auth/logout`, {
method: "POST",
credentials: "include",
});
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
    data?.mailbox || data;

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
    params.set("folder", activeFolder);
  }

  if (search.trim()) {
    params.set("search", search.trim());
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
          "Content-Type": "application/json",
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
        "Content-Type": "application/json",
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
    selectedMessage?.id === message.id
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

async function moveMessage(message, folder) {
if (!mailbox?.id) return;


try {
  const response = await fetch(
    `${API_URL}/mail/messages/${message.id}/move`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
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

async function sendMessage(event) {
event.preventDefault();


if (!mailbox?.id) return;
if (!composeTo.trim()) return;

setSending(true);

try {
  const recipients = composeTo
    .split(",")
    .map((item) => item.trim())
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
        subject: composeSubject,
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

function selectFolder(type, id = null) {
setSelectedMessage(null);
setSearch("");
setActiveFolder(
id ? `${type}:${id}` : type
);
setSidebarOpen(false);
}

const resolvedActiveFolder =
activeFolder.includes(":")
? activeFolder.split(":")[0]
: activeFolder;

const activeCustomFolderId =
activeFolder.includes(":")
? activeFolder.split(":")[1]
: null;

const currentFolderForDisplay =
activeCustomFolderId
? folders.find(
(folder) =>
String(folder.id) ===
String(activeCustomFolderId)
)
: currentFolder;

const unreadCount = folders.reduce(
(total, folder) =>
total +
Number(folder.unreadCount || 0),
0
);

if (authLoading) {
return ( <main className="auth-page"> <div className="auth-loading-card"> <div className="loading-logo">
F </div>


      <div className="spinner" />

      <p>Connecting to Fades Mail</p>

      <span>
        Securing your mailbox...
      </span>
    </div>
  </main>
);


}

if (!authenticated) {
return ( <main className="auth-page"> <div className="auth-shell"> <div className="auth-brand"> <div className="auth-brand-mark">
F </div>


        <div>
          <strong>Fades Mail</strong>
          <span>Private email, beautifully simple.</span>
        </div>
      </div>

      <div className="auth-card">
        <div className="auth-card-top">
          <div className="auth-pill">
            <span />
            Fades Mail
          </div>
        </div>

        <div className="auth-heading">
          <h1>
            {authMode === "signin"
              ? "Welcome back."
              : "Create your mailbox."}
          </h1>

          <p>
            {authMode === "signin"
              ? "Sign in to continue to your Fades Mail account."
              : "Create your own Fades Mail address and start sending."}
          </p>
        </div>

        <form
          className="auth-form"
          onSubmit={submitAuth}
        >
          {authMode === "signup" && (
            <label>
              <span>Username</span>

              <div className="input-shell">
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

                <small>@fades.lol</small>
              </div>

              <em>
                Your new address will be{" "}
                {username
                  ? `${username.toLowerCase()}@fades.lol`
                  : "yourname@fades.lol"}
              </em>
            </label>
          )}

          <label>
            <span>Email</span>

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
            <span>Password</span>

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
              <span>!</span>
              {authError}
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={authSubmitting}
          >
            <span>
              {authSubmitting
                ? "Please wait..."
                : authMode === "signin"
                ? "Sign in"
                : "Create mailbox"}
            </span>

            {!authSubmitting && (
              <span className="submit-arrow">
                →
              </span>
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
              ? "Create one"
              : "Sign in"}
          </button>
        </div>
      </div>

      <div className="auth-footer">
        <span>Fades Mail</span>
        <span>•</span>
        <span>fades.lol</span>
        <span>•</span>
        <span>Private by design</span>
      </div>
    </div>
  </main>
);


}

return ( <main className="mail-app"> <header className="topbar">
<button
className="mobile-menu"
onClick={() =>
setSidebarOpen(true)
}
aria-label="Open menu"
> <Icon name="menu" size={20} /> </button>


    <div className="brand">
      <div className="brand-mark">
        F
      </div>

      <div className="brand-copy">
        <strong>Fades</strong>
        <span>Mail</span>
      </div>
    </div>

    <div className="search-box">
      <Icon name="search" size={18} />

      <input
        value={search}
        onChange={(event) =>
          setSearch(event.target.value)
        }
        placeholder="Search your mail"
      />

      {search && (
        <button
          className="clear-search"
          onClick={() =>
            setSearch("")
          }
          aria-label="Clear search"
        >
          <Icon name="close" size={15} />
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
        <Icon name="refresh" size={18} />
      </button>

      <div className="account">
        <div className="avatar">
          {getInitial(
            mailbox?.email ||
              user?.username
          )}
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
          <Icon name="logout" size={17} />
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
          <Icon name="plus" size={18} />
          <span>Compose</span>
        </button>

        <button
          className="close-sidebar"
          onClick={() =>
            setSidebarOpen(false)
          }
          aria-label="Close sidebar"
        >
          <Icon name="close" size={18} />
        </button>
      </div>

      <div className="mail-summary">
        <div>
          <span className="summary-label">
            Mailbox
          </span>

          <strong>
            {mailbox?.email || "Loading..."}
          </strong>
        </div>

        {unreadCount > 0 && (
          <span className="summary-count">
            {unreadCount}
          </span>
        )}
      </div>

      <nav className="folder-nav">
        <div className="nav-label">
          Mail
        </div>

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

            const active =
              resolvedActiveFolder ===
              folder.type &&
              !activeCustomFolderId;

            return (
              <button
                key={folder.type}
                className={`folder-button ${
                  active ? "active" : ""
                }`}
                onClick={() =>
                  selectFolder(
                    folder.type
                  )
                }
              >
                <span className="folder-icon">
                  <Icon
                    name={folder.icon}
                    size={17}
                  />
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
          <div className="nav-label">
            Folders
          </div>

          {folders
            .filter(
              (folder) =>
                folder.type ===
                "custom"
            )
            .map((folder) => {
              const active =
                activeCustomFolderId ===
                String(folder.id);

              return (
                <button
                  key={folder.id}
                  className={`folder-button ${
                    active ? "active" : ""
                  }`}
                  onClick={() =>
                    selectFolder(
                      "custom",
                      folder.id
                    )
                  }
                >
                  <span className="folder-icon">
                    <Icon
                      name="draft"
                      size={17}
                    />
                  </span>

                  <span className="folder-name">
                    {folder.name}
                  </span>

                  {Number(
                    folder.unreadCount || 0
                  ) > 0 && (
                    <span className="unread-count">
                      {Number(
                        folder.unreadCount || 0
                      )}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      )}

      <div className="sidebar-bottom">
        <div className="status-card">
          <div className="status-dot" />

          <div>
            <strong>Fades Mail</strong>
            <span>All systems operational</span>
          </div>
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
          <span>!</span>
          {mailError}
        </div>
      )}

      {selectedMessage ? (
        <article className="message-view">
          <div className="message-toolbar">
            <button
              className="toolbar-button toolbar-back"
              onClick={() =>
                setSelectedMessage(null)
              }
            >
              <Icon
                name="arrowLeft"
                size={18}
              />
              <span>Back to {currentFolderForDisplay?.name || "mail"}</span>
            </button>

            <div className="toolbar-spacer" />

            <button
              className={`toolbar-icon ${
                selectedMessage.isStarred
                  ? "is-starred"
                  : ""
              }`}
              onClick={() =>
                toggleStar(
                  selectedMessage
                )
              }
              title="Star"
            >
              <Icon
                name="star"
                size={18}
              />
            </button>

            <button
              className="toolbar-icon"
              onClick={() =>
                moveMessage(
                  selectedMessage,
                  "archive"
                )
              }
              title="Archive"
            >
              <Icon
                name="archiveAction"
                size={18}
              />
            </button>

            <button
              className="toolbar-icon danger"
              onClick={() =>
                moveMessage(
                  selectedMessage,
                  "trash"
                )
              }
              title="Delete"
            >
              <Icon
                name="trash"
                size={18}
              />
            </button>
          </div>

          <div className="message-paper">
            <div className="message-header">
              <div className="message-title-row">
                <div>
                  <div className="message-kicker">
                    {currentFolderForDisplay?.name ||
                      "Message"}
                  </div>

                  <h1>
                    {selectedMessage.subject ||
                      "(No subject)"}
                  </h1>
                </div>
              </div>

              <div className="message-meta">
                <div className="sender-avatar">
                  {getInitial(
                    getSenderName(
                      selectedMessage.sender,
                      selectedMessage.senderName
                    )
                  )}
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

                  <span className="recipient-line">
                    To{" "}
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
                <Icon
                  name="reply"
                  size={17}
                />
                Reply
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
                <Icon
                  name="forward"
                  size={17}
                />
                Forward
              </button>
            </div>
          </div>
        </article>
      ) : (
        <>
          <div className="content-header">
            <div>
              <div className="breadcrumb">
                <span className="breadcrumb-dot" />
                {mailbox?.email ||
                  "Mailbox"}
              </div>

              <div className="content-title-row">
                <h1>
                  {currentFolderForDisplay?.name ||
                    activeFolder}
                </h1>

                {unreadCount > 0 &&
                  resolvedActiveFolder ===
                    "inbox" && (
                    <span className="title-badge">
                      {unreadCount} unread
                    </span>
                  )}
              </div>
            </div>

            <div className="content-actions">
              <span className="message-count">
                {messages.length}
              </span>

              <span>
                {messages.length === 1
                  ? "message"
                  : "messages"}
              </span>
            </div>
          </div>

          <div className="message-list">
            {messagesLoading ? (
              <div className="empty-state">
                <div className="loading-ring" />
                <h2>Loading your mail</h2>
                <p>
                  Fetching your latest messages...
                </p>
              </div>
            ) : messages.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Icon
                    name="mail"
                    size={27}
                  />
                </div>

                <h2>
                  {search
                    ? "Nothing matched your search"
                    : resolvedActiveFolder ===
                      "sent"
                    ? "No sent messages"
                    : resolvedActiveFolder ===
                      "drafts"
                    ? "No drafts"
                    : resolvedActiveFolder ===
                      "trash"
                    ? "Trash is empty"
                    : "Your inbox is empty"}
                </h2>

                <p>
                  {search
                    ? "Try searching for another sender, subject, or phrase."
                    : "When messages arrive, they'll appear here."}
                </p>

                {!search &&
                  resolvedActiveFolder ===
                    "inbox" && (
                    <button
                      className="empty-compose"
                      onClick={() =>
                        setComposeOpen(true)
                      }
                    >
                      <Icon
                        name="plus"
                        size={17}
                      />
                      Compose a message
                    </button>
                  )}
              </div>
            ) : (
              messages.map((message) => {
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
                    onKeyDown={(event) => {
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
                      {getInitial(sender)}
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
                      onClick={(event) => {
                        event.stopPropagation();

                        toggleStar(
                          message
                        );
                      }}
                      aria-label="Star message"
                    >
                      <Icon
                        name="star"
                        size={17}
                      />
                    </button>

                    <div className="row-chevron">
                      <Icon
                        name="chevron"
                        size={16}
                      />
                    </div>
                  </div>
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
            <span className="compose-kicker">
              FADES MAIL
            </span>

            <strong>New message</strong>

            <span className="compose-account">
              Sending from{" "}
              {mailbox?.email || ""}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setComposeOpen(false)
            }
            aria-label="Close composer"
          >
            <Icon
              name="close"
              size={19}
            />
          </button>
        </div>

        <div className="compose-fields">
          <div className="compose-field">
            <span>To</span>

            <input
              value={composeTo}
              onChange={(event) =>
                setComposeTo(
                  event.target.value
                )
              }
              placeholder="recipient@example.com"
              required
              autoFocus
            />
          </div>

          <div className="compose-field">
            <span>Subject</span>

            <input
              value={composeSubject}
              onChange={(event) =>
                setComposeSubject(
                  event.target.value
                )
              }
              placeholder="Subject"
            />
          </div>

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
            Separate multiple recipients with commas.
          </span>

          <button
            className="send-button"
            type="submit"
            disabled={sending}
          >
            {sending
              ? "Sending..."
              : "Send"}

            <Icon
              name="send"
              size={16}
            />
          </button>
        </div>
      </form>
    </div>
  )}
</main>


);
}
