import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  apiFetch,
  errorFromResponse,
} from "../lib/api";

import { countLabel } from "../lib/format";

// ============================================================
// FADES MAIL — MESSAGE HOOK
// ============================================================
//
// Live mail:
//   - Refreshes inbox every 10 seconds
//   - Refreshes folder/unread counts
//   - Immediately refreshes when returning to the tab
//
// Notifications:
//   - Desktop notifications
//   - Notification sounds
//   - Detects newly arrived messages
//   - Does not notify for existing mail on first load
//   - Prevents duplicate notifications
//
// No WebSocket / SSE / push backend is required.
//
// The browser simply polls the existing Fades Mail API.
//

// ============================================================
// CONFIG
// ============================================================

const LIVE_REFRESH_INTERVAL = 10 * 1000;

const DESKTOP_NOTIFICATIONS_KEY =
  "fades.mail.desktopNotifications";

const SOUND_NOTIFICATIONS_KEY =
  "fades.mail.soundNotifications";

const NOTIFICATION_SOUND =
  "/sounds/new-mail.mp3";

// ============================================================
// BULK HELPER
// ============================================================

async function runBulk(ids, request) {
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        const response = await request(id);
        return response.ok;
      } catch {
        return false;
      }
    })
  );

  return results.filter(Boolean).length;
}

// ============================================================
// HOOK
// ============================================================

/**
 * Message list + message actions + live mail
 * notification system.
 */
