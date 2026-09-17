"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5z" />
        <path d="M4 14h4l1.5 2h5L16 14h4" />
      </>
    ),

    star: (
      <path d="m12 3 2.78 5.63 6.22.9-4.5 4.38 1.06 6.19L12 17.18l-5.56 2.92 1.06-6.19L3 9.53l6.22-.9z" />
    ),

    send: (
      <>
        <path d="m21 3-8.5 18-2.8-7.7L2 10.5z" />
        <path d="M9.7 13.3 21 3" />
      </>
    ),

    draft: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
      </>
    ),

    archive: (
      <>
        <path d="M4 7h16v13H4z" />
        <path d="M3 4h18v3H3z" />
        <path d="M9 11h6" />
      </>
    ),

    spam: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v6" />
        <path d="M12 16h.01" />
      </>
    ),

    trash: (
      <>
        <path d="M4 7h16" />
        <path d="M9 7V4h6v3" />
        <path d="m7 7 1 13h8l1-13" />
        <path d="M10 11v5M14 11v5" />
      </>
    ),

    search: (
      <>
        <circle cx="10.8" cy="10.8" r="6.8" />
        <path d="m16 16 5 5" />
      </>
    ),

    refresh: (
      <>
        <path d="M20 11a8 8 0 0 0-14.7-4L4 9" />
        <path d="M4 4v5h5" />
        <path d="M4 13a8 8 0 0 0 14.7 4L20 15" />
        <path d="M20 20v-5h-5" />
      </>
    ),

    arrowLeft: (
      <>
        <path d="m15 18-6-6 6-6" />
        <path d="M9 12h10" />
      </>
    ),

    reply: (
      <>
        <path d="M9 8 4 12l5 4" />
        <path d="M4 12h10a6 6 0 0 1 6 6" />
      </>
    ),

    forward: (
      <>
        <path d="m15 8 5 4-5 4" />
        <path d="M20 12H10a6 6 0 0 0-6 6" />
      </>
    ),

    close: (
      <>
        <path d="m6 6 12 12" />
        <path d="M18 6 6 18" />
      </>
    ),

    menu: (
      <path d="M4 7h16M4 12h16M4 17h16" />
    ),

    logout: (
      <>
        <path d="M10 5H5v14h5" />
        <path d="M13 8l4 4-4 4" />
        <path d="M17 12H9" />
      </>
    ),

    plus: (
      <>
        <path d="M12 5v14M5 12h14" />
      </>
    ),

    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>
    ),

    chevron: (
      <path d="m9 18 6-6-6-6" />
    ),

    ban: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m5.6 5.6 12.8 12.8" />
      </>
    ),

    inboxAction: (
      <>
        <path d="M4 5h16v14H4z" />
        <path d="M4 14h4l1.5 2h5L16 14h4" />
      </>
    ),

    check: (
      <path d="m5 12 4 4L19 6" />
    ),

    more: (
      <>
        <circle
          cx="5"
          cy="12"
          r="1"
          fill="currentColor"
          stroke="none"
        />
        <circle
          cx="12"
          cy="12"
          r="1"
          fill="currentColor"
          stroke="none"
        />
        <circle
          cx="19"
          cy="12"
          r="1"
          fill="currentColor"
          stroke="none"
        />
      </>
    ),

    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
        <circle cx="9.5" cy="7" r="4" />
        <path d="M17 11a4 4 0 0 0 0-8" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
      </>
    ),

    chevronDown: (
      <path d="m6 9 6 6 6-6" />
    ),
  };

  return <svg {...common}>{paths[name]}</svg>;
}

