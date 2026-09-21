"use client";

import { useEffect, useRef, useState } from "react";
import "./settings.css";
import "./avatar-upload.css";

const API_URL =
  process.env.NEXT_PUBLIC_MAIL_API_URL ||
  "https://mail-api.fades.lol";

// Profile picture upload
const ACCEPTED_AVATAR_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
];

const MAX_AVATAR_SOURCE_BYTES = 10 * 1024 * 1024;

const AVATAR_SIZE = 256;

/*
 * Crops the chosen image to a centered square, scales it to
 * 256x256 and re-encodes it (WebP where supported, PNG otherwise).
 * That keeps uploads tiny and strips metadata such as GPS tags.
 */

async function prepareAvatar(file) {
  if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
    throw new Error(
      "Please choose a PNG, JPEG or WebP image."
    );
  }

  if (file.size > MAX_AVATAR_SOURCE_BYTES) {
    throw new Error(
      "That image is too large. Choose one under 10 MB."
    );
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise(
      (resolve, reject) => {
        const element = new Image();

        element.onload = () => resolve(element);

        element.onerror = () =>
          reject(
            new Error(
              "That file couldn't be read as an image."
            )
          );

        element.src = objectUrl;
      }
    );

    const side = Math.min(
      image.naturalWidth,
      image.naturalHeight
    );

    if (!side) {
      throw new Error(
        "That file couldn't be read as an image."
      );
    }

    const sourceX = (image.naturalWidth - side) / 2;
    const sourceY = (image.naturalHeight - side) / 2;

    const canvas = document.createElement("canvas");

    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;

    const context = canvas.getContext("2d");

    context.imageSmoothingQuality = "high";

    context.drawImage(
      image,
      sourceX,
      sourceY,
      side,
      side,
      0,
      0,
      AVATAR_SIZE,
      AVATAR_SIZE
    );

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.9)
    );

    if (!blob) {
      throw new Error(
        "Your browser couldn't process that image."
      );
    }

    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function Logo({ size = 34 }) {
  return (
    <img
      src="/logo.png"
      alt="Fades"
      style={{
        width: size,
        height: size,
        objectFit: "contain",
      }}
    />
  );
}

function Icon({ name, size = 20 }) {
  const icons = {
    arrowLeft: (
      <>
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </>
    ),

    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),

    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),

    palette: (
      <>
        <path d="M12 3a9 9 0 0 0 0 18h1.2a1.8 1.8 0 0 0 1.2-3.1 1.8 1.8 0 0 1 1.3-3.1H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3Z" />
        <circle cx="7.5" cy="11" r="1" />
        <circle cx="9" cy="7" r="1" />
        <circle cx="13" cy="6.5" r="1" />
      </>
    ),

    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),

    shield: (
      <>
        <path d="M12 3 20 6v5c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6l8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),

    trash: (
      <>
        <path d="M4 7h16" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M6 7l1 13h10l1-13" />
        <path d="M9 7V4h6v3" />
      </>
    ),

    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 1.7-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-2.4v-.09a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.7-1.7.06-.06A1.7 1.7 0 0 0 8.4 15a1.7 1.7 0 0 0-1.56-1.03H6.75v-2.4h.09A1.7 1.7 0 0 0 8.4 10a1.7 1.7 0 0 0-.34-1.88L8 8.06l1.7-1.7.06.06A1.7 1.7 0 0 0 11.64 6.1a1.7 1.7 0 0 0 1.03-1.56V4h2.4v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.7 1.7-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.56 1.03H21v2.4h-.04A1.7 1.7 0 0 0 19.4 15z" />
      </>
    ),

    logout: (
      <>
        <path d="M10 17l5-5-5-5" />
        <path d="M15 12H3" />
        <path d="M13 5V3h7v18h-7v-2" />
      </>
    ),
  };

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
      {icons[name]}
    </svg>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      className={`settings-toggle ${
        checked ? "active" : ""
      }`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span />
    </button>
  );
}

