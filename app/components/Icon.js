// All SVG icons live here. To add one: add an entry to PATHS, then <Icon name="..." />.

const PATHS = {
  inbox: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5z" />
      <path d="M4 14h4l1.5 2h5L16 14h4" />
    </>
  ),

  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),

  star: (
    <path d="m12 3 2.78 5.63 6.22.9-4.5 4.38 1.06 6.19L12 17.18l-5.56 2.92 1.06-6.19L3 9.53l6.22-.9z" />
  ),

  send: (
    <>
      <path d="m21 3-8.5 18-2.8-7.7L2 10.5z" />
      <path d="M9.7 13.3 21 3" />
    </>
  ),

  draft: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" />
    </>
  ),

  archive: (
    <>
      <path d="M4 7h16v13H4z" />
      <path d="M3 4h18v3H3z" />
      <path d="M9 11h6" />
    </>
  ),

  spam: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6" />
      <path d="M12 16h.01" />
    </>
  ),

  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="m7 7 1 13h8l1-13" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),

  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 5 5" />
    </>
  ),

  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.7-4L4 9" />
      <path d="M4 4v5h5" />
      <path d="M4 13a8 8 0 0 0 14.7 4L20 15" />
      <path d="M20 20v-5h-5" />
    </>
  ),

  arrowLeft: (
    <>
      <path d="m15 18-6-6 6-6" />
      <path d="M9 12h10" />
    </>
  ),

  reply: (
    <>
      <path d="M9 8 4 12l5 4" />
      <path d="M4 12h10a6 6 0 0 1 6 6" />
    </>
  ),

  replyAll: (
    <>
      <path d="M13 8 8 12l5 4" />
      <path d="M8 12h9a6 6 0 0 1 6 6" />
      <path d="M4 8v8" />
    </>
  ),

  forward: (
    <>
      <path d="m15 8 5 4-5 4" />
      <path d="M20 12H10a6 6 0 0 0-6 6" />
    </>
  ),

  attachment: (
    <path d="M21.44 11.05 12.25 20.2a5.5 5.5 0 0 1-7.78-7.78l9.19-9.19a3.67 3.67 0 0 1 5.19 5.19l-9.2 9.19a1.83 1.83 0 0 1-2.6-2.6l8.49-8.48" />
  ),

  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </>
  ),

  menu: <path d="M4 7h16M4 12h16M4 17h16" />,

  logout: (
    <>
      <path d="M10 5H5v14h5" />
      <path d="M13 8l4 4-4 4" />
      <path d="M17 12H9" />
    </>
  ),

  plus: <path d="M12 5v14M5 12h14" />,

  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </>
  ),

  chevron: <path d="m9 18 6-6-6-6" />,

  ban: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m5.6 5.6 12.8 12.8" />
    </>
  ),

  inboxAction: (
    <>
      <path d="M4 5h16v14H4z" />
      <path d="M4 14h4l1.5 2h5L16 14h4" />
    </>
  ),

  check: <path d="m5 12 4 4L19 6" />,

  more: (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),

  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
      <circle cx="9.5" cy="7" r="4" />
      <path d="M17 11a4 4 0 0 0 0-8" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
    </>
  ),

  chevronDown: <path d="m6 9 6 6 6-6" />,
};

export default function Icon({ name, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
