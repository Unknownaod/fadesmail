"use client";

import { useEffect, useState } from "react";
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

// Sign in / create account screen. `auth` comes from useAuth().
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
    isSignIn ? "signin" : "checking"
  );

  const [inviteError, setInviteError] = useState("");

  useEffect(() => {
    if (isSignIn) {
      setInviteState("signin");
      setInviteError("");
      return;
    }

    let cancelled = false;

    async function validateInvite() {
      setInviteState("checking");
      setInviteError("");

      const params = new URLSearchParams(window.location.search);
      const inviteCode = params.get("invite");

      if (!inviteCode) {
        if (!cancelled) {
          setInviteState("invalid");
          setInviteError(
            "A valid invitation link is required to create a Fades Mail account."
          );
        }

        return;
      }

      try {
        const response = await fetch(
          `${INVITE_API_URL}/invites/validate?code=${encodeURIComponent(
            inviteCode
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

        let data = null;

        try {
          data = await response.json();
        } catch {
          data = null;
        }

        if (cancelled) return;

        if (!response.ok || !data?.valid) {
          setInviteState("invalid");

          setInviteError(
            data?.message ||
              "This invitation is invalid, expired, or has already been used."
          );

          return;
        }

        setInviteState("valid");
      } catch (error) {
        console.error("Invite validation failed:", error);

        if (!cancelled) {
          setInviteState("invalid");
          setInviteError(
            "We couldn't verify your invitation right now. Please try again."
          );
        }
      }
    }

    validateInvite();

    return () => {
      cancelled = true;
    };
  }, [isSignIn]);

  const signupBlocked =
    !isSignIn &&
    inviteState !== "valid";

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
              {inviteState !== "valid" ? (
                <div className="invite-gate">
                  <InviteIcon state={inviteState} />

                  <div className="invite-gate-heading">
                    {inviteState === "checking" ? (
                      <>
                        <div className="invite-status">
                          Verifying invitation
                        </div>

                        <h1>
                          Checking your invite...
                        </h1>

                        <p>
                          Give us a moment while we verify
                          your private Fades Mail invitation.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="invite-status invite-status-locked">
                          Private access
                        </div>

                        <h1>
                          Invitation required.
                        </h1>

                        <p>
                          Fades Mail is currently private.
                          You need a valid invitation link
                          to create a mailbox.
                        </p>
                      </>
                    )}
                  </div>

                  {inviteState === "checking" && (
                    <div className="invite-progress">
                      <div className="invite-progress-bar" />
                    </div>
                  )}

                  {inviteState === "invalid" && (
                    <div className="invite-error-card">
                      <div className="invite-error-icon">
                        !
                      </div>

                      <div>
                        <strong>
                          We couldn't accept this
                          invitation
                        </strong>

                        <span>{inviteError}</span>
                      </div>
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
                    onSubmit={submitAuth}
                  >
                    <label>
                      <span>Username</span>

                      <div className="input-shell">
                        <input
                          type="text"
                          value={username}
                          onChange={(event) =>
                            setUsername(
                              event.target.value
                            )
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
                      disabled={authSubmitting}
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
                </div>
              )}
            </>
          )}

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