export function useMessages({
  mailbox,
  resolvedActiveFolder,
  search,
  loadFolders,
  showToast,
  onUnauthorized,
}) {
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] =
    useState(null);

  const [selectedIds, setSelectedIds] =
    useState([]);

  const [messagesLoading, setMessagesLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  // ----------------------------------------------------------
  // Refs
  // ----------------------------------------------------------

  // Prevent overlapping silent refreshes.
  const refreshInProgressRef = useRef(false);

  // IDs of messages that we've already seen.
  const seenMessageIdsRef = useRef(new Set());

  // Whether we've established the initial inbox state.
  const notificationInitializedRef =
    useRef(false);

  // Keep the latest loadFolders function available
  // to the polling system.
  const loadFoldersRef = useRef(loadFolders);

  useEffect(() => {
    loadFoldersRef.current = loadFolders;
  }, [loadFolders]);

  const selectedCount = selectedIds.length;

  const allVisibleSelected =
    messages.length > 0 &&
    messages.every((message) =>
      selectedIds.includes(message.id)
    );

  // ==========================================================
  // NOTIFICATION SETTINGS
  // ==========================================================

  function desktopNotificationsEnabled() {
    return (
      typeof window !== "undefined" &&
      localStorage.getItem(
        DESKTOP_NOTIFICATIONS_KEY
      ) === "true"
    );
  }

  function soundNotificationsEnabled() {
    return (
      typeof window !== "undefined" &&
      localStorage.getItem(
        SOUND_NOTIFICATIONS_KEY
      ) === "true"
    );
  }

  // ==========================================================
  // PLAY NOTIFICATION SOUND
  // ==========================================================

  function playNotificationSound() {
    if (!soundNotificationsEnabled()) {
      return;
    }

    try {
      const audio = new Audio(
        NOTIFICATION_SOUND
      );

      audio.volume = 0.75;

      audio.play().catch(() => {
        // Browsers may block autoplay depending on
        // whether the user has interacted with the page.
      });
    } catch {
      // Ignore sound errors.
    }
  }

  // ==========================================================
  // SHOW DESKTOP NOTIFICATION
  // ==========================================================

  function showDesktopNotification(message) {
    if (
      !desktopNotificationsEnabled()
    ) {
      return;
    }

    if (
      typeof window === "undefined" ||
      typeof Notification === "undefined"
    ) {
      return;
    }

    if (
      Notification.permission !== "granted"
    ) {
      return;
    }

    const sender =
      message.sender_name ||
      message.sender ||
      "New email";

    const subject =
      message.subject ||
      "You received a new email.";

    try {
      const notification =
        new Notification(
          sender,
          {
            body: subject,
            icon: "/logo.png",
            tag: `fades-mail-${message.id}`,
          }
        );

      notification.onclick = () => {
        window.focus();

        notification.close();
      };
    } catch (error) {
      console.error(
        "[Fades Mail] Notification error:",
        error
      );
    }
  }

  // ==========================================================
  // NOTIFY ABOUT NEW MESSAGE
  // ==========================================================

  function notifyNewMessage(message) {
    showDesktopNotification(message);
    playNotificationSound();
  }

  // ==========================================================
  // TRACK INITIAL MESSAGES
  // ==========================================================

  function establishNotificationBaseline(
    messageList
  ) {
    seenMessageIdsRef.current.clear();

    for (const message of messageList) {
      if (message?.id !== undefined) {
        seenMessageIdsRef.current.add(
          String(message.id)
        );
      }
    }

    notificationInitializedRef.current = true;
  }

  // ==========================================================
  // DETECT NEW MESSAGES
  // ==========================================================

  function detectNewMessages(messageList) {
    if (!Array.isArray(messageList)) {
      return;
    }

    // First request establishes the baseline.
    //
    // This prevents Fades Mail from notifying the user
    // about every email they already had when opening
    // the website.
    if (
      !notificationInitializedRef.current
    ) {
      establishNotificationBaseline(
        messageList
      );

      return;
    }

    const newMessages = [];

    for (const message of messageList) {
      if (!message?.id) continue;

      const id = String(message.id);

      if (
        !seenMessageIdsRef.current.has(id)
      ) {
        newMessages.push(message);
      }
    }

    // Update the seen set.
    for (const message of messageList) {
      if (!message?.id) continue;

      seenMessageIdsRef.current.add(
        String(message.id)
      );
    }

    // Notify for every genuinely new message.
    //
    // Usually there will only be one, but if the browser
    // was asleep for a while and multiple messages arrived,
    // this handles all of them.
    for (const message of newMessages) {
      notifyNewMessage(message);
    }
  }

  // ==========================================================
  // LOAD MESSAGES
  // ==========================================================

  const loadMessages = useCallback(
    async (options = {}) => {
      if (!mailbox?.id) return;

      const silent =
        options.silent === true;

      // Prevent automatic refresh requests from
      // overlapping.
      if (
        silent &&
        refreshInProgressRef.current
      ) {
        return;
      }

      if (silent) {
        refreshInProgressRef.current = true;
      } else {
        setMessagesLoading(true);
      }

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
          await apiFetch(
            `/mail/messages?${params.toString()}`
          );

        if (!response.ok) {
          if (
            response.status === 401
          ) {
            onUnauthorized();
          }

          throw new Error(
            `Message request failed (${response.status})`
          );
        }

        const data =
          await response.json();

        const nextMessages =
          Array.isArray(data)
            ? data
            : data.messages || [];

        // Detect new messages BEFORE updating
        // the visible inbox.
        //
        // Only run notification detection when
        // we're looking at the inbox.
        if (
          resolvedActiveFolder ===
            "inbox" ||
          !resolvedActiveFolder
        ) {
          detectNewMessages(
            nextMessages
          );
        }

        setMessages(
          nextMessages
        );

        // Silent live refreshes preserve the user's
        // current selections.
        if (!silent) {
          setSelectedIds([]);
        }
      } catch (error) {
        console.error(
          "[Fades Mail] Message error:",
          error
        );

        // Don't destroy the visible inbox during
        // a temporary background network failure.
        if (!silent) {
          setMessages([]);
          setSelectedIds([]);
        }
      } finally {
        if (silent) {
          refreshInProgressRef.current =
            false;
        } else {
          setMessagesLoading(false);
        }
      }
    },
    [
      mailbox,
      resolvedActiveFolder,
      search,
      onUnauthorized,
    ]
  );

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    if (!mailbox) return;

    // Reset notification tracking when switching
    // mailboxes/accounts.
    seenMessageIdsRef.current.clear();

    notificationInitializedRef.current =
      false;

    loadMessages();
  }, [
    mailbox,
    loadMessages,
  ]);

  // ==========================================================
  // LIVE MAIL POLLING
  // ==========================================================

  useEffect(() => {
    if (!mailbox?.id) return;

    let interval = null;
    let active = true;

    async function refreshLive() {
      if (!active) return;

      // Don't poll hidden tabs.
      if (
        typeof document !==
          "undefined" &&
        document.visibilityState !==
          "visible"
      ) {
        return;
      }

      await loadMessages({
        silent: true,
      });

      await loadFoldersRef.current();
    }

    function startPolling() {
      if (interval) {
        clearInterval(interval);
      }

      interval = setInterval(
        refreshLive,
        LIVE_REFRESH_INTERVAL
      );
    }

    function stopPolling() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    }

    function handleVisibilityChange() {
      if (
        document.visibilityState ===
        "visible"
      ) {
        // Immediately update when the user
        // comes back to Fades Mail.
        refreshLive();

        startPolling();
      } else {
        stopPolling();
      }
    }

    // Start the live refresh timer.
    startPolling();

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      active = false;

      stopPolling();

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [
    mailbox?.id,
    loadMessages,
  ]);

  // ==========================================================
  // REFRESH EVERYTHING
  // ==========================================================

  async function refreshAll() {
    await loadMessages();
    await loadFolders();
  }

  // ==========================================================
  // RESET
  // ==========================================================

  const reset = useCallback(() => {
    setMessages([]);
    setSelectedMessage(null);
    setSelectedIds([]);

    seenMessageIdsRef.current.clear();

    notificationInitializedRef.current =
      false;
  }, []);

  // ==========================================================
  // OPEN MESSAGE
  // ==========================================================

  async function openMessage(
    message
  ) {
    if (!mailbox?.id) return;

    try {
      const response =
        await apiFetch(
          `/mail/messages/${message.id}?mailboxId=${mailbox.id}`
        );

      if (!response.ok) {
        throw new Error(
          `Message request failed (${response.status})`
        );
      }

      const data =
        await response.json();

      setSelectedMessage(
        data?.message || data
      );

      if (!message.isRead) {
        await apiFetch(
          `/mail/messages/${message.id}/read`,
          {
            method: "POST",
            json: {
              mailboxId:
                mailbox.id,
            },
          }
        );

        await loadMessages();
        await loadFolders();
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

  // ==========================================================
  // STAR
  // ==========================================================

  async function toggleStar(
    message
  ) {
    if (!mailbox?.id) return;

    const endpoint =
      message.isStarred
        ? "unstar"
        : "star";

    try {
      const response =
        await apiFetch(
          `/mail/messages/${message.id}/${endpoint}`,
          {
            method: "POST",
            json: {
              mailboxId:
                mailbox.id,
            },
          }
        );

      if (!response.ok) {
        throw new Error(
          `Star request failed (${response.status})`
        );
      }

      const nextStarred =
        !message.isStarred;

      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? {
                ...item,
                isStarred:
                  nextStarred,
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
              nextStarred,
          })
        );
      }

      await loadFolders();
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

  // ==========================================================
  // READ / UNREAD
  // ==========================================================

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
        await apiFetch(
          `/mail/messages/${message.id}/${endpoint}`,
          {
            method: "POST",
            json: {
              mailboxId:
                mailbox.id,
            },
          }
        );

      if (!response.ok) {
        throw new Error(
          `Read request failed (${response.status})`
        );
      }

      const nextRead =
        !message.isRead;

      setMessages((current) =>
        current.map((item) =>
          item.id === message.id
            ? {
                ...item,
                isRead:
                  nextRead,
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
            isRead:
              nextRead,
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

  // ==========================================================
  // MOVE
  // ==========================================================

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
        await apiFetch(
          `/mail/messages/${message.id}/move`,
          {
            method: "POST",
            json: {
              mailboxId:
                mailbox.id,
              folder,
            },
          }
        );

      if (!response.ok) {
        throw new Error(
          await errorFromResponse(
            response,
            `Move request failed (${response.status})`
          )
        );
      }

      if (
        selectedMessage?.id ===
        message.id
      ) {
        setSelectedMessage(null);
      }

      if (!silent) {
        await refreshAll();
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

  // ==========================================================
  // PERMANENT DELETE
  // ==========================================================

  async function deleteMessagePermanently(
    message,
    options = {}
  ) {
    if (!mailbox?.id) return false;

    const silent =
      options.silent || false;

    setActionLoading(true);

    try {
      const response =
        await apiFetch(
          `/mail/messages/${message.id}?mailboxId=${mailbox.id}`,
          {
            method: "DELETE",
          }
        );

      if (!response.ok) {
        throw new Error(
          await errorFromResponse(
            response,
            `Delete request failed (${response.status})`
          )
        );
      }

      if (
        selectedMessage?.id ===
        message.id
      ) {
        setSelectedMessage(null);
      }

      if (!silent) {
        await refreshAll();
      }

      return true;
    } catch (error) {
      console.error(
        "[Fades Mail] Permanent delete error:",
        error
      );

      if (!silent) {
        showToast(
          error.message ||
            "Unable to delete message.",
          "error"
        );
      }

      return false;
    } finally {
      setActionLoading(false);
    }
  }

  // ==========================================================
  // TRASH
  // ==========================================================

  async function handleTrashButton(
    message
  ) {
    if (
      resolvedActiveFolder ===
      "trash"
    ) {
      const confirmed =
        window.confirm(
          "Permanently delete this message? This cannot be undone."
        );

      if (!confirmed) return;

      const success =
        await deleteMessagePermanently(
          message
        );

      if (success) {
        showToast(
          "Message permanently deleted."
        );
      }

      return;
    }

    await moveMessage(
      message,
      "trash"
    );
  }

  // ==========================================================
  // SPAM
  // ==========================================================

  async function markAsSpam(
    message
  ) {
    if (
      await moveMessage(
        message,
        "spam"
      )
    ) {
      showToast(
        "Message moved to Spam."
      );
    }
  }

  async function markAsNotSpam(
    message
  ) {
    if (
      await moveMessage(
        message,
        "inbox"
      )
    ) {
      showToast(
        "Message moved to Inbox."
      );
    }
  }

  // ==========================================================
  // SELECTION
  // ==========================================================

  function toggleSelectedMessage(
    messageId
  ) {
    setSelectedIds((current) =>
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
        (message) => message.id
      )
    );
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  // ==========================================================
  // BULK MOVE
  // ==========================================================

  async function bulkMove(
    folder
  ) {
    if (
      !mailbox?.id ||
      selectedIds.length === 0
    ) {
      return;
    }

    const ids = [
      ...selectedIds,
    ];

    setActionLoading(true);

    try {
      const successCount =
        await runBulk(
          ids,
          (messageId) =>
            apiFetch(
              `/mail/messages/${messageId}/move`,
              {
                method: "POST",
                json: {
                  mailboxId:
                    mailbox.id,
                  folder,
                },
              }
            )
        );

      setSelectedIds([]);

      await refreshAll();

      showToast(
        `${countLabel(
          successCount
        )} ${
          BULK_MOVE_RESULT[
            folder
          ] || "updated"
        }.`
      );
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

  // ==========================================================
  // BULK READ
  // ==========================================================

  async function bulkMarkRead() {
    if (
      !mailbox?.id ||
      selectedIds.length === 0
    ) {
      return;
    }

    const ids = [
      ...selectedIds,
    ];

    setActionLoading(true);

    try {
      const successCount =
        await runBulk(
          ids,
          (messageId) =>
            apiFetch(
              `/mail/messages/${messageId}/read`,
              {
                method: "POST",
                json: {
                  mailboxId:
                    mailbox.id,
                },
              }
            )
        );

      setSelectedIds([]);

      await refreshAll();

      showToast(
        `${countLabel(
          successCount
        )} marked as read.`
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

  // ==========================================================
  // DELETE FOREVER
  // ==========================================================

  async function deleteForever(
    ids,
    errorLabel,
    errorMessage
  ) {
    setActionLoading(true);

    try {
      const successCount =
        await runBulk(
          ids,
          (messageId) =>
            apiFetch(
              `/mail/messages/${messageId}?mailboxId=${mailbox.id}`,
              {
                method: "DELETE",
              }
            )
        );

      setSelectedIds([]);
      setSelectedMessage(null);

      await refreshAll();

      showToast(
        `${countLabel(
          successCount
        )} permanently deleted.`
      );
    } catch (error) {
      console.error(
        `[Fades Mail] ${errorLabel}:`,
        error
      );

      showToast(
        errorMessage,
        "error"
      );
    } finally {
      setActionLoading(false);
    }
  }

  // ==========================================================
  // BULK TRASH
  // ==========================================================

  async function handleBulkTrashButton() {
    if (
      resolvedActiveFolder ===
      "trash"
    ) {
      const confirmed =
        window.confirm(
          `Permanently delete ${countLabel(
            selectedIds.length
          )}? This cannot be undone.`
        );

      if (
        !confirmed ||
        !mailbox?.id ||
        selectedIds.length === 0
      ) {
        return;
      }

      await deleteForever(
        [...selectedIds],
        "Bulk permanent delete error",
        "Unable to delete messages."
      );

      return;
    }

    await bulkMove("trash");
  }

  // ==========================================================
  // EMPTY TRASH
  // ==========================================================

  async function emptyTrash() {
    if (
      !mailbox?.id ||
      messages.length === 0
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Permanently delete all messages in Trash? This cannot be undone."
      );

    if (!confirmed) return;

    await deleteForever(
      messages.map(
        (message) => message.id
      ),
      "Empty trash error",
      "Unable to empty trash."
    );
  }

  // ==========================================================
  // RETURN
  // ==========================================================

  return {
    messages,
    messagesLoading,
    actionLoading,

    selectedMessage,
    setSelectedMessage,

    selectedIds,
    selectedCount,
    allVisibleSelected,

    loadMessages,
    reset,

    openMessage,

    toggleStar,
    toggleRead,

    moveMessage,
    handleTrashButton,

    markAsSpam,
    markAsNotSpam,

    toggleSelectedMessage,
    toggleSelectAll,
    clearSelection,

    bulkMove,
    bulkMarkRead,

    handleBulkTrashButton,
    emptyTrash,
  };
}