function formatDate(value) {
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

function getSenderName(sender, senderName) {
  if (senderName) {
    return senderName;
  }

  if (!sender) {
    return "Unknown sender";
  }

  const local = sender.split("@")[0];

  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
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

function normalizeRecipient(value) {
  if (!value) return "";

  if (typeof value === "string") {
    return value.trim();
  }

  return (
    value.address ||
    value.email ||
    value.value ||
    ""
  ).trim();
}

function getRecipientName(recipient) {
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

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    value
  );
}

function uniqueEmails(values) {
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

export default function Home() {
  const [authLoading, setAuthLoading] =
    useState(true);

  const [authenticated, setAuthenticated] =
    useState(false);

  const [user, setUser] = useState(null);

  const [authMode, setAuthMode] =
    useState("signin");

  const [username, setUsername] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [authError, setAuthError] =
    useState("");

  const [authSubmitting, setAuthSubmitting] =
    useState(false);

  const [mailbox, setMailbox] =
    useState(null);

  const [folders, setFolders] =
    useState([]);

  const [activeFolder, setActiveFolder] =
    useState("inbox");

  const [messages, setMessages] =
    useState([]);

  const [selectedMessage, setSelectedMessage] =
    useState(null);

  const [selectedIds, setSelectedIds] =
    useState([]);

  const [messagesLoading, setMessagesLoading] =
    useState(false);

  const [mailError, setMailError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [composeOpen, setComposeOpen] =
    useState(false);

  const [composeSubject, setComposeSubject] =
    useState("");

  const [composeBody, setComposeBody] =
    useState("");

  const [sending, setSending] =
    useState(false);

  const [recipientQuery, setRecipientQuery] =
    useState("");

  const [recipientSuggestions, setRecipientSuggestions] =
    useState([]);

  const [recipientLoading, setRecipientLoading] =
    useState(false);

  const [recipientChips, setRecipientChips] =
    useState([]);

  const [ccChips, setCcChips] =
    useState([]);

  const [bccChips, setBccChips] =
    useState([]);

  const [recipientType, setRecipientType] =
    useState("to");

  const [showCc, setShowCc] =
    useState(false);

  const [showBcc, setShowBcc] =
    useState(false);

  const [recipientSuggestionsOpen, setRecipientSuggestionsOpen] =
    useState(false);

  const [recipientActiveIndex, setRecipientActiveIndex] =
    useState(-1);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [toast, setToast] =
    useState(null);

  const recipientInputRef =
    useRef(null);

  const toastTimerRef =
    useRef(null);

  const currentFolder = useMemo(() => {
    return (
      folders.find(
        (folder) =>
          folder.type === activeFolder
      ) ||
      SYSTEM_FOLDERS.find(
        (folder) =>
          folder.type === activeFolder
      )
    );
  }, [folders, activeFolder]);

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
            String(
              activeCustomFolderId
            )
        )
      : currentFolder;

  const unreadCount =
    folders.reduce(
      (total, folder) =>
        total +
        Number(
          folder.unreadCount || 0
        ),
      0
    );

  const allVisibleSelected =
    messages.length > 0 &&
    messages.every((message) =>
      selectedIds.includes(
        message.id
      )
    );

  const selectedCount =
    selectedIds.length;

  function showToast(
    message,
    type = "success"
  ) {
    setToast({
      message,
      type,
    });

    if (toastTimerRef.current) {
      clearTimeout(
        toastTimerRef.current
      );
    }

    toastTimerRef.current =
      setTimeout(() => {
        setToast(null);
      }, 3200);
  }

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(
          toastTimerRef.current
        );
      }
    };
  }, []);

  /*
   * AUTH
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

      const data =
        await response.json();

      const authenticatedUser =
        data?.user ||
        data?.account ||
        data;

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
              email: email
                .trim()
                .toLowerCase(),
              password,
            }
          : {
              username: username
                .trim()
                .toLowerCase(),
              email: email
                .trim()
                .toLowerCase(),
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

      const data =
        await response
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
    setSelectedIds([]);
  }

  /*
   * MAILBOX
   */

  const loadMailbox = useCallback(
    async () => {
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

        const data =
          await response.json();

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
    },
    []
  );

  useEffect(() => {
    if (!authenticated) return;

    loadMailbox();
  }, [
    authenticated,
    loadMailbox,
  ]);

  /*
   * FOLDERS
   */

  const loadFolders = useCallback(
    async () => {
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

        const data =
          await response.json();

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
    },
    [mailbox]
  );

  useEffect(() => {
    if (!mailbox) return;

    loadFolders();
  }, [
    mailbox,
    loadFolders,
  ]);

  /*
   * MESSAGES
   */

  const loadMessages = useCallback(
    async () => {
      if (!mailbox?.id) return;

      setMessagesLoading(true);

      try {
        const params =
          new URLSearchParams();

        params.set(
          "mailboxId",
          String(mailbox.id)
        );

        if (
          resolvedActiveFolder ===
          "starred"
        ) {
          params.set(
            "starred",
            "true"
          );
        } else if (
          resolvedActiveFolder
        ) {
          params.set(
            "folder",
            resolvedActiveFolder
          );
        }

        if (search.trim()) {
          params.set(
            "search",
            search.trim()
          );
        }

        params.set(
          "limit",
          "100"
        );

        params.set(
          "offset",
          "0"
        );

        const response =
          await fetch(
            `${API_URL}/mail/messages?${params.toString()}`,
            {
              credentials: "include",
            }
          );

        if (!response.ok) {
          if (
            response.status === 401
          ) {
            setAuthenticated(false);
            setUser(null);
          }

          throw new Error(
            `Message request failed (${response.status})`
          );
        }

        const data =
          await response.json();

        const items =
          Array.isArray(data)
            ? data
            : data.messages || [];

        setMessages(items);

        setSelectedIds([]);
      } catch (error) {
        console.error(
          "[Fades Mail] Message error:",
          error
        );

        setMessages([]);
        setSelectedIds([]);
      } finally {
        setMessagesLoading(false);
      }
    },
    [
      mailbox,
      resolvedActiveFolder,
      search,
    ]
  );

  useEffect(() => {
    if (!mailbox) return;

    loadMessages();
  }, [
    mailbox,
    loadMessages,
  ]);

  /*
   * MESSAGE OPEN
   */

  async function openMessage(message) {
    if (!mailbox?.id) return;

    try {
      const response =
        await fetch(
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

      const data =
        await response.json();

      const openedMessage =
        data?.message ||
        data;

      setSelectedMessage(
        openedMessage
      );

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
              mailboxId:
                mailbox.id,
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

      showToast(
        "Unable to open this message.",
        "error"
      );
    }
  }

  /*
   * STAR
   */

  async function toggleStar(message) {
    if (!mailbox?.id) return;

    const endpoint =
      message.isStarred
        ? "unstar"
        : "star";

    try {
      const response =
        await fetch(
          `${API_URL}/mail/messages/${message.id}/${endpoint}`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              mailboxId:
                mailbox.id,
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          `Star request failed (${response.status})`
        );
      }

      setMessages(
        (current) =>
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
        setSelectedMessage(
          (current) => ({
            ...current,
            isStarred:
              !message.isStarred,
          })
        );
      }

      loadFolders();
    } catch (error) {
      console.error(
        "[Fades Mail] Star error:",
        error
      );

      showToast(
        "Unable to update star.",
        "error"
      );
    }
  }

  /*
   * MOVE
   */

  async function moveMessage(
    message,
    folder,
    options = {}
  ) {
    if (!mailbox?.id) return false;

    const silent =
      options.silent || false;

    setActionLoading(true);

    try {
      const response =
        await fetch(
          `${API_URL}/mail/messages/${message.id}/move`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              mailboxId:
                mailbox.id,
              folder,
            }),
          }
        );

      if (!response.ok) {
        const data =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          data?.message ||
            data?.error ||
            `Move request failed (${response.status})`
        );
      }

      if (
        selectedMessage?.id ===
        message.id
      ) {
        setSelectedMessage(null);
      }

      if (!silent) {
        await loadMessages();
        await loadFolders();
      }

      return true;
    } catch (error) {
      console.error(
        "[Fades Mail] Move error:",
        error
      );

      if (!silent) {
        showToast(
          error.message ||
            "Unable to move message.",
          "error"
        );
      }

      return false;
    } finally {
      setActionLoading(false);
    }
  }

  /*
   * SPAM
   */

  async function markAsSpam(message) {
    const success =
      await moveMessage(
        message,
        "spam"
      );

    if (success) {
      showToast(
        "Message moved to Spam."
      );
    }
  }

  async function markAsNotSpam(message) {
    const success =
      await moveMessage(
        message,
        "inbox"
      );

    if (success) {
      showToast(
        "Message moved to Inbox."
      );
    }
  }

  /*
   * READ / UNREAD
   */

  async function toggleRead(
    message
  ) {
    if (!mailbox?.id) return;

    setActionLoading(true);

    try {
      const endpoint =
        message.isRead
          ? "unread"
          : "read";

      const response =
        await fetch(
          `${API_URL}/mail/messages/${message.id}/${endpoint}`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              mailboxId:
                mailbox.id,
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          `Read request failed (${response.status})`
        );
      }

      const nextRead =
        !message.isRead;

      setMessages(
        (current) =>
          current.map((item) =>
            item.id === message.id
              ? {
                  ...item,
                  isRead: nextRead,
                }
              : item
          )
      );

      if (
        selectedMessage?.id ===
        message.id
      ) {
        setSelectedMessage(
          (current) => ({
            ...current,
            isRead: nextRead,
          })
        );
      }

      await loadFolders();
    } catch (error) {
      console.error(
        "[Fades Mail] Read toggle error:",
        error
      );

      showToast(
        "Unable to update message status.",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  }

  /*
   * BULK SELECTION
   */

  function toggleSelectedMessage(
    messageId
  ) {
    setSelectedIds(
      (current) =>
        current.includes(messageId)
          ? current.filter(
              (id) =>
                id !== messageId
            )
          : [
              ...current,
              messageId,
            ]
    );
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(
      messages.map(
        (message) =>
          message.id
      )
    );
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  async function bulkMove(
    folder
  ) {
    if (
      !mailbox?.id ||
      selectedIds.length === 0
    ) {
      return;
    }

    const ids = [...selectedIds];

    setActionLoading(true);

    try {
      const results =
        await Promise.all(
          ids.map(
            async (messageId) => {
              try {
                const response =
                  await fetch(
                    `${API_URL}/mail/messages/${messageId}/move`,
                    {
                      method: "POST",
                      credentials:
                        "include",
                      headers: {
                        "Content-Type":
                          "application/json",
                      },
                      body: JSON.stringify(
                        {
                          mailboxId:
                            mailbox.id,
                          folder,
                        }
                      ),
                    }
                  );

                return response.ok;
              } catch {
                return false;
              }
            }
          )
        );

      const successCount =
        results.filter(Boolean)
          .length;

      setSelectedIds([]);

      await loadMessages();
      await loadFolders();

      if (folder === "spam") {
        showToast(
          `${successCount} message${
            successCount === 1
              ? ""
              : "s"
          } moved to Spam.`
        );
      } else if (
        folder === "trash"
      ) {
        showToast(
          `${successCount} message${
            successCount === 1
              ? ""
              : "s"
          } moved to Trash.`
        );
      } else if (
        folder === "archive"
      ) {
        showToast(
          `${successCount} message${
            successCount === 1
              ? ""
              : "s"
          } archived.`
        );
      } else {
        showToast(
          `${successCount} message${
            successCount === 1
              ? ""
              : "s"
          } updated.`
        );
      }
    } catch (error) {
      console.error(
        "[Fades Mail] Bulk action error:",
        error
      );

      showToast(
        "Unable to complete the bulk action.",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function bulkMarkRead() {
    if (
      !mailbox?.id ||
      selectedIds.length === 0
    ) {
      return;
    }

    const ids = [...selectedIds];

    setActionLoading(true);

    try {
      const results =
        await Promise.all(
          ids.map(
            async (messageId) => {
              try {
                const response =
                  await fetch(
                    `${API_URL}/mail/messages/${messageId}/read`,
                    {
                      method: "POST",
                      credentials:
                        "include",
                      headers: {
                        "Content-Type":
                          "application/json",
                      },
                      body: JSON.stringify(
                        {
                          mailboxId:
                            mailbox.id,
                        }
                      ),
                    }
                  );

                return response.ok;
              } catch {
                return false;
              }
            }
          )
        );

      const successCount =
        results.filter(Boolean)
          .length;

      setSelectedIds([]);

      await loadMessages();
      await loadFolders();

      showToast(
        `${successCount} message${
          successCount === 1
            ? ""
            : "s"
        } marked as read.`
      );
    } catch (error) {
      console.error(
        "[Fades Mail] Bulk read error:",
        error
      );

      showToast(
        "Unable to mark messages as read.",
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  }

  /*
   * RECIPIENT SEARCH
   */

  const searchRecipients =
    useCallback(
      async (query) => {
        const cleanQuery =
          query.trim();

        if (!cleanQuery) {
          setRecipientSuggestions(
            []
          );
          setRecipientLoading(false);
          return;
        }

        setRecipientLoading(
          true
        );

        try {
          const response =
            await fetch(
              `${API_URL}/mail/recipients?query=${encodeURIComponent(
                cleanQuery
              )}`,
              {
                credentials:
                  "include",
              }
            );

          if (!response.ok) {
            setRecipientSuggestions(
              []
            );
            return;
          }

          const data =
            await response.json();

          const results =
            Array.isArray(data)
              ? data
              : data.recipients ||
                data.users ||
                data.contacts ||
                [];

          const existing =
            new Set(
              getRecipientList(
                recipientType
              ).map((email) =>
                email.toLowerCase()
              )
            );

          const filtered =
            results.filter(
              (recipient) => {
                const address =
                  normalizeRecipient(
                    recipient
                  ).toLowerCase();

                return (
                  address &&
                  !existing.has(
                    address
                  ) &&
                  address !==
                    mailbox?.email?.toLowerCase()
                );
              }
            );

          setRecipientSuggestions(
            filtered.slice(0, 10)
          );

          setRecipientSuggestionsOpen(
            true
          );

          setRecipientActiveIndex(
            -1
          );
        } catch (error) {
          console.error(
            "[Fades Mail] Recipient search failed:",
            error
          );

          setRecipientSuggestions(
            []
          );
        } finally {
          setRecipientLoading(
            false
          );
        }
      },
      [
        recipientType,
        recipientChips,
        ccChips,
        bccChips,
        mailbox,
      ]
    );

  useEffect(() => {
    if (!composeOpen) {
      setRecipientSuggestions(
        []
      );
      setRecipientSuggestionsOpen(
        false
      );
      return;
    }

    const timer =
      setTimeout(() => {
        searchRecipients(
          recipientQuery
        );
      }, 180);

    return () =>
      clearTimeout(timer);
  }, [
    recipientQuery,
    composeOpen,
    recipientType,
    searchRecipients,
  ]);

  /*
   * RECIPIENT CHIPS
   */

  function getRecipientList(
    type
  ) {
    if (type === "cc") {
      return ccChips;
    }

    if (type === "bcc") {
      return bccChips;
    }

    return recipientChips;
  }

  function setRecipientList(
    type,
    updater
  ) {
    if (type === "cc") {
      setCcChips(updater);
      return;
    }

    if (type === "bcc") {
      setBccChips(updater);
      return;
    }

    setRecipientChips(updater);
  }

  function addRecipient(
    emailAddress,
    type = recipientType
  ) {
    const cleanEmail =
      normalizeRecipient(
        emailAddress
      )
        .trim()
        .toLowerCase();

    if (!cleanEmail) return false;

    if (!isValidEmail(cleanEmail)) {
      showToast(
        `"${cleanEmail}" is not a valid email address.`,
        "error"
      );

      return false;
    }

    if (
      mailbox?.email &&
      cleanEmail ===
        mailbox.email.toLowerCase()
    ) {
      showToast(
        "You cannot send an email to yourself.",
        "error"
      );

      return false;
    }

    setRecipientList(
      type,
      (current) => {
        if (
          current.some(
            (item) =>
              item.toLowerCase() ===
              cleanEmail
          )
        ) {
          return current;
        }

        return [
          ...current,
          cleanEmail,
        ];
      }
    );

    setRecipientQuery("");
    setRecipientSuggestions([]);
    setRecipientSuggestionsOpen(
      false
    );
    setRecipientActiveIndex(-1);

    return true;
  }

  function addTypedRecipients(
    type
  ) {
    const values =
      recipientQuery
        .split(/[;,]+/)
        .map((value) =>
          value.trim()
        )
        .filter(Boolean);

    if (!values.length) {
      return;
    }

    let added = false;

    for (const value of values) {
      if (
        isValidEmail(value)
      ) {
        addRecipient(
          value,
          type
        );

        added = true;
      }
    }

    if (!added) {
      showToast(
        "Enter a valid email address.",
        "error"
      );
    }
  }

  function removeRecipient(
    emailAddress,
    type
  ) {
    setRecipientList(
      type,
      (current) =>
        current.filter(
          (item) =>
            item.toLowerCase() !==
            emailAddress.toLowerCase()
        )
    );
  }

  function handleRecipientKeyDown(
    event,
    type
  ) {
    const suggestions =
      recipientSuggestions;

    if (
      event.key ===
        "ArrowDown" &&
      suggestions.length
    ) {
      event.preventDefault();

      setRecipientSuggestionsOpen(
        true
      );

      setRecipientActiveIndex(
        (current) =>
          current >=
          suggestions.length - 1
            ? 0
            : current + 1
      );

      return;
    }

    if (
      event.key ===
        "ArrowUp" &&
      suggestions.length
    ) {
      event.preventDefault();

      setRecipientActiveIndex(
        (current) =>
          current <= 0
            ? suggestions.length - 1
            : current - 1
      );

      return;
    }

    if (
      event.key === "Escape"
    ) {
      setRecipientSuggestionsOpen(
        false
      );

      setRecipientActiveIndex(
        -1
      );

      return;
    }

    if (
      event.key === "Enter"
    ) {
      event.preventDefault();

      if (
        recipientActiveIndex >=
          0 &&
        suggestions[
          recipientActiveIndex
        ]
      ) {
        addRecipient(
          normalizeRecipient(
            suggestions[
              recipientActiveIndex
            ]
          ),
          type
        );

        return;
      }

      addTypedRecipients(type);
      return;
    }

    if (
      event.key === "," ||
      event.key === ";"
    ) {
      event.preventDefault();

      addTypedRecipients(type);
      return;
    }

    if (
      event.key === "Tab" &&
      recipientQuery.trim()
    ) {
      if (
        recipientActiveIndex >=
          0 &&
        suggestions[
          recipientActiveIndex
        ]
      ) {
        event.preventDefault();

        addRecipient(
          normalizeRecipient(
            suggestions[
              recipientActiveIndex
            ]
          ),
          type
        );
      } else if (
        isValidEmail(
          recipientQuery.trim()
        )
      ) {
        event.preventDefault();

        addRecipient(
          recipientQuery,
          type
        );
      }
    }

    if (
      event.key === "Backspace" &&
      !recipientQuery
    ) {
      const chips =
        getRecipientList(
          type
        );

      if (chips.length > 0) {
        removeRecipient(
          chips[chips.length - 1],
          type
        );
      }
    }
  }

  function focusRecipientType(
    type
  ) {
    setRecipientType(type);
    setRecipientQuery("");
    setRecipientSuggestions([]);
    setRecipientSuggestionsOpen(
      false
    );
    setRecipientActiveIndex(-1);

    setTimeout(() => {
      recipientInputRef.current?.focus();
    }, 0);
  }

  function openComposer(
    options = {}
  ) {
    const {
      to = [],
      cc = [],
      bcc = [],
      subject = "",
      body = "",
    } = options;

    setRecipientChips(
      uniqueEmails(
        Array.isArray(to)
          ? to
          : to
          ? [to]
          : []
      )
    );

    setCcChips(
      uniqueEmails(
        Array.isArray(cc)
          ? cc
          : cc
          ? [cc]
          : []
      )
    );

    setBccChips(
      uniqueEmails(
        Array.isArray(bcc)
          ? bcc
          : bcc
          ? [bcc]
          : []
      )
    );

    setRecipientQuery("");
    setRecipientSuggestions([]);
    setRecipientSuggestionsOpen(
      false
    );
    setRecipientActiveIndex(-1);
    setRecipientType("to");

    setShowCc(
      Array.isArray(cc)
        ? cc.length > 0
        : Boolean(cc)
    );

    setShowBcc(
      Array.isArray(bcc)
        ? bcc.length > 0
        : Boolean(bcc)
    );

    setComposeSubject(subject);
    setComposeBody(body);
    setComposeOpen(true);
  }

  function closeComposer() {
    if (sending) return;

    setComposeOpen(false);
    setRecipientQuery("");
    setRecipientSuggestions([]);
    setRecipientSuggestionsOpen(
      false
    );
    setRecipientActiveIndex(-1);
  }

  /*
   * SEND
   */

  async function sendMessage(event) {
    event.preventDefault();

    if (!mailbox?.id) return;

    if (
      recipientQuery.trim()
    ) {
      if (
        isValidEmail(
          recipientQuery.trim()
        )
      ) {
        addRecipient(
          recipientQuery,
          recipientType
        );
      } else {
        showToast(
          "Finish or remove the recipient you're typing.",
          "error"
        );

        return;
      }
    }

    if (
      recipientChips.length === 0
    ) {
      showToast(
        "Add at least one recipient.",
        "error"
      );

      return;
    }

    setSending(true);

    try {
      const response =
        await fetch(
          `${API_URL}/mail/messages`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              mailboxId:
                mailbox.id,

              sender:
                mailbox.email,

              recipients:
                recipientChips,

              cc:
                ccChips,

              bcc:
                bccChips,

              subject:
                composeSubject.trim(),

              bodyText:
                composeBody,

              folder: "sent",
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Send failed (${response.status})`
        );
      }

      setRecipientChips([]);
      setCcChips([]);
      setBccChips([]);
      setRecipientQuery("");
      setRecipientSuggestions([]);
      setRecipientSuggestionsOpen(
        false
      );
      setRecipientActiveIndex(-1);
      setShowCc(false);
      setShowBcc(false);
      setComposeSubject("");
      setComposeBody("");
      setComposeOpen(false);

      await loadFolders();

      if (
        resolvedActiveFolder ===
        "sent"
      ) {
        await loadMessages();
      }

      showToast(
        "Message sent successfully."
      );
    } catch (error) {
      console.error(
        "[Fades Mail] Send error:",
        error
      );

      showToast(
        error.message ||
          "Unable to send message.",
        "error"
      );
    } finally {
      setSending(false);
    }
  }

  /*
   * FOLDERS
   */

  function selectFolder(
    type,
    id = null
  ) {
    setSelectedMessage(null);
    setSelectedIds([]);
    setSearch("");

    setActiveFolder(
      id
        ? `${type}:${id}`
        : type
    );

    setSidebarOpen(false);
  }

  /*
   * KEYBOARD SHORTCUTS
   */

  useEffect(() => {
    function handleKeyDown(event) {
      const target =
        event.target;

      const isTyping =
        target instanceof
          HTMLElement &&
        (target.tagName ===
          "INPUT" ||
          target.tagName ===
            "TEXTAREA" ||
          target.isContentEditable);

      if (
        event.key === "/" &&
        !isTyping &&
        !composeOpen
      ) {
        event.preventDefault();

        const searchInput =
          document.querySelector(
            ".search-box input"
          );

        searchInput?.focus();

        return;
      }

      if (
        event.key.toLowerCase() ===
          "c" &&
        !isTyping &&
        !composeOpen &&
        authenticated
      ) {
        event.preventDefault();

        openComposer();

        return;
      }

      if (
        event.key === "Escape"
      ) {
        if (composeOpen) {
          closeComposer();
          return;
        }

        if (selectedMessage) {
          setSelectedMessage(
            null
          );
          return;
        }

        if (sidebarOpen) {
          setSidebarOpen(false);
        }
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    authenticated,
    composeOpen,
    selectedMessage,
    sidebarOpen,
    sending,
  ]);

  /*
   * AUTH LOADING
   */

  if (authLoading) {
    return (
      <main className="auth-page">
        <div className="auth-loading-card">
          <div className="loading-logo">
            F
          </div>

          <div className="spinner" />

          <p>
            Connecting to Fades Mail
          </p>

          <span>
            Securing your mailbox...
          </span>
        </div>
      </main>
    );
  }

  /*
   * AUTH
   */

  if (!authenticated) {
    return (
      <main className="auth-page">
        <div className="auth-shell">
          <div className="auth-brand">
            <div className="auth-brand-mark">
              F
            </div>

            <div>
              <strong>
                Fades Mail
              </strong>

              <span>
                Private email, beautifully
                simple.
              </span>
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
                {authMode ===
                "signin"
                  ? "Welcome back."
                  : "Create your mailbox."}
              </h1>

              <p>
                {authMode ===
                "signin"
                  ? "Sign in to continue to your Fades Mail account."
                  : "Create your own Fades Mail address and start sending."}
              </p>
            </div>

            <form
              className="auth-form"
              onSubmit={submitAuth}
            >
              {authMode ===
                "signup" && (
                <label>
                  <span>
                    Username
                  </span>

                  <div className="input-shell">
                    <input
                      type="text"
                      value={username}
                      onChange={(
                        event
                      ) =>
                        setUsername(
                          event.target
                            .value
                        )
                      }
                      placeholder="yourname"
                      autoComplete="username"
                      required
                    />

                    <small>
                      @fades.lol
                    </small>
                  </div>

                  <em>
                    Your new address
                    will{" "}
                    {username
                      ? `${username.toLowerCase()}@fades.lol`
                      : "yourname@fades.lol"}
                  </em>
                </label>
              )}

              <label>
                <span>
                  Email
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(
                    event
                  ) =>
                    setEmail(
                      event.target
                        .value
                    )
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                <span>
                  Password
                </span>

                <input
                  type="password"
                  value={password}
                  onChange={(
                    event
                  ) =>
                    setPassword(
                      event.target
                        .value
                    )
                  }
                  placeholder="Your password"
                  autoComplete={
                    authMode ===
                    "signin"
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
                disabled={
                  authSubmitting
                }
              >
                <span>
                  {authSubmitting
                    ? "Please wait..."
                    : authMode ===
                      "signin"
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
                {authMode ===
                "signin"
                  ? "Don't have an account?"
                  : "Already have an account?"}
              </span>

              <button
                type="button"
                onClick={() => {
                  setAuthError("");

                  setAuthMode(
                    authMode ===
                      "signin"
                      ? "signup"
                      : "signin"
                  );
                }}
              >
                {authMode ===
                "signin"
                  ? "Create one"
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

            <span>•</span>

            <span>
              Private by design
            </span>
          </div>
        </div>
      </main>
    );
  }

  /*
   * MAIL APP
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
          <Icon
            name="menu"
            size={20}
          />
        </button>

        <div className="brand">
          <div className="brand-mark">
            F
          </div>

          <div className="brand-copy">
            <strong>
              Fades
            </strong>

            <span>
              Mail
            </span>
          </div>
        </div>

        <div className="search-box">
          <Icon
            name="search"
            size={18}
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search your mail"
          />

          {search && (
            <button
              className="clear-search"
              type="button"
              onClick={() =>
                setSearch("")
              }
              aria-label="Clear search"
            >
              <Icon
                name="close"
                size={15}
              />
            </button>
          )}
        </div>

        <div className="top-actions">
          <button
            className="icon-button"
            type="button"
            title="Refresh"
            onClick={() => {
              loadFolders();
              loadMessages();
            }}
          >
            <Icon
              name="refresh"
              size={18}
            />
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
              type="button"
              onClick={logout}
              title="Sign out"
            >
              <Icon
                name="logout"
                size={17}
              />
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
              type="button"
              onClick={() => {
                openComposer();

                setSidebarOpen(
                  false
                );
              }}
            >
              <Icon
                name="plus"
                size={18}
              />

              <span>
                Compose
              </span>
            </button>

            <button
              className="close-sidebar"
              type="button"
              onClick={() =>
                setSidebarOpen(
                  false
                )
              }
              aria-label="Close sidebar"
            >
              <Icon
                name="close"
                size={18}
              />
            </button>
          </div>

          <div className="mail-summary">
            <div>
              <span className="summary-label">
                Mailbox
              </span>

              <strong>
                {mailbox?.email ||
                  "Loading..."}
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
                    key={
                      folder.type
                    }
                    type="button"
                    className={`folder-button ${
                      active
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
                      <Icon
                        name={
                          folder.icon
                        }
                        size={17}
                      />
                    </span>

                    <span className="folder-name">
                      {
                        folder.name
                      }
                    </span>

                    {unread >
                      0 && (
                      <span className="unread-count">
                        {
                          unread
                        }
                      </span>
                    )}
                  </button>
                );
              }
            )}
          </nav>

          {folders.filter(
            (folder) =>
              folder.type ===
              "custom"
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
                .map(
                  (folder) => {
                    const active =
                      activeCustomFolderId ===
                      String(
                        folder.id
                      );

                    return (
                      <button
                        key={
                          folder.id
                        }
                        type="button"
                        className={`folder-button ${
                          active
                            ? "active"
                            : ""
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
                          {
                            folder.name
                          }
                        </span>

                        {Number(
                          folder.unreadCount ||
                            0
                        ) >
                          0 && (
                          <span className="unread-count">
                            {Number(
                              folder.unreadCount ||
                                0
                            )}
                          </span>
                        )}
                      </button>
                    );
                  }
                )}
            </div>
          )}

          <div className="sidebar-bottom">
            <div className="status-card">
              <div className="status-dot" />

              <div>
                <strong>
                  Fades Mail
                </strong>

                <span>
                  All systems
                  operational
                </span>
              </div>
            </div>
          </div>
        </aside>

        {sidebarOpen && (
          <button
            className="sidebar-overlay"
            type="button"
            onClick={() =>
              setSidebarOpen(
                false
              )
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
                  type="button"
                  onClick={() =>
                    setSelectedMessage(
                      null
                    )
                  }
                >
                  <Icon
                    name="arrowLeft"
                    size={18}
                  />

                  <span>
                    Back to{" "}
                    {currentFolderForDisplay?.name ||
                      "mail"}
                  </span>
                </button>

                <div className="toolbar-spacer" />

                <button
                  className={`toolbar-icon ${
                    selectedMessage.isStarred
                      ? "is-starred"
                      : ""
                  }`}
                  type="button"
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
                  type="button"
                  onClick={() =>
                    toggleRead(
                      selectedMessage
                    )
                  }
                  title={
                    selectedMessage.isRead
                      ? "Mark as unread"
                      : "Mark as read"
                  }
                  disabled={
                    actionLoading
                  }
                >
                  <Icon
                    name={
                      selectedMessage.isRead
                        ? "mail"
                        : "check"
                    }
                    size={18}
                  />
                </button>

                <button
                  className="toolbar-icon"
                  type="button"
                  onClick={() =>
                    moveMessage(
                      selectedMessage,
                      "archive"
                    )
                  }
                  title="Archive"
                  disabled={
                    actionLoading
                  }
                >
                  <Icon
                    name="archive"
                    size={18}
                  />
                </button>

                {resolvedActiveFolder ===
                "spam" ? (
                  <button
                    className="toolbar-icon"
                    type="button"
                    onClick={() =>
                      markAsNotSpam(
                        selectedMessage
                      )
                    }
                    title="Not spam"
                    disabled={
                      actionLoading
                    }
                  >
                    <Icon
                      name="inboxAction"
                      size={18}
                    />
                  </button>
                ) : (
                  <button
                    className="toolbar-icon spam"
                    type="button"
                    onClick={() =>
                      markAsSpam(
                        selectedMessage
                      )
                    }
                    title="Report spam"
                    disabled={
                      actionLoading
                    }
                  >
                    <Icon
                      name="ban"
                      size={18}
                    />
                  </button>
                )}

                <button
                  className="toolbar-icon danger"
                  type="button"
                  onClick={() =>
                    moveMessage(
                      selectedMessage,
                      "trash"
                    )
                  }
                  title="Delete"
                  disabled={
                    actionLoading
                  }
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
                        {
                          selectedMessage.sender
                        }
                      </span>

                      <span className="recipient-line">
                        To{" "}
                        {Array.isArray(
                          selectedMessage.recipients
                        )
                          ? selectedMessage.recipients
                              .map(
                                normalizeRecipient
                              )
                              .join(
                                ", "
                              )
                          : "you"}
                      </span>

                      {Array.isArray(
                        selectedMessage.cc
                      ) &&
                        selectedMessage.cc.length >
                          0 && (
                          <span className="recipient-line">
                            Cc{" "}
                            {selectedMessage.cc
                              .map(
                                normalizeRecipient
                              )
                              .join(
                                ", "
                              )}
                          </span>
                        )}
                    </div>

                    <time>
                      {formatDate(
                        selectedMessage.receivedAt ||
                          selectedMessage.received_at ||
                          selectedMessage.createdAt ||
                          selectedMessage.created_at
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
                    type="button"
                    onClick={() =>
                      openComposer({
                        to: selectedMessage.sender,
                        subject: `Re: ${
                          selectedMessage.subject ||
                          ""
                        }`,
                      })
                    }
                  >
                    <Icon
                      name="reply"
                      size={17}
                    />

                    Reply
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      openComposer({
                        to: selectedMessage.sender,
                        subject: `Fwd: ${
                          selectedMessage.subject ||
                          ""
                        }`,
                        body: `\n\n---------- Forwarded message ----------\nFrom: ${
                          selectedMessage.sender ||
                          ""
                        }\nSubject: ${
                          selectedMessage.subject ||
                          "(No subject)"
                        }\n\n${
                          selectedMessage.bodyText ||
                          selectedMessage.body_text ||
                          ""
                        }`,
                      })
                    }
                  >
                    <Icon
                      name="forward"
                      size={17}
                    />

                    Forward
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      toggleRead(
                        selectedMessage
                      )
                    }
                  >
                    <Icon
                      name={
                        selectedMessage.isRead
                          ? "mail"
                          : "check"
                      }
                      size={17}
                    />

                    {selectedMessage.isRead
                      ? "Mark unread"
                      : "Mark read"}
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

                    {unreadCount >
                      0 &&
                      resolvedActiveFolder ===
                        "inbox" && (
                        <span className="title-badge">
                          {
                            unreadCount
                          }{" "}
                          unread
                        </span>
                      )}
                  </div>
                </div>

                <div className="content-actions">
                  <span className="message-count">
                    {
                      messages.length
                    }
                  </span>

                  <span>
                    {messages.length ===
                    1
                      ? "message"
                      : "messages"}
                  </span>
                </div>
              </div>

              {selectedCount >
                0 && (
                <div className="bulk-toolbar">
                  <div className="bulk-toolbar-left">
                    <button
                      className="bulk-select-button"
                      type="button"
                      onClick={
                        toggleSelectAll
                      }
                      title={
                        allVisibleSelected
                          ? "Clear selection"
                          : "Select all"
                      }
                    >
                      <span
                        className={`custom-checkbox ${
                          allVisibleSelected
                            ? "checked"
                            : ""
                        }`}
                      >
                        {allVisibleSelected && (
                          <Icon
                            name="check"
                            size={12}
                          />
                        )}
                      </span>
                    </button>

                    <span className="bulk-count">
                      {selectedCount}{" "}
                      selected
                    </span>
                  </div>

                  <div className="bulk-actions">
                    <button
                      className="bulk-action"
                      type="button"
                      onClick={
                        bulkMarkRead
                      }
                      disabled={
                        actionLoading
                      }
                      title="Mark as read"
                    >
                      <Icon
                        name="check"
                        size={16}
                      />

                      <span>
                        Read
                      </span>
                    </button>

                    <button
                      className="bulk-action"
                      type="button"
                      onClick={() =>
                        bulkMove(
                          "archive"
                        )
                      }
                      disabled={
                        actionLoading
                      }
                      title="Archive"
                    >
                      <Icon
                        name="archive"
                        size={16}
                      />

                      <span>
                        Archive
                      </span>
                    </button>

                    <button
                      className="bulk-action spam"
                      type="button"
                      onClick={() =>
                        bulkMove(
                          "spam"
                        )
                      }
                      disabled={
                        actionLoading
                      }
                      title="Report spam"
                    >
                      <Icon
                        name="ban"
                        size={16}
                      />

                      <span>
                        Spam
                      </span>
                    </button>

                    <button
                      className="bulk-action danger"
                      type="button"
                      onClick={() =>
                        bulkMove(
                          "trash"
                        )
                      }
                      disabled={
                        actionLoading
                      }
                      title="Move to trash"
                    >
                      <Icon
                        name="trash"
                        size={16}
                      />

                      <span>
                        Delete
                      </span>
                    </button>

                    <button
                      className="bulk-action"
                      type="button"
                      onClick={
                        clearSelection
                      }
                      title="Clear selection"
                    >
                      <Icon
                        name="close"
                        size={16}
                      />

                      <span>
                        Clear
                      </span>
                    </button>
                  </div>
                </div>
              )}

              <div className="message-list">
                {messagesLoading ? (
                  <div className="empty-state">
                    <div className="loading-ring" />

                    <h2>
                      Loading your mail
                    </h2>

                    <p>
                      Fetching your
                      latest
                      messages...
                    </p>
                  </div>
                ) : messages.length ===
                  0 ? (
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
                        : resolvedActiveFolder ===
                          "spam"
                        ? "Spam is empty"
                        : "Your inbox is empty"}
                    </h2>

                    <p>
                      {search
                        ? "Try searching for another sender, subject, or phrase."
                        : resolvedActiveFolder ===
                          "spam"
                        ? "Messages reported as spam will appear here."
                        : "When messages arrive, they'll appear here."}
                    </p>

                    {!search &&
                      resolvedActiveFolder ===
                        "inbox" && (
                        <button
                          className="empty-compose"
                          type="button"
                          onClick={() =>
                            openComposer()
                          }
                        >
                          <Icon
                            name="plus"
                            size={17}
                          />

                          Compose a
                          message
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
                        message.received_at ||
                        message.createdAt ||
                        message.created_at;

                      const isSelected =
                        selectedIds.includes(
                          message.id
                        );

                      return (
                        <div
                          key={
                            message.id
                          }
                          className={`message-row ${
                            message.isRead
                              ? ""
                              : "unread"
                          } ${
                            isSelected
                              ? "selected"
                              : ""
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
                              event.preventDefault();

                              openMessage(
                                message
                              );
                            }
                          }}
                        >
                          <div
                            className="row-select"
                            onClick={(
                              event
                            ) =>
                              event.stopPropagation()
                            }
                          >
                            <input
                              className="row-check"
                              type="checkbox"
                              checked={
                                isSelected
                              }
                              onChange={() =>
                                toggleSelectedMessage(
                                  message.id
                                )
                              }
                              aria-label={`Select message from ${sender}`}
                            />
                          </div>

                          <div className="row-avatar">
                            {getInitial(
                              sender
                            )}
                          </div>

                          <div className="row-main">
                            <div className="row-top">
                              <strong>
                                {
                                  sender
                                }
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

                          <div className="row-actions">
                            <button
                              className={`row-star ${
                                message.isStarred
                                  ? "starred"
                                  : ""
                              }`}
                              type="button"
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
                              <Icon
                                name="star"
                                size={17}
                              />
                            </button>

                            <button
                              className="row-action"
                              type="button"
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                toggleRead(
                                  message
                                );
                              }}
                              title={
                                message.isRead
                                  ? "Mark unread"
                                  : "Mark read"
                              }
                              aria-label={
                                message.isRead
                                  ? "Mark unread"
                                  : "Mark read"
                              }
                            >
                              <Icon
                                name={
                                  message.isRead
                                    ? "mail"
                                    : "check"
                                }
                                size={16}
                              />
                            </button>

                            {resolvedActiveFolder !==
                              "spam" && (
                              <button
                                className="row-action spam"
                                type="button"
                                onClick={(
                                  event
                                ) => {
                                  event.stopPropagation();

                                  markAsSpam(
                                    message
                                  );
                                }}
                                title="Report spam"
                                aria-label="Report spam"
                              >
                                <Icon
                                  name="ban"
                                  size={16}
                                />
                              </button>
                            )}

                            <button
                              className="row-action danger"
                              type="button"
                              onClick={(
                                event
                              ) => {
                                event.stopPropagation();

                                moveMessage(
                                  message,
                                  "trash"
                                );
                              }}
                              title="Delete"
                              aria-label="Delete message"
                            >
                              <Icon
                                name="trash"
                                size={16}
                              />
                            </button>
                          </div>

                          <div className="row-chevron">
                            <Icon
                              name="chevron"
                              size={16}
                            />
                          </div>
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
              closeComposer();
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

                <strong>
                  New message
                </strong>

                <span className="compose-account">
                  Sending from{" "}
                  {mailbox?.email ||
                    ""}
                </span>
              </div>

              <button
                type="button"
                onClick={
                  closeComposer
                }
                aria-label="Close composer"
                disabled={sending}
              >
                <Icon
                  name="close"
                  size={19}
                />
              </button>
            </div>

            <div className="compose-fields">
              <div className="compose-field recipient-field">
                <div className="recipient-label">
                  <span>
                    To
                  </span>

                  <div className="recipient-options">
                    {!showCc && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowCc(
                            true
                          )
                        }
                      >
                        Cc
                      </button>
                    )}

                    {!showBcc && (
                      <button
                        type="button"
                        onClick={() =>
                          setShowBcc(
                            true
                          )
                        }
                      >
                        Bcc
                      </button>
                    )}
                  </div>
                </div>

                <div
                  className={`recipient-composer ${
                    recipientSuggestionsOpen
                      ? "suggestions-open"
                      : ""
                  }`}
                >
                  {recipientChips.map(
                    (
                      recipient
                    ) => (
                      <span
                        className="recipient-chip"
                        key={
                          recipient
                        }
                      >
                        <span>
                          {
                            recipient
                          }
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            removeRecipient(
                              recipient,
                              "to"
                            )
                          }
                          aria-label={`Remove ${recipient}`}
                        >
                          ×
                        </button>
                      </span>
                    )
                  )}

                  <input
                    ref={
                      recipientInputRef
                    }
                    className="recipient-input"
                    value={
                      recipientType ===
                      "to"
                        ? recipientQuery
                        : ""
                    }
                    onFocus={() => {
                      setRecipientType(
                        "to"
                      );

                      if (
                        recipientQuery.trim()
                      ) {
                        setRecipientSuggestionsOpen(
                          true
                        );
                      }
                    }}
                    onChange={(
                      event
                    ) => {
                      setRecipientType(
                        "to"
                      );

                      setRecipientQuery(
                        event.target
                          .value
                      );

                      setRecipientSuggestionsOpen(
                        true
                      );
                    }}
                    onKeyDown={(
                      event
                    ) =>
                      handleRecipientKeyDown(
                        event,
                        "to"
                      )
                    }
                    placeholder={
                      recipientChips.length
                        ? "Add recipient..."
                        : "Search people or enter an email"
                    }
                    autoFocus
                    autoComplete="off"
                  />

                  {recipientSuggestionsOpen &&
                    (recipientLoading ||
                      recipientSuggestions.length >
                        0) && (
                      <div className="recipient-suggestions">
                        {recipientLoading && (
                          <div className="recipient-search-status">
                            Searching...
                          </div>
                        )}

                        {!recipientLoading &&
                          recipientSuggestions.map(
                            (
                              recipient,
                              index
                            ) => {
                              const recipientEmail =
                                normalizeRecipient(
                                  recipient
                                );

                              const recipientName =
                                getRecipientName(
                                  recipient
                                );

                              if (
                                !recipientEmail
                              ) {
                                return null;
                              }

                              return (
                                <button
                                  type="button"
                                  className={`recipient-suggestion ${
                                    index ===
                                    recipientActiveIndex
                                      ? "active"
                                      : ""
                                  }`}
                                  key={`${recipientEmail}-${index}`}
                                  onMouseDown={(
                                    event
                                  ) =>
                                    event.preventDefault()
                                  }
                                  onClick={() =>
                                    addRecipient(
                                      recipientEmail,
                                      "to"
                                    )
                                  }
                                >
                                  <div className="recipient-suggestion-avatar">
                                    {getInitial(
                                      recipientName
                                    )}
                                  </div>

                                  <div>
                                    <strong>
                                      {
                                        recipientName
                                      }
                                    </strong>

                                    <span>
                                      {
                                        recipientEmail
                                      }
                                    </span>
                                  </div>
                                </button>
                              );
                            }
                          )}
                      </div>
                    )}
                </div>
              </div>

              {showCc && (
                <div className="compose-field recipient-field">
                  <div className="recipient-label">
                    <span>
                      Cc
                    </span>

                    <button
                      className="recipient-remove-field"
                      type="button"
                      onClick={() => {
                        setShowCc(
                          false
                        );
                        setCcChips([]);
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="recipient-composer">
                    {ccChips.map(
                      (
                        recipient
                      ) => (
                        <span
                          className="recipient-chip"
                          key={
                            recipient
                          }
                        >
                          <span>
                            {
                              recipient
                            }
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              removeRecipient(
                                recipient,
                                "cc"
                              )
                            }
                            aria-label={`Remove ${recipient}`}
                          >
                            ×
                          </button>
                        </span>
                      )
                    )}

                    <input
                      className="recipient-input"
                      value={
                        recipientType ===
                        "cc"
                          ? recipientQuery
                          : ""
                      }
                      onFocus={() => {
                        setRecipientType(
                          "cc"
                        );

                        setRecipientQuery(
                          ""
                        );
                      }}
                      onChange={(
                        event
                      ) => {
                        setRecipientType(
                          "cc"
                        );

                        setRecipientQuery(
                          event.target
                            .value
                        );

                        setRecipientSuggestionsOpen(
                          true
                        );
                      }}
                      onKeyDown={(
                        event
                      ) =>
                        handleRecipientKeyDown(
                          event,
                          "cc"
                        )
                      }
                      placeholder="Add Cc recipient..."
                      autoComplete="off"
                    />
                  </div>
                </div>
              )}

              {showBcc && (
                <div className="compose-field recipient-field">
                  <div className="recipient-label">
                    <span>
                      Bcc
                    </span>

                    <button
                      className="recipient-remove-field"
                      type="button"
                      onClick={() => {
                        setShowBcc(
                          false
                        );
                        setBccChips([]);
                      }}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="recipient-composer">
                    {bccChips.map(
                      (
                        recipient
                      ) => (
                        <span
                          className="recipient-chip"
                          key={
                            recipient
                          }
                        >
                          <span>
                            {
                              recipient
                            }
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              removeRecipient(
                                recipient,
                                "bcc"
                              )
                            }
                            aria-label={`Remove ${recipient}`}
                          >
                            ×
                          </button>
                        </span>
                      )
                    )}

                    <input
                      className="recipient-input"
                      value={
                        recipientType ===
                        "bcc"
                          ? recipientQuery
                          : ""
                      }
                      onFocus={() => {
                        setRecipientType(
                          "bcc"
                        );

                        setRecipientQuery(
                          ""
                        );
                      }}
                      onChange={(
                        event
                      ) => {
                        setRecipientType(
                          "bcc"
                        );

                        setRecipientQuery(
                          event.target
                            .value
                        );

                        setRecipientSuggestionsOpen(
                          true
                        );
                      }}
                      onKeyDown={(
                        event
                      ) =>
                        handleRecipientKeyDown(
                          event,
                          "bcc"
                        )
                      }
                      placeholder="Add Bcc recipient..."
                      autoComplete="off"
                    />
                  </div>
                </div>
              )}

              <div className="compose-field">
                <span>
                  Subject
                </span>

                <input
                  value={
                    composeSubject
                  }
                  onChange={(
                    event
                  ) =>
                    setComposeSubject(
                      event.target
                        .value
                    )
                  }
                  placeholder="Subject"
                />
              </div>

              <textarea
                value={composeBody}
                onChange={(
                  event
                ) =>
                  setComposeBody(
                    event.target
                      .value
                  )
                }
                placeholder="Write your message..."
              />
            </div>

            <div className="compose-footer">
              <span>
                Enter or comma adds a
                recipient. Use ↑/↓ to
                navigate suggestions.
              </span>

              <button
                className="send-button"
                type="submit"
                disabled={
                  sending ||
                  recipientChips.length ===
                    0
                }
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

      {toast && (
        <div
          className={`mail-toast ${
            toast.type === "error"
              ? "error"
              : "success"
          }`}
        >
          <span className="mail-toast-icon">
            {toast.type ===
            "error" ? (
              "!"
            ) : (
              <Icon
                name="check"
                size={15}
              />
            )}
          </span>

          <span>
            {toast.message}
          </span>

          <button
            type="button"
            onClick={() =>
              setToast(null)
            }
            aria-label="Dismiss notification"
          >
            <Icon
              name="close"
              size={14}
            />
          </button>
        </div>
      )}
    </main>
  );
}
