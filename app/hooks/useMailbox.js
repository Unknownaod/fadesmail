import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

/**
 * The signed-in user's mailbox and its folder list (with unread counts).
 */
export function useMailbox({ authenticated, onUnauthorized }) {
  const [mailbox, setMailbox] = useState(null);
  const [folders, setFolders] = useState([]);
  const [mailError, setMailError] = useState("");

  const loadMailbox = useCallback(async () => {
    try {
      setMailError("");

      const response = await apiFetch("/mail/me");

      if (!response.ok) {
        if (response.status === 401) {
          onUnauthorized();
        }

        throw new Error(`Mailbox request failed (${response.status})`);
      }

      const data = await response.json();
      const currentMailbox = data?.mailbox || data;

      if (!currentMailbox || !currentMailbox.id) {
        throw new Error("No mailbox is associated with this account.");
      }

      setMailbox(currentMailbox);
    } catch (error) {
      console.error("[Fades Mail] Mailbox error:", error);

      setMailbox(null);
      setMailError(error.message || "Unable to load your mailbox.");
    }
  }, [onUnauthorized]);

  useEffect(() => {
    if (!authenticated) return;

    loadMailbox();
  }, [authenticated, loadMailbox]);

  const loadFolders = useCallback(async () => {
    if (!mailbox?.id) return;

    try {
      const response = await apiFetch(`/mail/folders?mailboxId=${mailbox.id}`);

      if (!response.ok) {
        throw new Error(`Folder request failed (${response.status})`);
      }

      const data = await response.json();

      setFolders(Array.isArray(data) ? data : data.folders || []);
    } catch (error) {
      console.error("[Fades Mail] Folder error:", error);
    }
  }, [mailbox]);

  useEffect(() => {
    if (!mailbox) return;

    loadFolders();
  }, [mailbox, loadFolders]);

  const resetMailbox = useCallback(() => {
    setMailbox(null);
    setFolders([]);
  }, []);

  return { mailbox, folders, mailError, loadFolders, resetMailbox };
}
