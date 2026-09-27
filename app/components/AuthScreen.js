
"use client";

import { useCallback, useEffect, useState } from "react";
import Logo from "./Logo";

const INVITE_API_URL = "https://invite-api.fades.lol";

function DoodleBackground() {
  const doodles = [
    { icon: "✈", x: "8%", y: "12%", r: "-18deg", d: "0s" },
    { icon: "♡", x: "18%", y: "72%", r: "14deg", d: "1s" },
    { icon: "✉", x: "31%", y: "20%", r: "-8deg", d: "2s" },
    { icon: "✦", x: "43%", y: "82%", r: "18deg", d: "1.5s" },
    { icon: "☁", x: "56%", y: "11%", r: "-12deg", d: "2.5s" },
    { icon: "@", x: "69%", y: "76%", r: "10deg", d: ".5s" },
    { icon: "⌁", x: "82%", y: "18%", r: "-16deg", d: "3s" },
    { icon: "♡", x: "91%", y: "61%", r: "16deg", d: "1.2s" },
    { icon: "✈", x: "73%", y: "43%", r: "20deg", d: "2.2s" },
    { icon: "✦", x: "11%", y: "43%", r: "-20deg", d: "1.8s" },
    { icon: "✉", x: "88%", y: "88%", r: "-7deg", d: "2.7s" },
    { icon: "@", x: "37%", y: "57%", r: "12deg", d: "3.2s" },
  ];

  return (
    <div className="invite-doodles" aria-hidden="true">
      <div className="invite-doodles-grid" />

      {doodles.map((item, index) => (
        <span
          key={index}
          className="invite-doodle"
          style={{
            left: item.x,
            top: item.y,
            "--rotation": item.r,
            "--delay": item.d,
          }}
        >
          {item.icon}
        </span>
      ))}
    </div>
  );
}

