import { useState } from "react";
import { getAvatarUrl } from "../lib/avatar";
import { getInitial, getSenderName } from "../lib/format";

export default function SenderAvatar({ message, size = 28 }) {
  const url = getAvatarUrl(message);
  const [failed, setFailed] = useState(false);

  if (url && !failed) {
    return (
      <img
        className="sender-avatar"
        src={url}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
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
