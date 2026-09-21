import { useId } from "react";
import "./VerifiedBadge.css";

// Small checkmark shown next to a sender whose brand logo was verified via BIMI.
// Hover or keyboard focus reveals a short explanation.
export default function VerifiedBadge({ domain }) {
  const tipId = useId();

  return (
    <span
      className="verified-badge"
      tabIndex={0}
      role="img"
      aria-label="Verified sender"
      aria-describedby={tipId}
    >
      <svg
        width="15"
        height="15"
        viewBox="0 0 16 16"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="8" cy="8" r="8" fill="currentColor" />
        <path
          d="M4.5 8.3l2.3 2.3 4.7-4.9"
          fill="none"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <span className="verified-badge-tip" role="tooltip" id={tipId}>
        <strong>Verified sender</strong>

        <span>
          {domain ? `${domain} publishes` : "This sender publishes"} an official
          brand logo through BIMI and enforces DMARC to protect against
          spoofing.
        </span>
      </span>
    </span>
  );
}
