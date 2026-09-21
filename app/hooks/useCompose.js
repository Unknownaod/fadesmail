import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, errorFromResponse } from "../lib/api";
import {
  isValidEmail,
  normalizeRecipient,
  uniqueEmails,
} from "../lib/recipients";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read file."));

    reader.readAsDataURL(file);
  });
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

/**
 * Everything about the compose window: open/close, To/Cc/Bcc chips,
 * recipient autocomplete, attachments and sending.
 *
 * `onSent` runs after a successful send (use it to refresh folders/messages).
 */
export function useCompose({ mailbox, showToast, onSent }) {
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [sending, setSending] = useState(false);

  const [attachments, setAttachments] = useState([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  const [recipientQuery, setRecipientQuery] = useState("");
  const [recipientSuggestions, setRecipientSuggestions] = useState([]);
  const [recipientLoading, setRecipientLoading] = useState(false);
  const [recipientChips, setRecipientChips] = useState([]);
  const [ccChips, setCcChips] = useState([]);
  const [bccChips, setBccChips] = useState([]);
  const [recipientType, setRecipientType] = useState("to");
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [recipientSuggestionsOpen, setRecipientSuggestionsOpen] =
    useState(false);
  const [recipientActiveIndex, setRecipientActiveIndex] = useState(-1);

  const recipientInputRef = useRef(null);
  const attachmentInputRef = useRef(null);

  /* ---------- recipient helpers ---------- */

  function getRecipientList(type) {
    if (type === "cc") return ccChips;
    if (type === "bcc") return bccChips;
    return recipientChips;
  }

  function setRecipientList(type, updater) {
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

  function clearRecipientSearch() {
    setRecipientQuery("");
    setRecipientSuggestions([]);
    setRecipientSuggestionsOpen(false);
    setRecipientActiveIndex(-1);
  }

  /* ---------- recipient autocomplete ---------- */

  const searchRecipients = useCallback(
    async (query) => {
      const cleanQuery = query.trim();

      if (!cleanQuery) {
        setRecipientSuggestions([]);
        setRecipientLoading(false);
        return;
      }

      setRecipientLoading(true);

      try {
        const response = await apiFetch(
          `/mail/recipients?query=${encodeURIComponent(cleanQuery)}`
        );

        if (!response.ok) {
          setRecipientSuggestions([]);
          return;
        }

        const data = await response.json();

        const results = Array.isArray(data)
          ? data
          : data.recipients || data.users || data.contacts || [];

        const existing = new Set(
          getRecipientList(recipientType).map((item) => item.toLowerCase())
        );

        const filtered = results.filter((recipient) => {
          const address = normalizeRecipient(recipient).toLowerCase();

          return (
            address &&
            !existing.has(address) &&
            address !== mailbox?.email?.toLowerCase()
          );
        });

        setRecipientSuggestions(filtered.slice(0, 10));
        setRecipientSuggestionsOpen(true);
        setRecipientActiveIndex(-1);
      } catch (error) {
        console.error("[Fades Mail] Recipient search failed:", error);

        setRecipientSuggestions([]);
      } finally {
        setRecipientLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipientType, recipientChips, ccChips, bccChips, mailbox]
  );

  useEffect(() => {
    if (!composeOpen) {
      setRecipientSuggestions([]);
      setRecipientSuggestionsOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      searchRecipients(recipientQuery);
    }, 180);

    return () => clearTimeout(timer);
  }, [recipientQuery, composeOpen, recipientType, searchRecipients]);

  /* ---------- recipient chips ---------- */

  function addRecipient(emailAddress, type = recipientType) {
    const cleanEmail = normalizeRecipient(emailAddress).trim().toLowerCase();

    if (!cleanEmail) return false;

    if (!isValidEmail(cleanEmail)) {
      showToast(`"${cleanEmail}" is not a valid email address.`, "error");
      return false;
    }

    if (mailbox?.email && cleanEmail === mailbox.email.toLowerCase()) {
      showToast("You cannot send an email to yourself.", "error");
      return false;
    }

    setRecipientList(type, (current) => {
      if (current.some((item) => item.toLowerCase() === cleanEmail)) {
        return current;
      }

      return [...current, cleanEmail];
    });

    clearRecipientSearch();

    return true;
  }

  function addTypedRecipients(type) {
    const values = recipientQuery
      .split(/[;,]+/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (!values.length) {
      return;
    }

    let added = false;

    for (const value of values) {
      if (isValidEmail(value)) {
        addRecipient(value, type);
        added = true;
      }
    }

    if (!added) {
      showToast("Enter a valid email address.", "error");
    }
  }

  function removeRecipient(emailAddress, type) {
    setRecipientList(type, (current) =>
      current.filter(
        (item) => item.toLowerCase() !== emailAddress.toLowerCase()
      )
    );
  }

  function handleRecipientKeyDown(event, type) {
    const suggestions = recipientSuggestions;
    const activeSuggestion = suggestions[recipientActiveIndex];

    if (event.key === "ArrowDown" && suggestions.length) {
      event.preventDefault();

      setRecipientSuggestionsOpen(true);

      setRecipientActiveIndex((current) =>
        current >= suggestions.length - 1 ? 0 : current + 1
      );

      return;
    }

    if (event.key === "ArrowUp" && suggestions.length) {
      event.preventDefault();

      setRecipientActiveIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1
      );

      return;
    }

    if (event.key === "Escape") {
      setRecipientSuggestionsOpen(false);
      setRecipientActiveIndex(-1);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (recipientActiveIndex >= 0 && activeSuggestion) {
        addRecipient(normalizeRecipient(activeSuggestion), type);
        return;
      }

      addTypedRecipients(type);
      return;
    }

    if (event.key === "," || event.key === ";") {
      event.preventDefault();
      addTypedRecipients(type);
      return;
    }

    if (event.key === "Tab" && recipientQuery.trim()) {
      if (recipientActiveIndex >= 0 && activeSuggestion) {
        event.preventDefault();
        addRecipient(normalizeRecipient(activeSuggestion), type);
      } else if (isValidEmail(recipientQuery.trim())) {
        event.preventDefault();
        addRecipient(recipientQuery, type);
      }
    }

    if (event.key === "Backspace" && !recipientQuery) {
      const chips = getRecipientList(type);

      if (chips.length > 0) {
        removeRecipient(chips[chips.length - 1], type);
      }
    }
  }

  // Show the Cc / Bcc row (called from the "Cc" / "Bcc" links next to "To").
  function enableField(type) {
    if (type === "cc") setShowCc(true);
    if (type === "bcc") setShowBcc(true);

    setRecipientType(type);
    setRecipientQuery("");
    setRecipientSuggestions([]);
    setRecipientSuggestionsOpen(false);
  }

  // Hide the Cc / Bcc row and drop its recipients.
  function disableField(type) {
    if (type === "cc") {
      setShowCc(false);
      setCcChips([]);
    }

    if (type === "bcc") {
      setShowBcc(false);
      setBccChips([]);
    }
  }

  /* ---------- open / close ---------- */

  function openComposer(options = {}) {
    const {
      to = [],
      cc = [],
      bcc = [],
      subject = "",
      body = "",
    } = options;

    setRecipientChips(uniqueEmails(toArray(to)));
    setCcChips(uniqueEmails(toArray(cc)));
    setBccChips(uniqueEmails(toArray(bcc)));

    clearRecipientSearch();
    setRecipientType("to");

    setShowCc(toArray(cc).length > 0);
    setShowBcc(toArray(bcc).length > 0);

    setComposeSubject(subject);
    setComposeBody(body);
    setAttachments([]);
    setComposeOpen(true);
  }

  function closeComposer() {
    if (sending) return;

    setComposeOpen(false);
    clearRecipientSearch();
    setAttachments([]);
  }

  /* ---------- attachments ---------- */

  async function handleAttachmentChange(event) {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    setAttachmentsLoading(true);

    try {
      const readFiles = await Promise.all(
        files.map(async (file) => ({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          data: await readFileAsDataUrl(file),
        }))
      );

      setAttachments((current) => [...current, ...readFiles]);
    } catch (error) {
      console.error("[Fades Mail] Attachment read error:", error);

      showToast("Unable to attach that file.", "error");
    } finally {
      setAttachmentsLoading(false);

      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
    }
  }

  function removeAttachment(id) {
    setAttachments((current) =>
      current.filter((attachment) => attachment.id !== id)
    );
  }

  /* ---------- send ---------- */

  async function sendMessage(event) {
    event.preventDefault();

    if (!mailbox?.id) return;

    if (recipientQuery.trim()) {
      if (isValidEmail(recipientQuery.trim())) {
        addRecipient(recipientQuery, recipientType);
      } else {
        showToast("Finish or remove the recipient you're typing.", "error");
        return;
      }
    }

    if (recipientChips.length === 0) {
      showToast("Add at least one recipient.", "error");
      return;
    }

    setSending(true);

    try {
      const response = await apiFetch("/mail/messages", {
        method: "POST",
        json: {
          mailboxId: mailbox.id,
          sender: mailbox.email,
          recipients: recipientChips,
          cc: ccChips,
          bcc: bccChips,
          subject: composeSubject.trim(),
          bodyText: composeBody,
          attachments: attachments.map(({ name, type, size, data }) => ({
            name,
            type,
            size,
            data,
          })),
          folder: "sent",
        },
      });

      if (!response.ok) {
        throw new Error(
          await errorFromResponse(response, `Send failed (${response.status})`)
        );
      }

      setRecipientChips([]);
      setCcChips([]);
      setBccChips([]);
      clearRecipientSearch();
      setShowCc(false);
      setShowBcc(false);
      setComposeSubject("");
      setComposeBody("");
      setAttachments([]);
      setComposeOpen(false);

      await onSent?.();

      showToast("Message sent successfully.");
    } catch (error) {
      console.error("[Fades Mail] Send error:", error);

      showToast(error.message || "Unable to send message.", "error");
    } finally {
      setSending(false);
    }
  }

  return {
    // window state
    composeOpen,
    openComposer,
    closeComposer,
    sending,
    sendMessage,

    // subject / body
    composeSubject,
    setComposeSubject,
    composeBody,
    setComposeBody,

    // recipients
    recipientInputRef,
    recipientType,
    setRecipientType,
    recipientQuery,
    setRecipientQuery,
    recipientSuggestions,
    recipientSuggestionsOpen,
    setRecipientSuggestionsOpen,
    recipientLoading,
    recipientActiveIndex,
    recipientChips,
    showCc,
    showBcc,
    enableField,
    disableField,
    getRecipientList,
    addRecipient,
    removeRecipient,
    handleRecipientKeyDown,

    // attachments
    attachments,
    attachmentsLoading,
    attachmentInputRef,
    handleAttachmentChange,
    removeAttachment,
  };
}