function InviteIcon({ state }) {
  if (state === "checking") {
    return (
      <div className="invite-icon invite-icon-checking">
        <div className="invite-spinner" />
        <span>✉</span>
      </div>
    );
  }

  if (state === "valid") {
    return (
      <div className="invite-icon invite-icon-success">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 12.5l4.2 4.2L19 7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="invite-icon invite-icon-locked">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect
          x="5"
          y="10"
          width="14"
          height="10"
          rx="2.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />

        <path
          d="M8 10V7.5a4 4 0 0 1 8 0V10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        <circle cx="12" cy="15" r="1.1" fill="currentColor" />
      </svg>
    </div>
  );
}

// Sign in / create account screen.
// auth comes from useAuth().

export default function AuthScreen({ auth }) {
  const {
    authMode,
    username,
    setUsername,
    email,
    setEmail,
    password,
    setPassword,
    authError,
    authSubmitting,
    submitAuth,
    toggleAuthMode,
  } = auth;

  const isSignIn = authMode === "signin";

  const [inviteState, setInviteState] = useState(
    isSignIn ? "signin" : "invalid"
  );

  const [inviteError, setInviteError] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteChecking, setInviteChecking] = useState(false);

  // =========================================================
  // INVITE VALIDATION
  // =========================================================

  const validateInviteCode = useCallback(async (code) => {
    const cleanedCode = String(code || "")
      .trim()
      .toUpperCase();

    if (!cleanedCode) {
      setInviteState("invalid");
      setInviteError("Please enter your invitation code.");
      return;
    }

    setInviteChecking(true);
    setInviteState("checking");
    setInviteError("");

    try {
      const response = await fetch(
        `${INVITE_API_URL}/api/admin?action=validate&code=${encodeURIComponent(
          cleanedCode
        )}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          credentials: "omit",
          cache: "no-store",
        }
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        console.error("Invite API error:", response.status, data);

        setInviteState("invalid");

        if (response.status === 404) {
          setInviteError(
            "The invitation verification endpoint was not found. Please contact Fades Mail support."
          );
        } else if (response.status === 401 || response.status === 403) {
          setInviteError(
            "The invitation server is not allowing public verification. Please contact Fades Mail support."
          );
        } else {
          setInviteError(
            data?.message ||
              data?.error ||
              "We couldn't verify your invitation. Please try again."
          );
        }

        return;
      }

      if (!data?.valid) {
        setInviteState("invalid");

        setInviteError(
          data?.message ||
            "This invitation is invalid, expired, or has already been used."
        );

        return;
      }

      // Invitation is valid.
      setInviteCode(cleanedCode);
      setInviteState("valid");
      setInviteError("");

      // Keep the code in the URL so a refresh doesn't lose it.
      const url = new URL(window.location.href);

      url.searchParams.set("invite", cleanedCode);

      window.history.replaceState({}, "", url.toString());
    } catch (error) {
      console.error("Invite validation failed:", error);

      setInviteState("invalid");

      setInviteError(
        "Unable to connect to the invitation server. Please try again."
      );
    } finally {
      setInviteChecking(false);
    }
  }, []);

  // =========================================================
  // AUTOMATICALLY CHECK INVITE LINKS
  // =========================================================

  useEffect(() => {
    if (isSignIn) {
      setInviteState("signin");
      setInviteError("");
      setInviteChecking(false);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("invite");

    if (codeFromUrl) {
      const cleanedCode = codeFromUrl.trim().toUpperCase();

      setInviteCode(cleanedCode);
      validateInviteCode(cleanedCode);
    } else {
      // No invite in URL.
      // Allow the user to manually enter one.
      setInviteState("invalid");
      setInviteError("");
    }
  }, [isSignIn, validateInviteCode]);

  // =========================================================
  // INVITE INPUT
  // =========================================================

  function handleInviteChange(event) {
    const value = event.target.value.toUpperCase();

    setInviteCode(value);
    setInviteState("invalid");
    setInviteError("");

    // Remove the old invite from the URL if the user edits it.
    const url = new URL(window.location.href);

    url.searchParams.delete("invite");

    window.history.replaceState({}, "", url.toString());
  }

  function handleInviteSubmit(event) {
    event.preventDefault();

    if (inviteChecking) return;

    validateInviteCode(inviteCode);
  }

  // =========================================================
  // SIGNUP ACCESS
  // =========================================================

  const signupBlocked =
    !isSignIn && inviteState !== "valid";

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="auth-page">
      {!isSignIn && <DoodleBackground />}

      <div className="auth-shell">
        <div className="auth-brand">
          <Logo size={40} />

          <div>
            <strong>Fades Mail</strong>
            <span>Private email, beautifully simple.</span>
          </div>
        </div>

        <div
          className={`auth-card ${
            !isSignIn ? "auth-card-invite" : ""
          } ${
            inviteState === "valid"
              ? "auth-card-verified"
              : ""
          }`}
        >
          {/* ================================================= */}
          {/* SIGN IN */}
          {/* ================================================= */}

          {isSignIn ? (
            <>
              <div className="auth-heading">
                <div className="auth-heading-badge">
                  Welcome back
                </div>

                <h1>Welcome back.</h1>

                <p>
                  Sign in to continue to your Fades Mail
                  account.
                </p>
              </div>

              <form
                className="auth-form"
                onSubmit={submitAuth}
              >
                <label>
                  <span>Email</span>

                  <input
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </label>

                <label>
                  <span>Password</span>

                  <input
                    type="password"
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Your password"
                    autoComplete="current-password"
                    required
                  />
                </label>

                {authError && (
                  <div className="auth-error">
                    <span>!</span>
                    {authError}
                  </div>
                )}

                <button
                  className="auth-submit"
                  type="submit"
                  disabled={authSubmitting}
                >
                  <span>
                    {authSubmitting
                      ? "Please wait..."
                      : "Sign in"}
                  </span>

                  {!authSubmitting && (
                    <span className="submit-arrow">
                      →
                    </span>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              {/* ============================================= */}
              {/* SIGNUP: INVITE VERIFICATION */}
              {/* ============================================= */}

              {inviteState !== "valid" ? (
                <div className="invite-gate">
                  <InviteIcon state={inviteState} />

                  <div className="invite-gate-heading">
                    <div className="invite-status invite-status-locked">
                      Private access
                    </div>

                    <h1>
                      You're invited?
                    </h1>

                    <p>
                      Fades Mail is currently private.
                      Enter your invitation code below
                      to create your mailbox.
                    </p>
                  </div>

                  {/* INVITE CODE FORM */}

                  <form
                    className="invite-entry"
                    onSubmit={handleInviteSubmit}
                  >
                    <label className="invite-code-label">
                      <span>Invitation code</span>

                      <input
                        type="text"
                        value={inviteCode}
                        onChange={handleInviteChange}
                        placeholder="FDS-XXXX-XXXX-XXXX"
                        autoComplete="off"
                        spellCheck={false}
                        maxLength={22}
                        disabled={inviteChecking}
                        required
                      />
                    </label>

                    {inviteError && (
                      <div className="invite-error-card">
                        <div className="invite-error-icon">
                          !
                        </div>

                        <div>
                          <strong>
                            We couldn't accept this invitation
                          </strong>

                          <span>{inviteError}</span>
                        </div>
                      </div>
                    )}

                    <button
                      className="auth-submit"
                      type="submit"
                      disabled={
                        inviteChecking ||
                        !inviteCode.trim()
                      }
                    >
                      <span>
                        {inviteChecking
                          ? "Verifying invitation..."
                          : "Verify invitation"}
                      </span>

                      {!inviteChecking && (
                        <span className="submit-arrow">
                          →
                        </span>
                      )}
                    </button>
                  </form>

                  {inviteChecking && (
                    <div className="invite-progress">
                      <div className="invite-progress-bar" />
                    </div>
                  )}

                  <div className="invite-private-note">
                    <span className="invite-private-lock">
                      🔒
                    </span>

                    <span>
                      Fades Mail is invite-only by design.
                    </span>
                  </div>
                </div>
              ) : (
                /* =========================================== */
                /* SIGNUP: VALID INVITE */
                /* =========================================== */

                <div className="signup-content">
                  <div className="verified-banner">
                    <div className="verified-banner-icon">
                      <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          d="M5 12.5l4.2 4.2L19 7"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>

                    <div>
                      <strong>
                        Invitation verified
                      </strong>

                      <span>
                        You're invited to Fades Mail.
                      </span>
                    </div>
                  </div>

                  <div className="auth-heading">
                    <div className="auth-heading-badge">
                      Private mailbox
                    </div>

                    <h1>
                      Create your mailbox.
                    </h1>

                    <p>
                      Choose your Fades Mail address and
                      create your account.
                    </p>
                  </div>

                  <form
                    className="auth-form"
                    onSubmit={(event) => {
                      // Prevent signup if the invite is not valid.
                      if (inviteState !== "valid") {
                        event.preventDefault();
                        setInviteError(
                          "Please verify your invitation first."
                        );
                        return;
                      }

                      // Ensure the invitation code is available
                      // to the signup handler.
                      auth.inviteCode = inviteCode;

                      submitAuth(event);
                    }}
                  >
                    <label>
                      <span>Username</span>

                      <div className="input-shell">
                        <input
                          type="text"
                          value={username}
                          onChange={(event) =>
                            setUsername(event.target.value)
                          }
                          placeholder="yourname"
                          autoComplete="username"
                          required
                        />

                        <small>@fades.lol</small>
                      </div>

                      <em>
                        Your new address will{" "}
                        {username
                          ? `${username.toLowerCase()}@fades.lol`
                          : "yourname@fades.lol"}
                      </em>
                    </label>

                    <label>
                      <span>Email</span>

                      <input
                        type="email"
                        value={email}
                        onChange={(event) =>
                          setEmail(event.target.value)
                        }
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                      />
                    </label>

                    <label>
                      <span>Password</span>

                      <input
                        type="password"
                        value={password}
                        onChange={(event) =>
                          setPassword(event.target.value)
                        }
                        placeholder="Your password"
                        autoComplete="new-password"
                        required
                      />
                    </label>

                    {authError && (
                      <div className="auth-error">
                        <span>!</span>
                        {authError}
                      </div>
                    )}

                    <button
                      className="auth-submit"
                      type="submit"
                      disabled={
                        authSubmitting ||
                        signupBlocked
                      }
                    >
                      <span>
                        {authSubmitting
                          ? "Creating mailbox..."
                          : "Create mailbox"}
                      </span>

                      {!authSubmitting && (
                        <span className="submit-arrow">
                          →
                        </span>
                      )}
                    </button>
                  </form>

                  <button
                    type="button"
                    className="invite-change-button"
                    onClick={() => {
                      setInviteState("invalid");
                      setInviteError("");
                      setInviteCode("");

                      const url = new URL(
                        window.location.href
                      );

                      url.searchParams.delete("invite");

                      window.history.replaceState(
                        {},
                        "",
                        url.toString()
                      );
                    }}
                  >
                    Use a different invitation code
                  </button>
                </div>
              )}
            </>
          )}

          {/* ================================================= */}
          {/* SIGN IN / SIGNUP SWITCH */}
          {/* ================================================= */}

          <div className="auth-switch">
            <span>
              {isSignIn
                ? "Don't have an account?"
                : "Already have an account?"}
            </span>

            <button
              type="button"
              onClick={toggleAuthMode}
            >
              {isSignIn
                ? "Create one"
                : "Sign in"}
            </button>
          </div>
        </div>

        <div className="auth-footer">
          <span>Fades Mail</span>
          <span>•</span>
          <span>fades.lol</span>
          <span>•</span>
          <span>Private by design</span>
        </div>
      </div>
    </main>
  );
}
