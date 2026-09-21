"use client";

/*
 * Fades Mail — main page.
 * This file only wires things together. Where to edit:
 *
 *   hooks/useAuth.js       sign in / sign up / session
 *   hooks/useMailbox.js    mailbox + folder list
 *   hooks/useMessages.js   message list, star/read/move/delete, bulk actions
 *   hooks/useCompose.js    composer, recipients, attachments, sending
 *   components/*           one file per piece of UI
 *   lib/*                  config, API helper, formatting, reply builders
 */

import { useMemo, useState } from "react";

import { SYSTEM_FOLDERS } from "./lib/config";
import { makeFolderKey, parseFolderKey } from "./lib/folders";

import { useAuth } from "./hooks/useAuth";
import { useMailbox } from "./hooks/useMailbox";
import { useMessages } from "./hooks/useMessages";
import { useCompose } from "./hooks/useCompose";
import { useToast } from "./hooks/useToast";
import { useTheme } from "./hooks/useTheme";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

import AuthLoading from "./components/AuthLoading";
import AuthScreen from "./components/AuthScreen";
import Topbar from "./components/Topbar";
import Sidebar from "./components/Sidebar";
import FolderHeader from "./components/FolderHeader";
import BulkToolbar from "./components/BulkToolbar";
import MessageList from "./components/MessageList";
import MessageView from "./components/MessageView";
import ComposeWindow from "./components/ComposeWindow";
import Toast from "./components/Toast";

export default function Home() {
  useTheme();

  const auth = useAuth();
  const { toast, showToast, dismissToast } = useToast();

  /* which folder / search is active, and whether the mobile sidebar is open */
  const [activeFolder, setActiveFolder] = useState("inbox");
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { resolvedActiveFolder, activeCustomFolderId } =
    parseFolderKey(activeFolder);

  const { mailbox, folders, mailError, loadFolders, resetMailbox } = useMailbox({
    authenticated: auth.authenticated,
    onUnauthorized: auth.expireSession,
  });

  const inbox = useMessages({
    mailbox,
    resolvedActiveFolder,
    search,
    loadFolders,
    showToast,
    onUnauthorized: auth.expireSession,
  });

  const compose = useCompose({
    mailbox,
    showToast,
    onSent: async () => {
      await loadFolders();

      if (resolvedActiveFolder === "sent") {
        await inbox.loadMessages();
      }
    },
  });

  useKeyboardShortcuts({
    authenticated: auth.authenticated,
    composeOpen: compose.composeOpen,
    selectedMessage: inbox.selectedMessage,
    sidebarOpen,
    openComposer: compose.openComposer,
    closeComposer: compose.closeComposer,
    closeMessage: () => inbox.setSelectedMessage(null),
    closeSidebar: () => setSidebarOpen(false),
  });

  /* derived values */

  const currentFolder = useMemo(
    () =>
      folders.find((folder) => folder.type === activeFolder) ||
      SYSTEM_FOLDERS.find((folder) => folder.type === activeFolder),
    [folders, activeFolder]
  );

  const currentFolderForDisplay = activeCustomFolderId
    ? folders.find((folder) => String(folder.id) === String(activeCustomFolderId))
    : currentFolder;

  const folderName = currentFolderForDisplay?.name;

  const unreadCount = folders.reduce(
    (total, folder) => total + Number(folder.unreadCount || 0),
    0
  );

  /* page-level actions */

  function selectFolder(type, id = null) {
    inbox.setSelectedMessage(null);
    inbox.clearSelection();
    setSearch("");
    setActiveFolder(makeFolderKey(type, id));
    setSidebarOpen(false);
  }

  function refresh() {
    loadFolders();
    inbox.loadMessages();
  }

  async function logout() {
    await auth.logout();
    resetMailbox();
    inbox.reset();
  }

  /* screens */

  if (auth.authLoading) {
    return <AuthLoading />;
  }

  if (!auth.authenticated) {
    return <AuthScreen auth={auth} />;
  }

  return (
    <main className="mail-app">
      <Topbar
        search={search}
        onSearchChange={setSearch}
        onOpenSidebar={() => setSidebarOpen(true)}
        onRefresh={refresh}
        mailbox={mailbox}
        user={auth.user}
        onLogout={logout}
      />

      <div className="mail-layout">
        <Sidebar
          open={sidebarOpen}
          mailbox={mailbox}
          folders={folders}
          unreadCount={unreadCount}
          resolvedActiveFolder={resolvedActiveFolder}
          activeCustomFolderId={activeCustomFolderId}
          onCompose={() => {
            compose.openComposer();
            setSidebarOpen(false);
          }}
          onClose={() => setSidebarOpen(false)}
          onSelectFolder={selectFolder}
        />

        <section className="mail-content">
          {mailError && (
            <div className="error-banner">
              <span>!</span>
              {mailError}
            </div>
          )}

          {inbox.selectedMessage ? (
            <MessageView
              message={inbox.selectedMessage}
              mailbox={mailbox}
              folderName={folderName}
              resolvedActiveFolder={resolvedActiveFolder}
              actionLoading={inbox.actionLoading}
              onBack={() => inbox.setSelectedMessage(null)}
              onToggleStar={inbox.toggleStar}
              onToggleRead={inbox.toggleRead}
              onArchive={(message) => inbox.moveMessage(message, "archive")}
              onSpam={inbox.markAsSpam}
              onNotSpam={inbox.markAsNotSpam}
              onTrash={inbox.handleTrashButton}
              onCompose={compose.openComposer}
            />
          ) : (
            <>
              <FolderHeader
                mailbox={mailbox}
                title={folderName || activeFolder}
                resolvedActiveFolder={resolvedActiveFolder}
                unreadCount={unreadCount}
                messageCount={inbox.messages.length}
                actionLoading={inbox.actionLoading}
                onEmptyTrash={inbox.emptyTrash}
              />

              {inbox.selectedCount > 0 && (
                <BulkToolbar
                  selectedCount={inbox.selectedCount}
                  allVisibleSelected={inbox.allVisibleSelected}
                  resolvedActiveFolder={resolvedActiveFolder}
                  actionLoading={inbox.actionLoading}
                  onToggleSelectAll={inbox.toggleSelectAll}
                  onMarkRead={inbox.bulkMarkRead}
                  onMove={inbox.bulkMove}
                  onTrash={inbox.handleBulkTrashButton}
                  onClear={inbox.clearSelection}
                />
              )}

              <MessageList
                messages={inbox.messages}
                loading={inbox.messagesLoading}
                search={search}
                resolvedActiveFolder={resolvedActiveFolder}
                selectedIds={inbox.selectedIds}
                onOpen={inbox.openMessage}
                onToggleSelect={inbox.toggleSelectedMessage}
                onToggleStar={inbox.toggleStar}
                onToggleRead={inbox.toggleRead}
                onSpam={inbox.markAsSpam}
                onTrash={inbox.handleTrashButton}
                onCompose={() => compose.openComposer()}
              />
            </>
          )}
        </section>
      </div>

      {compose.composeOpen && (
        <ComposeWindow compose={compose} mailbox={mailbox} />
      )}

      <Toast toast={toast} onDismiss={dismissToast} />
    </main>
  );
}
