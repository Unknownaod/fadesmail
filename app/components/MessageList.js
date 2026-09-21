import Icon from "./Icon";
import MessageRow from "./MessageRow";

function emptyTitle(search, folder) {
  if (search) return "Nothing matched your search";

  switch (folder) {
    case "sent":
      return "No sent messages";
    case "drafts":
      return "No drafts";
    case "trash":
      return "Trash is empty";
    case "spam":
      return "Spam is empty";
    default:
      return "Your inbox is empty";
  }
}

function emptyText(search, folder) {
  if (search) return "Try searching for another sender, subject, or phrase.";
  if (folder === "spam") return "Messages reported as spam will appear here.";
  return "When messages arrive, they'll appear here.";
}

export default function MessageList({
  messages,
  loading,
  search,
  resolvedActiveFolder,
  selectedIds,
  onOpen,
  onToggleSelect,
  onToggleStar,
  onToggleRead,
  onSpam,
  onTrash,
  onCompose,
}) {
  if (loading) {
    return (
      <div className="message-list">
        <div className="empty-state">
          <div className="loading-ring" />

          <h2>Loading your mail</h2>

          <p>Fetching your latest messages...</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="message-list">
        <div className="empty-state">
          <div className="empty-icon">
            <Icon name="mail" size={27} />
          </div>

          <h2>{emptyTitle(search, resolvedActiveFolder)}</h2>

          <p>{emptyText(search, resolvedActiveFolder)}</p>

          {!search && resolvedActiveFolder === "inbox" && (
            <button className="empty-compose" type="button" onClick={onCompose}>
              <Icon name="plus" size={17} />

              Compose a message
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <MessageRow
          key={message.id}
          message={message}
          isSelected={selectedIds.includes(message.id)}
          resolvedActiveFolder={resolvedActiveFolder}
          onOpen={onOpen}
          onToggleSelect={onToggleSelect}
          onToggleStar={onToggleStar}
          onToggleRead={onToggleRead}
          onSpam={onSpam}
          onTrash={onTrash}
        />
      ))}
    </div>
  );
}
