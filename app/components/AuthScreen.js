"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Logo from "./Logo";

const INVITE_API_URL =
  "https://invite-api.fades.lol";

// ============================================================
// DOODLE BACKGROUND
// ============================================================

function DoodleBackground() {
  const doodles = [
    {
      icon: "✈",
      x: "8%",
      y: "12%",
      r: "-18deg",
      d: "0s",
    },
    {
      icon: "♡",
      x: "18%",
      y: "72%",
      r: "14deg",
      d: "1s",
    },
    {
      icon: "✉",
      x: "31%",
      y: "20%",
      r: "-8deg",
      d: "2s",
    },
    {
      icon: "✦",
      x: "43%",
      y: "82%",
      r: "18deg",
      d: "1.5s",
    },
    {
      icon: "☁",
      x: "56%",
      y: "11%",
      r: "-12deg",
      d: "2.5s",
    },
    {
      icon: "@",
      x: "69%",
      y: "76%",
      r: "10deg",
      d: ".5s",
    },
    {
      icon: "⌁",
      x: "82%",
      y: "18%",
      r: "-16deg",
      d: "3s",
    },
    {
      icon: "♡",
      x: "91%",
      y: "61%",
      r: "16deg",
      d: "1.2s",
    },
    {
      icon: "✈",
      x: "73%",
      y: "43%",
      r: "20deg",
      d: "2.2s",
    },
    {
      icon: "✦",
      x: "11%",
      y: "43%",
      r: "-20deg",
      d: "1.8s",
    },
    {
      icon: "✉",
      x: "88%",
      y: "88%",
      r: "-7deg",
      d: "2.7s",
    },
    {
      icon: "@",
      x: "37%",
      y: "57%",
      r: "12deg",
      d: "3.2s",
    },
  ];

  return (
    <div
      className="invite-doodles"
      aria-hidden="true"
    >
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

// ============================================================
// INVITE ICON
// ============================================================

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
    );
  }

  return (
    <div className="invite-icon invite-icon-locked">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
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

        <circle
          cx="12"
          cy="15"
          r="1.1"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

// ============================================================
// AUTH SCREEN
// ============================================================

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

  const isSignIn =
    authMode === "signin";

  // ==========================================================
  // INVITE STATE
  // ==========================================================

  const [
    inviteState,
    setInviteState,
  ] = useState(
    isSignIn
      ? "signin"
      : "invalid"
  );

  const [
    inviteError,
    setInviteError,
  ] = useState("");

  const [
    inviteCode,
    setInviteCode,
  ] = useState("");

  const [
    inviteChecking,
    setInviteChecking,
  ] = useState(false);

  const [
    inviteInfo,
    setInviteInfo,
  ] = useState(null);

  // ==========================================================
  // REDEMPTION STATE
  // ==========================================================

  /*
   * This prevents multiple redemption requests from
   * accidentally being sent from this component.
   */

  const inviteRedeemedRef =
    useRef(false);

  /*
   * Tracks whether a signup attempt was actually started.
   */

  const signupAttemptRef =
    useRef(false);

  // ==========================================================
  // NORMALIZE INVITE DATA
  // ==========================================================

  function normalizeInviteInfo(
    invite
  ) {
    if (!invite) {
      return null;
    }

    const maxUses =
      Number(
        invite.maxUses ??
          invite.max_uses ??
          1
      );

    const useCount =
      Number(
        invite.useCount ??
          invite.use_count ??
          0
      );

    const explicitRemaining =
      invite.remainingUses ??
      invite.remaining_uses;

    const remainingUses =
      explicitRemaining !==
      undefined
        ? Number(
            explicitRemaining
          )
        : Math.max(
            0,
            maxUses -
              useCount
          );

    return {
      code:
        invite.code ||
        inviteCode,

      maxUses:
        Number.isFinite(
          maxUses
        )
          ? maxUses
          : 1,

      useCount:
        Number.isFinite(
          useCount
        )
          ? useCount
          : 0,

      remainingUses:
        Number.isFinite(
          remainingUses
        )
          ? remainingUses
          : Math.max(
              0,
              maxUses -
                useCount
            ),

      expiresAt:
        invite.expiresAt ??
        invite.expires_at ??
        null,
    };
  }

  // ==========================================================
  // INVITE VALIDATION
  // ==========================================================

  const validateInviteCode =
    useCallback(
      async (code) => {
        const cleanedCode =
          String(code || "")
            .trim()
            .toUpperCase();

        if (!cleanedCode) {
          setInviteState(
            "invalid"
          );

          setInviteInfo(null);

          setInviteError(
            "Please enter your invitation code."
          );

          return false;
        }

        setInviteChecking(true);
        setInviteState("checking");
        setInviteError("");

        try {
          const response =
            await fetch(
              `${INVITE_API_URL}/api/admin?action=validate&code=${encodeURIComponent(
                cleanedCode
              )}`,
              {
                method: "GET",
                headers: {
                  Accept:
                    "application/json",
                },
                credentials: "omit",
                cache: "no-store",
              }
            );

          const data =
            await response
              .json()
              .catch(
                () => null
              );

          if (!response.ok) {
            console.error(
              "Invite API error:",
              response.status,
              data
            );

            setInviteState(
              "invalid"
            );

            setInviteInfo(null);

            if (
              response.status ===
              404
            ) {
              setInviteError(
                "The invitation verification endpoint was not found. Please contact Fades Mail support."
              );
            } else if (
              response.status ===
                401 ||
              response.status ===
                403
            ) {
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

            return false;
          }

          if (!data?.valid) {
            setInviteState(
              "invalid"
            );

            setInviteInfo(null);

            setInviteError(
              data?.message ||
                "This invitation is invalid, expired, revoked, or has no remaining uses."
            );

            return false;
          }

          // ----------------------------------------------------
          // VALID
          // ----------------------------------------------------

          const normalizedInvite =
            normalizeInviteInfo(
              data.invite
            );

          setInviteCode(
            cleanedCode
          );

          setInviteInfo(
            normalizedInvite
          );

          setInviteState(
            "valid"
          );

          setInviteError("");

          /*
           * Keep the invitation in the URL.
           */

          const url =
            new URL(
              window.location.href
            );

          url.searchParams.set(
            "invite",
            cleanedCode
          );

          window.history.replaceState(
            {},
            "",
            url.toString()
          );

          return true;
        } catch (error) {
          console.error(
            "Invite validation failed:",
            error
          );

          setInviteState(
            "invalid"
          );

          setInviteInfo(null);

          setInviteError(
            "Unable to connect to the invitation server. Please try again."
          );

          return false;
        } finally {
          setInviteChecking(
            false
          );
        }
      },
      [inviteCode]
    );

  // ==========================================================
  // REDEEM INVITE
  // ==========================================================

  const redeemInvite =
    useCallback(
      async (code) => {
        const cleanedCode =
          String(code || "")
            .trim()
            .toUpperCase();

        if (!cleanedCode) {
          return {
            success: false,
            error:
              "Invite code is missing.",
          };
        }

        /*
         * Never redeem the same invite twice from
         * this mounted signup screen.
         */

        if (
          inviteRedeemedRef.current
        ) {
          return {
            success: true,
            alreadyRedeemed: true,
          };
        }

        try {
          const response =
            await fetch(
              `${INVITE_API_URL}/api/admin?action=redeem`,
              {
                method: "POST",
                headers: {
                  "Content-Type":
                    "application/json",
                  Accept:
                    "application/json",
                },
                credentials: "omit",
                cache: "no-store",
                body: JSON.stringify(
                  {
                    code:
                      cleanedCode,
                  }
                ),
              }
            );

          const data =
            await response
              .json()
              .catch(
                () => null
              );

          if (
            !response.ok ||
            !data?.success
          ) {
            console.error(
              "Invite redemption failed:",
              response.status,
              data
            );

            return {
              success: false,
              error:
                data?.error ||
                data?.message ||
                "The invitation could not be redeemed.",
            };
          }

          /*
           * Mark locally as redeemed only after
           * the API confirms the redemption.
           */

          inviteRedeemedRef.current =
            true;

          const updatedInvite =
            normalizeInviteInfo(
              data.invite
            );

          if (updatedInvite) {
            setInviteInfo(
              updatedInvite
            );
          }

          return {
            success: true,
            invite:
              data.invite ||
              null,
          };
        } catch (error) {
          console.error(
            "Invite redemption request failed:",
            error
          );

          return {
            success: false,
            error:
              "We couldn't connect to the invitation server to complete your invitation.",
          };
        }
      },
      [normalizeInviteInfo]
    );

  // ==========================================================
  // INITIAL INVITE CHECK
  // ==========================================================

  useEffect(() => {
    if (isSignIn) {
      setInviteState(
        "signin"
      );

      setInviteError("");

      setInviteInfo(null);

      setInviteChecking(
        false
      );

      signupAttemptRef.current =
        false;

      return;
    }

    const params =
      new URLSearchParams(
        window.location.search
      );

    const codeFromUrl =
      params.get("invite");

    if (codeFromUrl) {
      const cleanedCode =
        codeFromUrl
          .trim()
          .toUpperCase();

      setInviteCode(
        cleanedCode
      );

      validateInviteCode(
        cleanedCode
      );
    } else {
      setInviteState(
        "invalid"
      );

      setInviteError("");

      setInviteInfo(null);
    }
  }, [
    isSignIn,
    validateInviteCode,
  ]);

  // ==========================================================
  // INVITE INPUT
  // ==========================================================

  function handleInviteChange(
    event
  ) {
    const value =
      event.target.value
        .toUpperCase();

    setInviteCode(value);

    setInviteState(
      "invalid"
    );

    setInviteInfo(null);

    setInviteError("");

    const url =
      new URL(
        window.location.href
      );

    url.searchParams.delete(
      "invite"
    );

    window.history.replaceState(
      {},
      "",
      url.toString()
    );
  }

  // ==========================================================
  // INVITE SUBMIT
  // ==========================================================

  async function handleInviteSubmit(
    event
  ) {
    event.preventDefault();

    if (inviteChecking) {
      return;
    }

    await validateInviteCode(
      inviteCode
    );
  }

  // ==========================================================
  // CHANGE INVITE
  // ==========================================================

  function resetInvite() {
    setInviteState(
      "invalid"
    );

    setInviteError("");

    setInviteCode("");

    setInviteInfo(null);

    inviteRedeemedRef.current =
      false;

    signupAttemptRef.current =
      false;

    const url =
      new URL(
        window.location.href
      );

    url.searchParams.delete(
      "invite"
    );

    window.history.replaceState(
      {},
      "",
      url.toString()
    );
  }

  // ==========================================================
  // SIGNUP STATE
  // ==========================================================

  const signupBlocked =
    !isSignIn &&
    inviteState !== "valid";

  // ==========================================================
  // SUBMIT SIGNUP
  // ==========================================================

  async function handleSignupSubmit(
    event
  ) {
    /*
     * Never allow signup without a verified invite.
     */

    if (
      inviteState !== "valid"
    ) {
      event.preventDefault();

      setInviteError(
        "Please verify your invitation first."
      );

      return;
    }

    /*
     * Make absolutely sure we have an invite code.
     */

    const cleanedCode =
      String(inviteCode || "")
        .trim()
        .toUpperCase();

    if (!cleanedCode) {
      event.preventDefault();

      setInviteError(
        "Your invitation code is missing. Please verify your invitation again."
      );

      return;
    }

    /*
     * Keep the invite code available to the existing
     * authentication implementation.
     */

    auth.inviteCode =
      cleanedCode;

    /*
     * Tell the auth system which invitation is being
     * used. This is useful if your submitAuth implementation
     * already supports inviteCode.
     */

    if (
      typeof auth.setInviteCode ===
      "function"
    ) {
      auth.setInviteCode(
        cleanedCode
      );
    }

    signupAttemptRef.current =
      true;

    try {
      /*
       * IMPORTANT:
       *
       * submitAuth should return after the account creation
       * request has completed.
       *
       * The invite is redeemed only AFTER submitAuth succeeds.
       */

      const result =
        await submitAuth(event);

      /*
       * If submitAuth explicitly tells us that signup failed,
       * do NOT consume the invite.
       */

      if (
        result === false ||
        result?.success === false ||
        result?.ok === false
      ) {
        signupAttemptRef.current =
          false;

        return;
      }

      /*
       * Give the authentication request a moment to finish
       * updating its own state if it returns without a
       * structured result.
       */

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            50
          )
      );

      /*
       * If an auth error has already been reported, do not
       * consume the invitation.
       */

      if (authError) {
        signupAttemptRef.current =
          false;

        return;
      }

      /*
       * REDEEM THE INVITE.
       *
       * This is the piece that was missing from the old file.
       */

      const redemption =
        await redeemInvite(
          cleanedCode
        );

      if (
        !redemption.success
      ) {
        console.error(
          "Account creation completed, but invite redemption failed:",
          redemption.error
        );

        /*
         * We intentionally do not pretend the invite was
         * redeemed if the API rejected it.
         *
         * The account has already been created at this point,
         * so this should also be logged server-side in a
         * production system.
         */

        return;
      }

      console.log(
        "Fades Mail invitation redeemed successfully:",
        redemption.invite
      );
    } catch (error) {
      console.error(
        "Signup submission failed:",
        error
      );

      signupAttemptRef.current =
        false;
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="auth-page">
      {/* Same background for BOTH sign-in and signup */}

      <DoodleBackground />

      <div className="auth-shell">
        {/* ================================================== */}
        {/* BRAND */}
        {/* ================================================== */}

        <div className="auth-brand">
          <Logo size={40} />

          <div>
            <strong>
              Fades Mail
            </strong>

            <span>
              Private email, beautifully simple.
            </span>
          </div>
        </div>

        {/* ================================================== */}
        {/* CARD */}
        {/* ================================================== */}

        <div
          className={`auth-card ${
            !isSignIn
              ? "auth-card-invite"
              : "auth-card-signin"
          } ${
            inviteState ===
            "valid"
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

                <h1>
                  Welcome back.
                </h1>

                <p>
                  Sign in to continue
                  to your Fades Mail
                  account.
                </p>
              </div>

              <form
                className="auth-form"
                onSubmit={
                  submitAuth
                }
              >
                {/* EMAIL */}

                <label>
                  <span>
                    Email
                  </span>

                  <input
                    type="email"
                    value={
                      email
                    }
                    onChange={(
                      event
                    ) =>
                      setEmail(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </label>

                {/* PASSWORD */}

                <label>
                  <span>
                    Password
                  </span>

                  <input
                    type="password"
                    value={
                      password
                    }
                    onChange={(
                      event
                    ) =>
                      setPassword(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Your password"
                    autoComplete="current-password"
                    required
                  />
                </label>

                {/* ERROR */}

                {authError && (
                  <div className="auth-error">
                    <span>
                      !
                    </span>

                    <span>
                      {
                        authError
                      }
                    </span>
                  </div>
                )}

                {/* SUBMIT */}

                <button
                  className="auth-submit"
                  type="submit"
                  disabled={
                    authSubmitting
                  }
                >
                  <span>
                    {authSubmitting
                      ? "Signing in..."
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
              {/* ================================================= */}
              {/* SIGNUP — INVITE GATE */}
              {/* ================================================= */}

              {inviteState !==
              "valid" ? (
                <div className="invite-gate">
                  <InviteIcon
                    state={
                      inviteState
                    }
                  />

                  <div className="invite-gate-heading">
                    <div className="invite-status invite-status-locked">
                      Private access
                    </div>

                    <h1>
                      You're invited?
                    </h1>

                    <p>
                      Fades Mail is
                      currently
                      private. Enter
                      your invitation
                      code below to
                      create your
                      mailbox.
                    </p>
                  </div>

                  {/* INVITE FORM */}

                  <form
                    className="invite-entry"
                    onSubmit={
                      handleInviteSubmit
                    }
                  >
                    <label className="invite-code-label">
                      <span>
                        Invitation
                        code
                      </span>

                      <input
                        type="text"
                        value={
                          inviteCode
                        }
                        onChange={
                          handleInviteChange
                        }
                        placeholder="FDS-XXXX-XXXX-XXXX"
                        autoComplete="off"
                        spellCheck={
                          false
                        }
                        maxLength={
                          22
                        }
                        disabled={
                          inviteChecking
                        }
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

                          <span>
                            {
                              inviteError
                            }
                          </span>
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
                      Fades Mail is
                      invite-only by
                      design.
                    </span>
                  </div>
                </div>
              ) : (
                /* =============================================== */
                /* SIGNUP — VERIFIED */
                /* =============================================== */

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
                        You're invited
                        to Fades Mail.
                      </span>
                    </div>
                  </div>

                  {/* ================================================= */}
                  {/* INVITE USAGE */}
                  {/* ================================================= */}

                  {inviteInfo && (
                    <div className="invite-usage-card">
                      <div>
                        <span>
                          Invitation
                          usage
                        </span>

                        <strong>
                          {
                            inviteInfo.useCount
                          }{" "}
                          /{" "}
                          {
                            inviteInfo.maxUses
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          Remaining
                        </span>

                        <strong>
                          {
                            inviteInfo.remainingUses
                          }
                        </strong>
                      </div>
                    </div>
                  )}

                  <div className="auth-heading">
                    <div className="auth-heading-badge">
                      Private mailbox
                    </div>

                    <h1>
                      Create your
                      mailbox.
                    </h1>

                    <p>
                      Choose your
                      Fades Mail
                      address and
                      create your
                      account.
                    </p>
                  </div>

                  <form
                    className="auth-form"
                    onSubmit={
                      handleSignupSubmit
                    }
                  >
                    {/* USERNAME */}

                    <label>
                      <span>
                        Username
                      </span>

                      <div className="input-shell">
                        <input
                          type="text"
                          value={
                            username
                          }
                          onChange={(
                            event
                          ) =>
                            setUsername(
                              event
                                .target
                                .value
                            )
                          }
                          placeholder="yourname"
                          autoComplete="username"
                          required
                        />

                        <small>
                          @fades.lol
                        </small>
                      </div>

                      <em>
                        Your new
                        address will{" "}
                        {username
                          ? `${String(
                              username
                            ).toLowerCase()}@fades.lol`
                          : "yourname@fades.lol"}
                      </em>
                    </label>

                    {/* EMAIL */}

                    <label>
                      <span>
                        Email
                      </span>

                      <input
                        type="email"
                        value={
                          email
                        }
                        onChange={(
                          event
                        ) =>
                          setEmail(
                            event
                              .target
                              .value
                          )
                        }
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                      />
                    </label>

                    {/* PASSWORD */}

                    <label>
                      <span>
                        Password
                      </span>

                      <input
                        type="password"
                        value={
                          password
                        }
                        onChange={(
                          event
                        ) =>
                          setPassword(
                            event
                              .target
                              .value
                          )
                        }
                        placeholder="Your password"
                        autoComplete="new-password"
                        required
                      />
                    </label>

                    {/* AUTH ERROR */}

                    {authError && (
                      <div className="auth-error">
                        <span>
                          !
                        </span>

                        <span>
                          {
                            authError
                          }
                        </span>
                      </div>
                    )}

                    {/* CREATE MAILBOX */}

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
                    onClick={
                      resetInvite
                    }
                  >
                    Use a different
                    invitation code
                  </button>
                </div>
              )}
            </>
          )}

          {/* ================================================= */}
          {/* AUTH MODE SWITCH */}
          {/* ================================================= */}

          <div className="auth-switch">
            <span>
              {isSignIn
                ? "Don't have an account?"
                : "Already have an account?"}
            </span>

            <button
              type="button"
              onClick={
                toggleAuthMode
              }
            >
              {isSignIn
                ? "Create one"
                : "Sign in"}
            </button>
          </div>
        </div>

        {/* ================================================== */}
        {/* FOOTER */}
        {/* ================================================== */}

        <div className="auth-footer">
          <span>
            Fades Mail
          </span>

          <span>•</span>

          <span>
            fades.lol
          </span>

          <span>•</span>

          <span>
            Private by design
          </span>
        </div>
      </div>
    </main>
  );
}