export default function SettingsPage() {
  const [user, setUser] = useState(null);
  const [mailbox, setMailbox] = useState(null);

  const [darkMode, setDarkMode] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [desktopNotifications, setDesktopNotifications] =
    useState(false);
  const [soundNotifications, setSoundNotifications] =
    useState(true);
  const [conversationGrouping, setConversationGrouping] =
    useState(true);

  // Profile picture
  const [avatarVersion, setAvatarVersion] = useState(0);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarDragging, setAvatarDragging] =
    useState(false);

  const fileInputRef = useRef(null);

  // Shown until the image fails to load (no picture uploaded yet).
  const avatarSrc =
    mailbox?.id && !avatarFailed
      ? `${API_URL}/mail/avatar/${mailbox.id}${
          avatarVersion ? `?v=${avatarVersion}` : ""
        }`
      : "";

  useEffect(() => {
    const savedDarkMode =
      localStorage.getItem("fades.mail.darkMode");

    const savedCompact =
      localStorage.getItem("fades.mail.compactMode");

    const savedDesktop =
      localStorage.getItem(
        "fades.mail.desktopNotifications"
      );

    const savedSound =
      localStorage.getItem(
        "fades.mail.soundNotifications"
      );

    const savedGrouping =
      localStorage.getItem(
        "fades.mail.conversationGrouping"
      );

    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === "true");
    }

    if (savedCompact !== null) {
      setCompactMode(savedCompact === "true");
    }

    if (savedDesktop !== null) {
      setDesktopNotifications(savedDesktop === "true");
    }

    if (savedSound !== null) {
      setSoundNotifications(savedSound === "true");
    }

    if (savedGrouping !== null) {
      setConversationGrouping(savedGrouping === "true");
    }

    loadUser();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode
      ? "dark"
      : "light";

    localStorage.setItem(
      "fades.mail.darkMode",
      String(darkMode)
    );
  }, [darkMode]);

  function updateSetting(key, value, setter) {
    setter(value);
    localStorage.setItem(key, String(value));
  }

  async function loadUser() {
    try {
      const response = await fetch(
        `${API_URL}/auth/me`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) return;

      const data = await response.json();

      setUser(data.user || data);
      setMailbox(data.mailbox || null);
    } catch {
      // Settings can still be used if the API is unavailable.
    }
  }

  async function uploadAvatar(file) {
    if (!file || avatarBusy) return;

    if (!mailbox?.id) {
      setAvatarError(
        "Sign in again to change your profile picture."
      );

      return;
    }

    setAvatarBusy(true);
    setAvatarError("");

    try {
      const blob = await prepareAvatar(file);

      const response = await fetch(
        `${API_URL}/mail/avatar`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": blob.type || "image/png",
          },
          body: blob,
        }
      );

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({}));

        throw new Error(
          data.message ||
            "Upload failed. Please try again."
        );
      }

      setAvatarFailed(false);
      setAvatarVersion(Date.now());
    } catch (error) {
      setAvatarError(
        error?.message ||
          "Upload failed. Please try again."
      );
    } finally {
      setAvatarBusy(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function removeAvatar() {
    if (avatarBusy) return;

    setAvatarBusy(true);
    setAvatarError("");

    try {
      const response = await fetch(
        `${API_URL}/mail/avatar`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({}));

        throw new Error(
          data.message ||
            "Couldn't remove your picture. Please try again."
        );
      }

      setAvatarFailed(true);
    } catch (error) {
      setAvatarError(
        error?.message ||
          "Couldn't remove your picture. Please try again."
      );
    } finally {
      setAvatarBusy(false);
    }
  }

  async function logout() {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Continue redirecting even if logout request fails.
    }

    window.location.href = "/";
  }

  return (
    <main className="settings-page">
      <header className="settings-header">
        <div className="settings-header-inner">
          <div className="settings-brand">
            <div className="settings-logo">
              <Logo size={32} />
            </div>

            <div>
              <strong>Fades Mail</strong>
              <span>Settings</span>
            </div>
          </div>

          <button
            className="back-button"
            type="button"
            onClick={() => {
              window.location.href = "/";
            }}
          >
            <Icon
              name="arrowLeft"
              size={18}
            />
            <span>Back to Mail</span>
          </button>
        </div>
      </header>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <a
            href="#account"
            className="settings-nav-item active"
          >
            <Icon
              name="user"
              size={18}
            />
            Account
          </a>

          <a
            href="#mail"
            className="settings-nav-item"
          >
            <Icon
              name="mail"
              size={18}
            />
            Mail
          </a>

          <a
            href="#appearance"
            className="settings-nav-item"
          >
            <Icon
              name="palette"
              size={18}
            />
            Appearance
          </a>

          <a
            href="#notifications"
            className="settings-nav-item"
          >
            <Icon
              name="bell"
              size={18}
            />
            Notifications
          </a>

          <a
            href="#security"
            className="settings-nav-item"
          >
            <Icon
              name="shield"
              size={18}
            />
            Security
          </a>

          <div className="settings-sidebar-divider" />

          <button
            className="settings-nav-item logout-nav"
            type="button"
            onClick={logout}
          >
            <Icon
              name="logout"
              size={18}
            />
            Sign out
          </button>
        </aside>

        <section className="settings-content">
          <div className="settings-title">
            <span className="eyebrow">
              FADES MAIL
            </span>

            <h1>Settings</h1>

            <p>
              Manage your account and customize your
              Fades Mail experience.
            </p>
          </div>

          <section
            id="account"
            className="settings-section"
          >
            <div className="section-heading">
              <div className="section-icon">
                <Icon
                  name="user"
                  size={19}
                />
              </div>

              <div>
                <h2>Account</h2>
                <p>
                  Your Fades Mail account information.
                </p>
              </div>
            </div>

            <div className="settings-card">
              <div className="profile-row">
                <div
                  className={`profile-avatar ${
                    avatarSrc ? "has-image" : ""
                  }`}
                >
                  {avatarSrc ? (
                    <img
                      key={avatarSrc}
                      className="profile-avatar-image"
                      src={avatarSrc}
                      alt="Your profile picture"
                      onError={() =>
                        setAvatarFailed(true)
                      }
                    />
                  ) : (
                    <Logo size={38} />
                  )}
                </div>

                <div className="profile-details">
                  <strong>
                    {mailbox?.email ||
                      user?.email ||
                      "Fades Mail"}
                  </strong>

                  <span>
                    {user?.username
                      ? `@${user.username}`
                      : "Your Fades account"}
                  </span>
                </div>
              </div>

              <div className="setting-divider" />

              <div
                className={`setting-row avatar-row ${
                  avatarDragging ? "dragging" : ""
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setAvatarDragging(true);
                }}
                onDragLeave={() =>
                  setAvatarDragging(false)
                }
                onDrop={(event) => {
                  event.preventDefault();
                  setAvatarDragging(false);

                  uploadAvatar(
                    event.dataTransfer.files?.[0]
                  );
                }}
              >
                <div>
                  <span className="setting-label">
                    Profile picture
                  </span>

                  <span className="setting-description">
                    PNG, JPEG or WebP. Choose a file or
                    drop one here. It's cropped to a
                    square.
                  </span>

                  {avatarError && (
                    <span
                      className="avatar-error"
                      role="alert"
                    >
                      {avatarError}
                    </span>
                  )}
                </div>

                <div className="avatar-actions">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    onChange={(event) =>
                      uploadAvatar(
                        event.target.files?.[0]
                      )
                    }
                  />

                  <button
                    className="avatar-button"
                    type="button"
                    disabled={avatarBusy}
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                  >
                    {avatarBusy
                      ? "Working..."
                      : avatarSrc
                        ? "Change photo"
                        : "Upload photo"}
                  </button>

                  {avatarSrc && (
                    <button
                      className="avatar-button avatar-button-remove"
                      type="button"
                      disabled={avatarBusy}
                      onClick={removeAvatar}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              <div className="setting-divider" />

              <div className="setting-row">
                <div>
                  <span className="setting-label">
                    Email address
                  </span>

                  <span className="setting-description">
                    Your Fades Mail address.
                  </span>
                </div>

                <span className="setting-value">
                  {mailbox?.email ||
                    user?.email ||
                    "Not available"}
                </span>
              </div>

              <div className="setting-divider" />

              <div className="setting-row">
                <div>
                  <span className="setting-label">
                    Username
                  </span>

                  <span className="setting-description">
                    Your Fades username.
                  </span>
                </div>

                <span className="setting-value">
                  {user?.username
                    ? `@${user.username}`
                    : "Not available"}
                </span>
              </div>
            </div>
          </section>

          <section
            id="mail"
            className="settings-section"
          >
            <div className="section-heading">
              <div className="section-icon">
                <Icon
                  name="mail"
                  size={19}
                />
              </div>

              <div>
                <h2>Mail</h2>
                <p>
                  Change how your inbox behaves.
                </p>
              </div>
            </div>

            <div className="settings-card">
              <div className="setting-row">
                <div>
                  <span className="setting-label">
                    Conversation grouping
                  </span>

                  <span className="setting-description">
                    Group related messages together in
                    your inbox.
                  </span>
                </div>

                <Toggle
                  checked={conversationGrouping}
                  onChange={(value) =>
                    updateSetting(
                      "fades.mail.conversationGrouping",
                      value,
                      setConversationGrouping
                    )
                  }
                />
              </div>

              <div className="setting-divider" />

              <div className="setting-row">
                <div>
                  <span className="setting-label">
                    Compact inbox
                  </span>

                  <span className="setting-description">
                    Show more messages on the screen at
                    once.
                  </span>
                </div>

                <Toggle
                  checked={compactMode}
                  onChange={(value) =>
                    updateSetting(
                      "fades.mail.compactMode",
                      value,
                      setCompactMode
                    )
                  }
                />
              </div>
            </div>
          </section>

          <section
            id="appearance"
            className="settings-section"
          >
            <div className="section-heading">
              <div className="section-icon">
                <Icon
                  name="palette"
                  size={19}
                />
              </div>

              <div>
                <h2>Appearance</h2>
                <p>
                  Customize how Fades Mail looks.
                </p>
              </div>
            </div>

            <div className="settings-card">
              <div className="setting-row">
                <div>
                  <span className="setting-label">
                    Dark mode
                  </span>

                  <span className="setting-description">
                    Use the dark Fades Mail interface.
                  </span>
                </div>

                <Toggle
                  checked={darkMode}
                  onChange={(value) =>
                    updateSetting(
                      "fades.mail.darkMode",
                      value,
                      setDarkMode
                    )
                  }
                />
              </div>
            </div>
          </section>

          <section
            id="notifications"
            className="settings-section"
          >
            <div className="section-heading">
              <div className="section-icon">
                <Icon
                  name="bell"
                  size={19}
                />
              </div>

              <div>
                <h2>Notifications</h2>
                <p>
                  Control how you are notified about new
                  mail.
                </p>
              </div>
            </div>

            <div className="settings-card">
              <div className="setting-row">
                <div>
                  <span className="setting-label">
                    Desktop notifications
                  </span>

                  <span className="setting-description">
                    Receive notifications when new mail
                    arrives.
                  </span>
                </div>

                <Toggle
                  checked={desktopNotifications}
                  onChange={async (value) => {
                    if (
                      value &&
                      typeof Notification !==
                        "undefined"
                    ) {
                      try {
                        const permission =
                          await Notification.requestPermission();

                        if (
                          permission !== "granted"
                        ) {
                          value = false;
                        }
                      } catch {
                        value = false;
                      }
                    }

                    updateSetting(
                      "fades.mail.desktopNotifications",
                      value,
                      setDesktopNotifications
                    );
                  }}
                />
              </div>

              <div className="setting-divider" />

              <div className="setting-row">
                <div>
                  <span className="setting-label">
                    Notification sounds
                  </span>

                  <span className="setting-description">
                    Play a sound for new mail
                    notifications.
                  </span>
                </div>

                <Toggle
                  checked={soundNotifications}
                  onChange={(value) =>
                    updateSetting(
                      "fades.mail.soundNotifications",
                      value,
                      setSoundNotifications
                    )
                  }
                />
              </div>
            </div>
          </section>

          <section
            id="security"
            className="settings-section"
          >
            <div className="section-heading">
              <div className="section-icon">
                <Icon
                  name="shield"
                  size={19}
                />
              </div>

              <div>
                <h2>Security</h2>
                <p>
                  Manage your Fades Mail account security.
                </p>
              </div>
            </div>

            <div className="settings-card">
              <div className="security-status">
                <div className="security-status-icon">
                  <Icon
                    name="shield"
                    size={21}
                  />
                </div>

                <div>
                  <strong>
                    Your account is protected
                  </strong>

                  <span>
                    Fades Mail uses your existing Fades
                    account session.
                  </span>
                </div>

                <span className="security-badge">
                  Active
                </span>
              </div>

              <div className="setting-divider" />

              <div className="setting-row">
                <div>
                  <span className="setting-label">
                    Sign out
                  </span>

                  <span className="setting-description">
                    Sign out of this Fades Mail session.
                  </span>
                </div>

                <button
                  className="danger-button"
                  type="button"
                  onClick={logout}
                >
                  Sign out
                </button>
              </div>
            </div>
          </section>

          <footer className="settings-footer">
            <div className="footer-brand">
              <Logo size={22} />
              <span>Fades Mail</span>
            </div>

            <span>
              Private email, beautifully simple.
            </span>
          </footer>
        </section>
      </div>
    </main>
  );
}
