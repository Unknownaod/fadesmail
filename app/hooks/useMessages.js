import { useCallback, useEffect, useState } from "react";
import { apiFetch, errorFromResponse } from "../lib/api";
import { countLabel } from "../lib/format";

// Toast wording for bulk "move to folder" actions.
const BULK_MOVE_RESULT = {
  spam: "moved to Spam",
  trash: "moved to Trash",
  archive: "archived",
};

// Runs one request per id in parallel; returns how many succeeded.
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

/**
 * Message list for the active folder + everything you can do to messages:
 * open, star, read/unread, move, spam, delete, and bulk versions of those.
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
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const selectedCount = selectedIds.length;

  const allVisibleSelected =
    messages.length > 0 &&
    messages.every((message) => selectedIds.includes(message.id));

  /* ---------- loading ---------- */

  const loadMessages = useCallback(async () => {
    if (!mailbox?.id) return;

    setMessagesLoading(true);

    try {
      const params = new URLSearchParams();

      params.set("mailboxId", String(mailbox.id));

      if (resolvedActiveFolder === "starred") {
        params.set("starred", "true");
      } else if (resolvedActiveFolder) {
        params.set("folder", resolvedActiveFolder);
      }

      if (search.trim()) {
        params.set("search", search.trim());
      }

      params.set("limit", "100");
      params.set("offset", "0");

      const response = await apiFetch(`/mail/messages?${params.toString()}`);

      if (!response.ok) {
        if (response.status === 401) {
          onUnauthorized();
        }

        throw new Error(`Message request failed (${response.status})`);
      }

      const data = await response.json();

      setMessages(Array.isArray(data) ? data : data.messages || []);
      setSelectedIds([]);
    } catch (error) {
      console.error("[Fades Mail] Message error:", error);

      setMessages([]);
      setSelectedIds([]);
    } finally {
      setMessagesLoading(false);
    }
  }, [mailbox, resolvedActiveFolder, search, onUnauthorized]);

  useEffect(() => {
    if (!mailbox) return;

    loadMessages();
  }, [mailbox, loadMessages]);

  async function refreshAll() {
    await loadMessages();
    await loadFolders();
  }

  const reset = useCallback(() => {
    setMessages([]);
    setSelectedMessage(null);
    setSelectedIds([]);
  }, []);

  /* ---------- single message ---------- */

  async function openMessage(message) {
    if (!mailbox?.id) return;

    try {
      const response = await apiFetch(
        `/mail/messages/${message.id}?mailboxId=${mailbox.id}`
      );

      if (!response.ok) {
        throw new Error(`Message request failed (${response.status})`);
      }

      const data = await response.json();

      setSelectedMessage(data?.message || data);

      if (!message.isRead) {
        await apiFetch(`/mail/messages/${message.id}/read`, {
          method: "POST",
          json: { mailboxId: mailbox.id },
        });

        loadMessages();
        loadFolders();
      }
    } catch (error) {
      console.error("[Fades Mail] Open message error:", error);

      showToast("Unable to open this message.", "error");
    }
  }

  async function toggleStar(message) {
    if (!mailbox?.id) return;

    const endpoint = message.isStarred ? "unstar" : "star";

    try {
      const response = await apiFetch(
        `/mail/messages/${message.id}/${endpoint}`,
        {
          method: "POST",
          json: { mailboxId: mailbox.id },
        }
      );

      if (!response.ok) {
        throw new Error(`Star request failed (${response.status})`);
      }

      const nextStarred = !message.isStarred;

      setMessages((current) =>
        current.map((item) =>
          item.id === message.id ? { ...item, isStarred: nextStarred } : item
        )
      );

      if (selectedMessage?.id === message.id) {
        setSelectedMessage((current) => ({
          ...current,
          isStarred: nextStarred,
        }));
      }

      loadFolders();
    } catch (error) {
      console.error("[Fades Mail] Star error:", error);

      showToast("Unable to update star.", "error");
    }
  }

  async function toggleRead(message) {
    if (!mailbox?.id) return;

    setActionLoading(true);

    try {
      const endpoint = message.isRead ? "unread" : "read";

      const response = await apiFetch(
        `/mail/messages/${message.id}/${endpoint}`,
        {
          method: "POST",
          json: { mailboxId: mailbox.id },
        }
      );

      if (!response.ok) {
        throw new Error(`Read request failed (${response.status})`);
      }

      const nextRead = !message.isRead;

      setMessages((current) =>
        current.map((item) =>
          item.id === message.id ? { ...item, isRead: nextRead } : item
        )
      );

      if (selectedMessage?.id === message.id) {
        setSelectedMessage((current) => ({
          ...current,
          isRead: nextRead,
        }));
      }

      await loadFolders();
    } catch (error) {
      console.error("[Fades Mail] Read toggle error:", error);

      showToast("Unable to update message status.", "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function moveMessage(message, folder, options = {}) {
    if (!mailbox?.id) return false;

    const silent = options.silent || false;

    setActionLoading(true);

    try {
      const response = await apiFetch(`/mail/messages/${message.id}/move`, {
        method: "POST",
        json: { mailboxId: mailbox.id, folder },
      });

      if (!response.ok) {
        throw new Error(
          await errorFromResponse(
            response,
            `Move request failed (${response.status})`
          )
        );
      }

      if (selectedMessage?.id === message.id) {
        setSelectedMessage(null);
      }

      if (!silent) {
        await refreshAll();
      }

      return true;
    } catch (error) {
      console.error("[Fades Mail] Move error:", error);

      if (!silent) {
        showToast(error.message || "Unable to move message.", "error");
      }

      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteMessagePermanently(message, options = {}) {
    if (!mailbox?.id) return false;

    const silent = options.silent || false;

    setActionLoading(true);

    try {
      const response = await apiFetch(
        `/mail/messages/${message.id}?mailboxId=${mailbox.id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(
          await errorFromResponse(
            response,
            `Delete request failed (${response.status})`
          )
        );
      }

      if (selectedMessage?.id === message.id) {
        setSelectedMessage(null);
      }

      if (!silent) {
        await refreshAll();
      }

      return true;
    } catch (error) {
      console.error("[Fades Mail] Permanent delete error:", error);

      if (!silent) {
        showToast(error.message || "Unable to delete message.", "error");
      }

      return false;
    } finally {
      setActionLoading(false);
    }
  }

  // Trash button: move to Trash normally, delete forever if already in Trash.
  async function handleTrashButton(message) {
    if (resolvedActiveFolder === "trash") {
      const confirmed = window.confirm(
        "Permanently delete this message? This cannot be undone."
      );

      if (!confirmed) return;

      const success = await deleteMessagePermanently(message);

      if (success) {
        showToast("Message permanently deleted.");
      }

      return;
    }

    await moveMessage(message, "trash");
  }

  async function markAsSpam(message) {
    if (await moveMessage(message, "spam")) {
      showToast("Message moved to Spam.");
    }
  }

  async function markAsNotSpam(message) {
    if (await moveMessage(message, "inbox")) {
      showToast("Message moved to Inbox.");
    }
  }

  /* ---------- selection ---------- */

  function toggleSelectedMessage(messageId) {
    setSelectedIds((current) =>
      current.includes(messageId)
        ? current.filter((id) => id !== messageId)
        : [...current, messageId]
    );
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(messages.map((message) => message.id));
  }

  function clearSelection() {
    setSelectedIds([]);
  }

  /* ---------- bulk actions ---------- */

  async function bulkMove(folder) {
    if (!mailbox?.id || selectedIds.length === 0) return;

    const ids = [...selectedIds];

    setActionLoading(true);

    try {
      const successCount = await runBulk(ids, (messageId) =>
        apiFetch(`/mail/messages/${messageId}/move`, {
          method: "POST",
          json: { mailboxId: mailbox.id, folder },
        })
      );

      setSelectedIds([]);
      await refreshAll();

      showToast(
        `${countLabel(successCount)} ${BULK_MOVE_RESULT[folder] || "updated"}.`
      );
    } catch (error) {
      console.error("[Fades Mail] Bulk action error:", error);

      showToast("Unable to complete the bulk action.", "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function bulkMarkRead() {
    if (!mailbox?.id || selectedIds.length === 0) return;

    const ids = [...selectedIds];

    setActionLoading(true);

    try {
      const successCount = await runBulk(ids, (messageId) =>
        apiFetch(`/mail/messages/${messageId}/read`, {
          method: "POST",
          json: { mailboxId: mailbox.id },
        })
      );

      setSelectedIds([]);
      await refreshAll();

      showToast(`${countLabel(successCount)} marked as read.`);
    } catch (error) {
      console.error("[Fades Mail] Bulk read error:", error);

      showToast("Unable to mark messages as read.", "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteForever(ids, errorLabel, errorMessage) {
    setActionLoading(true);

    try {
      const successCount = await runBulk(ids, (messageId) =>
        apiFetch(`/mail/messages/${messageId}?mailboxId=${mailbox.id}`, {
          method: "DELETE",
        })
      );

      setSelectedIds([]);
      setSelectedMessage(null);
      await refreshAll();

      showToast(`${countLabel(successCount)} permanently deleted.`);
    } catch (error) {
      console.error(`[Fades Mail] ${errorLabel}:`, error);

      showToast(errorMessage, "error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleBulkTrashButton() {
    if (resolvedActiveFolder === "trash") {
      const confirmed = window.confirm(
        `Permanently delete ${countLabel(selectedIds.length)}? This cannot be undone.`
      );

      if (!confirmed || !mailbox?.id || selectedIds.length === 0) return;

      await deleteForever(
        [...selectedIds],
        "Bulk permanent delete error",
        "Unable to delete messages."
      );
      return;
    }

    await bulkMove("trash");
  }

  async function emptyTrash() {
    if (!mailbox?.id || messages.length === 0) return;

    const confirmed = window.confirm(
      "Permanently delete all messages in Trash? This cannot be undone."
    );

    if (!confirmed) return;

    await deleteForever(
      messages.map((message) => message.id),
      "Empty trash error",
      "Unable to empty trash."
    );
  }

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
