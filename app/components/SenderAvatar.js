import { useMemo, useState } from "react";
import { getAvatarCandidates } from "../lib/avatar";
import { getInitial, getSenderName } from "../lib/format";

export default function SenderAvatar({ message, size = 28 }) {
  const candidates = useMemo(
    () => getAvatarCandidates(message),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      message.sender,
      message.sender_avatar,
      message.senderAvatar,
      message.avatarUrl,
      message.avatar_url,
    ]
  );

  // Tracks how many candidates have failed for the *current* candidate set,
  // so a different message reusing this component starts fresh.
  const key = candidates.join("|");
  const [failure, setFailure] = useState({ key, count: 0 });
  const failedCount = failure.key === key ? failure.count : 0;

  const url = candidates[failedCount];

  if (url) {
    return (
      <img
        className="sender-avatar"
        src={url}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailure({ key, count: failedCount + 1 })}
        style={{ width: size, height: size }}
      />
    );
  }

  // no picture: show the sender's initial
  return (
    <span
      className="sender-avatar sender-avatar-fallback"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {getInitial(getSenderName(message.sender, message.senderName))}
    </span>
  );
}
