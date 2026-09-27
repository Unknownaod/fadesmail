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
// Live mail system:
//
//   • Visible mailbox refreshes every 10 seconds
//   • Inbox is ALWAYS checked independently
//   • Works even while viewing Sent / Trash / Spam / etc.
//   • Desktop notifications for newly detected mail
//   • Sound notifications for newly detected mail
//   • Existing mail is NOT notified on initial load
//   • Duplicate notifications are prevented
//   • Returning to the tab triggers an immediate refresh
//
// IMPORTANT:
// This uses browser polling rather than WebSockets / SSE / Push.
//
// Browsers may throttle JavaScript timers when a tab is heavily
// backgrounded. For guaranteed notifications while the browser
// is closed, Web Push + a service worker would be required.
//

const LIVE_REFRESH_INTERVAL = 10 * 1000;

const DESKTOP_NOTIFICATIONS_KEY =
  "fades.mail.desktopNotifications";

const SOUND_NOTIFICATIONS_KEY =
  "fades.mail.soundNotifications";

const NOTIFICATION_SOUND =
  "/sounds/new-mail.mp3";

const MESSAGE_LIMIT = 100;

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

export function useMessages({
  mailbox,
  resolvedActiveFolder,
  search,
  loadFolders,
  showToast,
  onUnauthorized,
}) {
  // ==========================================================
  // STATE
  // ==========================================================

  const [messages, setMessages] = useState([]);

  const [selectedMessage, setSelectedMessage] =
    useState(null);

  const [selectedIds, setSelectedIds] =
    useState([]);

  const [messagesLoading, setMessagesLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  // ==========================================================
  // REFS
  // ==========================================================

  // Prevent overlapping live refresh requests.
  const refreshInProgressRef = useRef(false);

  // Prevent overlapping Inbox notification checks.
  const inboxCheckInProgressRef = useRef(false);

  // IDs that we have already seen.
  const seenMessageIdsRef = useRef(new Set());

  // Prevent notifications for the initial Inbox load.
  const notificationInitializedRef =
    useRef(false);

  // Keep the latest folder loader without causing
  // the polling effect to constantly restart.
  const loadFoldersRef =
    useRef(loadFolders);

  useEffect(() => {
    loadFoldersRef.current = loadFolders;
  }, [loadFolders]);

  // ==========================================================
  // DERIVED STATE
  // ==========================================================

  const selectedCount =
    selectedIds.length;

  const allVisibleSelected =
    messages.length > 0 &&
    messages.every((message) =>
      selectedIds.includes(message.id)
    );

  // ==========================================================
  // NOTIFICATION SETTINGS
  // ==========================================================

  function desktopNotificationsEnabled() {
    if (
      typeof window === "undefined"
    ) {
      return false;
    }

    return (
      localStorage.getItem(
        DESKTOP_NOTIFICATIONS_KEY
      ) === "true"
    );
  }

  function soundNotificationsEnabled() {
    if (
      typeof window === "undefined"
    ) {
      return false;
    }

    return (
      localStorage.getItem(
        SOUND_NOTIFICATIONS_KEY
      ) === "true"
    );
  }

  // ==========================================================
  // PLAY NOTIFICATION SOUND
  // ==========================================================

  function playNotificationSound() {
    if (
      !soundNotificationsEnabled()
    ) {
      return;
    }

    try {
      const audio =
        new Audio(
          NOTIFICATION_SOUND
        );

      audio.volume = 0.75;

      const playPromise =
        audio.play();

      if (
        playPromise &&
        typeof playPromise.catch ===
          "function"
      ) {
        playPromise.catch(() => {
          // Browser may block background
          // audio playback.
        });
      }
    } catch {
      // Ignore audio errors.
    }
  }

  // ==========================================================
  // DESKTOP NOTIFICATION
  // ==========================================================

  function showDesktopNotification(
    message
  ) {
    if (
      !desktopNotificationsEnabled()
    ) {
      return;
    }

    if (
      typeof window === "undefined"
    ) {
      return;
    }

    if (
      typeof Notification ===
      "undefined"
    ) {
      return;
    }

    if (
      Notification.permission !==
      "granted"
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
        try {
          window.focus();
        } catch {
          // Ignore focus errors.
        }

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
  // NOTIFY
  // ==========================================================

  function notifyNewMessage(
    message
  ) {
    showDesktopNotification(
      message
    );

    playNotificationSound();
  }

  // ==========================================================
  // NOTIFICATION BASELINE
  // ==========================================================
  //
  // The first Inbox check establishes the current state.
  //
  // This is important because if the user already has
  // 500 emails, opening Fades Mail should NOT make
  // 500 notification sounds.
  //

  function establishNotificationBaseline(
    messageList
  ) {
    seenMessageIdsRef.current.clear();

    for (
      const message of messageList
    ) {
      if (
        message?.id !== undefined &&
        message?.id !== null
      ) {
        seenMessageIdsRef.current.add(
          String(message.id)
        );
      }
    }

    notificationInitializedRef.current =
      true;
  }

  // ==========================================================
  // DETECT NEW INBOX MESSAGES
  // ==========================================================

  function detectNewMessages(
    messageList
  ) {
    if (
      !Array.isArray(messageList)
    ) {
      return;
    }

    // --------------------------------------------------------
    // FIRST CHECK
    // --------------------------------------------------------
    //
    // Establish baseline without notifications.
    //

    if (
      !notificationInitializedRef.current
    ) {
      establishNotificationBaseline(
        messageList
      );

      return;
    }

    const newMessages = [];

    // --------------------------------------------------------
    // FIND NEW IDS
    // --------------------------------------------------------

    for (
      const message of messageList
    ) {
      if (
        !message?.id &&
        message?.id !== 0
      ) {
        continue;
      }

      const id =
        String(message.id);

      if (
        !seenMessageIdsRef.current.has(
          id
        )
      ) {
        newMessages.push(
          message
        );
      }
    }

    // --------------------------------------------------------
    // UPDATE SEEN IDS
    // --------------------------------------------------------

    for (
      const message of messageList
    ) {
      if (
        !message?.id &&
        message?.id !== 0
      ) {
        continue;
      }

      seenMessageIdsRef.current.add(
        String(message.id)
      );
    }

    // --------------------------------------------------------
    // NOTIFY
    // --------------------------------------------------------

    for (
      const message of newMessages
    ) {
      notifyNewMessage(
        message
      );
    }
  }

  // ==========================================================
  // BUILD MESSAGE QUERY
  // ==========================================================

  function buildMessageParams({
    folder,
    starred,
    searchValue,
    mailboxId,
  }) {
    const params =
      new URLSearchParams();

    params.set(
      "mailboxId",
      String(mailboxId)
    );

    if (starred) {
      params.set(
        "starred",
        "true"
      );
    } else if (folder) {
      params.set(
        "folder",
        folder
      );
    }

    if (
      searchValue &&
      searchValue.trim()
    ) {
      params.set(
        "search",
        searchValue.trim()
      );
    }

    params.set(
      "limit",
      String(MESSAGE_LIMIT)
    );

    params.set(
      "offset",
      "0"
    );

    return params;
  }

  // ==========================================================
  // LOAD VISIBLE MESSAGES
  // ==========================================================

  const loadMessages =
    useCallback(
      async (options = {}) => {
        if (!mailbox?.id) {
          return [];
        }

        const silent =
          options.silent === true;

        if (
          silent &&
          refreshInProgressRef.current
        ) {
          return [];
        }

        if (silent) {
          refreshInProgressRef.current =
            true;
        } else {
          setMessagesLoading(true);
        }

        try {
          const params =
            buildMessageParams({
              mailboxId:
                mailbox.id,
              folder:
                resolvedActiveFolder ===
                "starred"
                  ? null
                  : resolvedActiveFolder,
              starred:
                resolvedActiveFolder ===
                "starred",
              searchValue:
                search,
            });

          const response =
            await apiFetch(
              `/mail/messages?${params.toString()}`
            );

          if (!response.ok) {
            if (
              response.status ===
              401
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
              : data.messages ||
                [];

          setMessages(
            nextMessages
          );

          // ----------------------------------------------------
          // IMPORTANT:
          //
          // Notification detection is NOT handled here.
          //
          // The dedicated Inbox checker below handles
          // notifications regardless of which folder the
          // user is currently viewing.
          // ----------------------------------------------------

          if (!silent) {
            setSelectedIds([]);
          }

          return nextMessages;
        } catch (error) {
          console.error(
            "[Fades Mail] Message error:",
            error
          );

          if (!silent) {
            setMessages([]);
            setSelectedIds([]);
          }

          return [];
        } finally {
          if (silent) {
            refreshInProgressRef.current =
              false;
          } else {
            setMessagesLoading(
              false
            );
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
  // CHECK INBOX FOR NEW MAIL
  // ==========================================================
  //
  // THIS IS THE IMPORTANT PART.
  //
  // This request ALWAYS checks:
  //
  //     folder=inbox
  //
  // regardless of what folder the user is currently viewing.
  //
  // Therefore:
  //
  //   Sent     -> still detects Inbox mail
  //   Starred  -> still detects Inbox mail
  //   Trash    -> still detects Inbox mail
  //   Spam     -> still detects Inbox mail
  //   Search   -> still detects Inbox mail
  //

  const checkInboxForNewMail =
    useCallback(
      async () => {
        if (!mailbox?.id) {
          return;
        }

        if (
          inboxCheckInProgressRef.current
        ) {
          return;
        }

        inboxCheckInProgressRef.current =
          true;

        try {
          const params =
            buildMessageParams({
              mailboxId:
                mailbox.id,
              folder: "inbox",
              starred: false,
              searchValue: "",
            });

          const response =
            await apiFetch(
              `/mail/messages?${params.toString()}`
            );

          if (!response.ok) {
            if (
              response.status ===
              401
            ) {
              onUnauthorized();
            }

            throw new Error(
              `Inbox check failed (${response.status})`
            );
          }

          const data =
            await response.json();

          const inboxMessages =
            Array.isArray(data)
              ? data
              : data.messages ||
                [];

          detectNewMessages(
            inboxMessages
          );
        } catch (error) {
          console.error(
            "[Fades Mail] Inbox check error:",
            error
          );
        } finally {
          inboxCheckInProgressRef.current =
            false;
        }
      },
      [
        mailbox,
        onUnauthorized,
      ]
    );

  // ==========================================================
  // INITIAL MESSAGE LOAD
  // ==========================================================

  useEffect(() => {
    if (!mailbox) {
      return;
    }

    // Reset notification state when switching
    // accounts/mailboxes.

    seenMessageIdsRef.current.clear();

    notificationInitializedRef.current =
      false;

    loadMessages();

    // Immediately establish the Inbox baseline.
    //
    // This means existing Inbox messages won't trigger
    // notifications after the page loads.

    checkInboxForNewMail();
  }, [
    mailbox,
    loadMessages,
    checkInboxForNewMail,
  ]);

  // ==========================================================
  // LIVE MAIL POLLING
  // ==========================================================
  //
  // Two things happen every 10 seconds:
  //
  // 1. Refresh whatever folder the user is looking at.
  // 2. Independently check Inbox for new mail.
  //
  // We DO NOT stop polling just because the tab is hidden.
  //
  // The browser may throttle timers in heavily backgrounded
  // tabs, but we don't intentionally disable the polling.
  //

  useEffect(() => {
    if (!mailbox?.id) {
      return;
    }

    let interval = null;
    let active = true;

    async function refreshLive() {
      if (!active) {
        return;
      }

      // ------------------------------------------------------
      // Refresh the visible folder.
      // ------------------------------------------------------

      await loadMessages({
        silent: true,
      });

      if (!active) {
        return;
      }

      // ------------------------------------------------------
      // ALWAYS check Inbox separately.
      // ------------------------------------------------------

      await checkInboxForNewMail();

      if (!active) {
        return;
      }

      // ------------------------------------------------------
      // Refresh unread counts / folder counts.
      // ------------------------------------------------------

      try {
        await loadFoldersRef.current();
      } catch (error) {
        console.error(
          "[Fades Mail] Folder refresh error:",
          error
        );
      }
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
      // ------------------------------------------------------
      // When the user comes back to Fades Mail, immediately
      // refresh instead of waiting up to 10 seconds.
      // ------------------------------------------------------

      if (
        document.visibilityState ===
        "visible"
      ) {
        refreshLive();
      }
    }

    // Start immediately.
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
    checkInboxForNewMail,
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
    if (!mailbox?.id) {
      return;
    }

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
  // TOGGLE STAR
  // ==========================================================

  async function toggleStar(
    message
  ) {
    if (!mailbox?.id) {
      return;
    }

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
  // TOGGLE READ
  // ==========================================================

  async function toggleRead(
    message
  ) {
    if (!mailbox?.id) {
      return;
    }

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
  // MOVE MESSAGE
  // ==========================================================

  async function moveMessage(
    message,
    folder,
    options = {}
  ) {
    if (!mailbox?.id) {
      return false;
    }

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
    if (!mailbox?.id) {
      return false;
    }

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
  // TRASH BUTTON
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

      if (!confirmed) {
        return;
      }

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

  // ==========================================================
  // NOT SPAM
  // ==========================================================

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
  // SELECT MESSAGE
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

  // ==========================================================
  // SELECT ALL
  // ==========================================================

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

  // ==========================================================
  // CLEAR SELECTION
  // ==========================================================

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
  // BULK MARK READ
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

    if (!confirmed) {
      return;
    }

    await deleteForever(
      messages.map(
        (message) =>
          message.id
      ),
      "Empty trash error",
      "Unable to empty trash."
    );
  }

  // ==========================================================
  // RETURN API
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
