
"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "./Icon";
import { SYSTEM_FOLDERS } from "../lib/config";

const API_URL =
  process.env.NEXT_PUBLIC_MAIL_API_URL ||
  "https://mail-api.fades.lol";

const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024;

// Refresh every 5 seconds while the mailbox is open.
const STORAGE_REFRESH_INTERVAL = 5000;

// Other components can dispatch this event after a mail action.
export const MAIL_STORAGE_EVENT = "fades:mail-storage-changed";

function formatBytes(bytes) {
  const value = Number(bytes) || 0;

  if (value <= 0) return "0 B";

  const units = ["B", "KB", "MB", "GB", "TB"];

  const index = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1
  );

  const size = value / Math.pow(1024, index);

  return `${size.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

export default function Sidebar({
  open,
  mailbox,
  folders,
  unreadCount,
  resolvedActiveFolder,
  activeCustomFolderId,
  onCompose,
  onClose,
  onSelectFolder,
}) {
  const customFolders = folders.filter(
    (folder) => folder.type === "custom"
  );

  const [storage, setStorage] = useState({
    used: 0,
    limit: STORAGE_LIMIT,
    loading: true,
    error: false,
  });

  const mailboxId = mailbox?.id;

  const refreshStorage = useCallback(
    async (signal) => {
      if (!mailboxId) return;

      try {
        const response = await fetch(
          `${API_URL}/mail/storage?mailboxId=${encodeURIComponent(
            mailboxId
          )}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Storage request failed: ${response.status}`
          );
        }

        const data = await response.json();

        if (signal?.aborted) return;

        setStorage({
          used: Math.max(
            0,
            Number(data.usedBytes) || 0
          ),
          limit:
            Number(data.limitBytes) || STORAGE_LIMIT,
          loading: false,
          error: false,
        });
      } catch (error) {
        if (
          error.name === "AbortError" ||
          signal?.aborted
        ) {
          return;
        }

        console.error("Storage error:", error);

        setStorage((previous) => ({
          ...previous,
          loading: false,
          error: true,
        }));
      }
    },
    [mailboxId]
  );

  // Reset and load when the active mailbox changes.
  useEffect(() => {
    if (!mailboxId) {
      setStorage({
        used: 0,
        limit: STORAGE_LIMIT,
        loading: true,
        error: false,
      });

      return;
    }

    const controller = new AbortController();

    setStorage((previous) => ({
      ...previous,
      loading: true,
      error: false,
    }));

    refreshStorage(controller.signal);

    return () => controller.abort();
  }, [mailboxId, refreshStorage]);

  // Live polling, tab visibility, focus, and mail events.
  useEffect(() => {
    if (!mailboxId) return;

    let controller = null;
    let refreshing = false;

    const refresh = async () => {
      if (
        document.visibilityState === "hidden" ||
        refreshing
      ) {
        return;
      }

      refreshing = true;

      controller = new AbortController();

      try {
        await refreshStorage(controller.signal);
      } finally {
        refreshing = false;
        controller = null;
      }
    };

    const handleMailChange = () => {
      refresh();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    };

    const handleFocus = () => {
      refresh();
    };

    const interval = window.setInterval(
      refresh,
      STORAGE_REFRESH_INTERVAL
    );

    window.addEventListener(
      MAIL_STORAGE_EVENT,
      handleMailChange
    );

    // Also support a generic event for other components.
    window.addEventListener(
      "fades:mail-changed",
      handleMailChange
    );

    window.addEventListener("focus", handleFocus);

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.clearInterval(interval);

      window.removeEventListener(
        MAIL_STORAGE_EVENT,
        handleMailChange
      );

      window.removeEventListener(
        "fades:mail-changed",
        handleMailChange
      );

      window.removeEventListener(
        "focus",
        handleFocus
      );

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      controller?.abort();
    };
  }, [mailboxId, refreshStorage]);

  const storagePercent =
    storage.limit > 0
      ? Math.min(
          100,
          (storage.used / storage.limit) * 100
        )
      : 0;

  const storageRemaining = Math.max(
    0,
    storage.limit - storage.used
  );

  const storageFull = storage.used >= storage.limit;

  return (
    <>
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <button
            className="compose-button"
            type="button"
            onClick={onCompose}
          >
            <Icon name="plus" size={18} />
            <span>Compose</span>
          </button>

          <button
            className="close-sidebar"
            type="button"
            onClick={onClose}
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
          <div className="nav-label">Mail</div>

          {SYSTEM_FOLDERS.map((folder) => {
            const databaseFolder = folders.find(
              (item) => item.type === folder.type
            );

            const unread = Number(
              databaseFolder?.unreadCount || 0
            );

            const active =
              resolvedActiveFolder === folder.type &&
              !activeCustomFolderId;

            return (
              <button
                key={folder.type}
                type="button"
                className={`folder-button ${
                  active ? "active" : ""
                }`}
                onClick={() =>
                  onSelectFolder(folder.type)
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
          })}
        </nav>

        {customFolders.length > 0 && (
          <div className="custom-folders">
            <div className="nav-label">
              Folders
            </div>

            {customFolders.map((folder) => {
              const active =
                activeCustomFolderId ===
                String(folder.id);

              const unread = Number(
                folder.unreadCount || 0
              );

              return (
                <button
                  key={folder.id}
                  type="button"
                  className={`folder-button ${
                    active ? "active" : ""
                  }`}
                  onClick={() =>
                    onSelectFolder(
                      "custom",
                      folder.id
                    )
                  }
                >
                  <span className="folder-icon">
                    <Icon name="draft" size={17} />
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
          </div>
        )}

        <div className="sidebar-bottom">
          {/* MAILBOX STORAGE */}

          <div className="storage-card">
            <div className="storage-heading">
              <div className="storage-title">
                <Icon
                  name="hard-drive"
                  size={17}
                />

                <strong>Storage</strong>
              </div>

              <span className="storage-limit">
                5 GB
              </span>
            </div>

            <div className="storage-usage">
              {storage.loading ? (
                <span>
                  Calculating storage...
                </span>
              ) : storage.error ? (
                <span>
                  {formatBytes(storage.used)} used
                </span>
              ) : (
                <>
                  <strong>
                    {formatBytes(storage.used)}
                  </strong>

                  <span>
                    of {formatBytes(storage.limit)} used
                  </span>
                </>
              )}
            </div>

            <div
              className="storage-progress"
              role="progressbar"
              aria-label="Mailbox storage used"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(
                storagePercent
              )}
            >
              <div
                className={`storage-progress-fill ${
                  storageFull
                    ? "storage-full"
                    : ""
                }`}
                style={{
                  width: `${storagePercent}%`,
                }}
              />
            </div>

            <div className="storage-footer">
              {storage.loading ? (
                <span>
                  Checking your mailbox
                </span>
              ) : storage.error ? (
                <button
                  type="button"
                  className="storage-retry"
                  onClick={() => refreshStorage()}
                >
                  Retry
                </button>
              ) : (
                <>
                  <span>
                    {storageFull
                      ? "Storage full"
                      : `${formatBytes(
                          storageRemaining
                        )} remaining`}
                  </span>

                  <span>
                    {storagePercent.toFixed(1)}%
                  </span>
                </>
              )}
            </div>
          </div>

          {/* MAIL SERVICE STATUS */}

          <div className="status-card">
            <div className="status-dot" />

            <div>
              <strong>Fades Mail</strong>
              <span>
                All systems operational
              </span>
            </div>
          </div>
        </div>
      </aside>

      {open && (
        <button
          className="sidebar-overlay"
          type="button"
          onClick={onClose}
          aria-label="Close menu"
        />
      )}
    </>
  );
}
