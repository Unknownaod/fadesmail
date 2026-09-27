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
// RATE LIMITS
// ============================================================
//
// These values mirror the limits configured on the API.
//
// IMPORTANT:
// If you change the backend limits, update these display
// values too.
//
// ============================================================

const RATE_LIMITS = {
  login: {
    amount: 5,
    window: "15 minutes",
    label: "Admin login",
  },

  validate: {
    amount: 60,
    window: "1 minute",
    label: "Invitation verification",
  },

  redeem: {
    amount: 10,
    window: "10 minutes",
    label: "Invitation redemption",
  },

  admin: {
    amount: 120,
    window: "1 minute",
    label: "Admin API",
  },

  global: {
    amount: 300,
    window: "1 minute",
    label: "Total API requests",
  },
};

// ============================================================
// TOAST
// ============================================================

function Toast({
  toast,
  onClose,
}) {
  if (!toast) {
    return null;
  }

  return (
    <div
      className={`fades-toast fades-toast-${toast.type || "error"}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="fades-toast-icon">
        {toast.type === "success"
          ? "✓"
          : toast.type === "warning"
          ? "!"
          : "×"}
      </div>

      <div className="fades-toast-content">
        {toast.title && (
          <strong>
            {toast.title}
          </strong>
        )}

        <span>
          {toast.message}
        </span>

        {toast.retryAfter ? (
          <small>
            Try again in{" "}
            <strong>
              {toast.retryAfter}s
            </strong>
          </small>
        ) : null}
      </div>

      <button
        type="button"
        className="fades-toast-close"
        onClick={onClose}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}

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

      {doodles.map(
        (
          item,
          index
        ) => (
          <span
            key={index}
            className="invite-doodle"
            style={{
              left: item.x,
              top: item.y,
              "--rotation":
                item.r,
              "--delay":
                item.d,
            }}
          >
            {item.icon}
          </span>
        )
      )}
    </div>
  );
}

// ============================================================
// INVITE ICON
// ============================================================

function InviteIcon({
  state,
}) {
  if (
    state === "checking"
  ) {
    return (
      <div className="invite-icon invite-icon-checking">
        <div className="invite-spinner" />

        <span>✉</span>
      </div>
    );
  }

  if (
    state === "valid"
  ) {
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
// RATE LIMIT DISPLAY
// ============================================================

function RateLimitInfo() {
  return (
    <div className="invite-rate-limit">
      <div className="invite-rate-limit-header">
        <div className="invite-rate-limit-shield">
          ↯
        </div>

        <div>
          <strong>
            Protected by rate limits
          </strong>

          <span>
            Invitation endpoints are protected
            against automated abuse.
          </span>
        </div>
      </div>

      <div className="invite-rate-limit-list">
        <div className="invite-rate-limit-row">
          <span>
            Verification
          </span>

          <strong>
            {RATE_LIMITS.validate.amount} /{" "}
            {RATE_LIMITS.validate.window}
          </strong>
        </div>

        <div className="invite-rate-limit-row">
          <span>
            Redemption
          </span>

          <strong>
            {RATE_LIMITS.redeem.amount} /{" "}
            {RATE_LIMITS.redeem.window}
          </strong>
        </div>

        <div className="invite-rate-limit-row">
          <span>
            Global API
          </span>

          <strong>
            {RATE_LIMITS.global.amount} /{" "}
            {RATE_LIMITS.global.window}
          </strong>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AUTH SCREEN
// ============================================================

export default function AuthScreen({
  auth,
}) {
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
  // TOAST STATE
  // ==========================================================

  const [
    toast,
    setToast,
  ] = useState(null);

  const toastTimerRef =
    useRef(null);

  const showToast =
    useCallback(
      ({
        title,
        message,
        type = "error",
        retryAfter = null,
        duration = 6500,
      }) => {
        if (
          toastTimerRef.current
        ) {
          clearTimeout(
            toastTimerRef.current
          );
        }

        setToast({
          title,
          message,
          type,
          retryAfter,
        });

        if (duration > 0) {
          toastTimerRef.current =
            setTimeout(() => {
              setToast(null);
            }, duration);
        }
      },
      []
    );

  const closeToast =
    useCallback(() => {
      if (
        toastTimerRef.current
      ) {
        clearTimeout(
          toastTimerRef.current
        );
      }

      setToast(null);
    }, []);

  useEffect(() => {
    return () => {
      if (
        toastTimerRef.current
      ) {
        clearTimeout(
          toastTimerRef.current
        );
      }
    };
  }, []);

  // ==========================================================
  // RATE LIMIT COOLDOWN
  // ==========================================================

  const [
    rateLimitCooldown,
    setRateLimitCooldown,
  ] = useState(0);

  const cooldownTimerRef =
    useRef(null);

  useEffect(() => {
    if (
      rateLimitCooldown <= 0
    ) {
      if (
        cooldownTimerRef.current
      ) {
        clearInterval(
          cooldownTimerRef.current
        );

        cooldownTimerRef.current =
          null;
      }

      return;
    }

    cooldownTimerRef.current =
      setInterval(() => {
        setRateLimitCooldown(
          (current) =>
            Math.max(
              0,
              current - 1
            )
        );
      }, 1000);

    return () => {
      if (
        cooldownTimerRef.current
      ) {
        clearInterval(
          cooldownTimerRef.current
        );

        cooldownTimerRef.current =
          null;
      }
    };
  }, [
    rateLimitCooldown > 0,
  ]);

  function getRetryAfter(
    response,
    data
  ) {
    const headerValue =
      response.headers.get(
        "Retry-After"
      );

    const bodyValue =
      data?.retryAfter;

    const value =
      Number(
        headerValue ??
          bodyValue ??
          0
      );

    if (
      !Number.isFinite(value) ||
      value <= 0
    ) {
      return 60;
    }

    return Math.ceil(
      value
    );
  }

  function handleRateLimited(
    response,
    data,
    action
  ) {
    const retryAfter =
      getRetryAfter(
        response,
        data
      );

    setRateLimitCooldown(
      retryAfter
    );

    let message =
      "Too many requests were sent from this connection.";

    if (
      action ===
      "validate"
    ) {
      message =
        `You've made too many invitation verification requests. Please wait ${retryAfter} seconds before trying again.`;
    }

    if (
      action ===
      "redeem"
    ) {
      message =
        `You've made too many invitation redemption requests. Please wait ${retryAfter} seconds before trying again.`;
    }

    showToast({
      title:
        "Slow down",
      message,
      type:
        "warning",
      retryAfter,
      duration:
        8000,
    });

    return message;
  }

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

  const inviteRedeemedRef =
    useRef(false);

  const signupAttemptRef =
    useRef(false);

  // ==========================================================
  // NORMALIZE INVITE DATA
  // ==========================================================

  const normalizeInviteInfo =
    useCallback(
      (invite) => {
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
      },
      [inviteCode]
    );

  // ==========================================================
  // INVITE VALIDATION
  // ==========================================================

  const validateInviteCode =
    useCallback(
      async (code) => {
        if (
          inviteChecking ||
          rateLimitCooldown > 0
        ) {
          return false;
        }

        const cleanedCode =
          String(code || "")
            .trim()
            .toUpperCase();

        if (!cleanedCode) {
          setInviteState(
            "invalid"
          );

          setInviteInfo(
            null
          );

          setInviteError(
            "Please enter your invitation code."
          );

          return false;
        }

        if (
          cleanedCode.length >
          64
        ) {
          setInviteState(
            "invalid"
          );

          setInviteInfo(
            null
          );

          setInviteError(
            "That invitation code is too long."
          );

          return false;
        }

        setInviteChecking(
          true
        );

        setInviteState(
          "checking"
        );

        setInviteError("");

        try {
          const response =
            await fetch(
              `${INVITE_API_URL}/api/admin?action=validate&code=${encodeURIComponent(
                cleanedCode
              )}`,
              {
                method:
                  "GET",

                headers: {
                  Accept:
                    "application/json",
                },

                credentials:
                  "omit",

                cache:
                  "no-store",
              }
            );

          const data =
            await response
              .json()
              .catch(
                () => null
              );

          // ==================================================
          // RATE LIMITED
          // ==================================================

          if (
            response.status ===
            429
          ) {
            const message =
              handleRateLimited(
                response,
                data,
                "validate"
              );

            setInviteState(
              "invalid"
            );

            setInviteInfo(
              null
            );

            setInviteError(
              message
            );

            return false;
          }

          // ==================================================
          // OTHER API ERROR
          // ==================================================

          if (
            !response.ok
          ) {
            console.error(
              "Invite API error:",
              response.status,
              data
            );

            setInviteState(
              "invalid"
            );

            setInviteInfo(
              null
            );

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

          // ==================================================
          // INVALID INVITE
          // ==================================================

          if (
            !data?.valid
          ) {
            setInviteState(
              "invalid"
            );

            setInviteInfo(
              null
            );

            const message =
              data?.message ||
              "This invitation is invalid, expired, revoked, or has no remaining uses.";

            setInviteError(
              message
            );

            return false;
          }

          // ==================================================
          // VALID INVITE
          // ==================================================

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

          showToast({
            title:
              "Invitation verified",
            message:
              "Your invitation is valid. You can now create your Fades Mail mailbox.",
            type:
              "success",
            duration:
              4500,
          });

          return true;
        } catch (error) {
          console.error(
            "Invite validation failed:",
            error
          );

          setInviteState(
            "invalid"
          );

          setInviteInfo(
            null
          );

          const message =
            "Unable to connect to the invitation server. Please try again.";

          setInviteError(
            message
          );

          showToast({
            title:
              "Connection problem",
            message,
            type:
              "error",
            duration:
              6500,
          });

          return false;
        } finally {
          setInviteChecking(
            false
          );
        }
      },
      [
        inviteChecking,
        rateLimitCooldown,
        normalizeInviteInfo,
        showToast,
      ]
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

        if (
          rateLimitCooldown > 0
        ) {
          return {
            success: false,
            rateLimited: true,
            error:
              `Please wait ${rateLimitCooldown} seconds before trying again.`,
          };
        }

        if (
          inviteRedeemedRef.current
        ) {
          return {
            success: true,
            alreadyRedeemed:
              true,
          };
        }

        try {
          const response =
            await fetch(
              `${INVITE_API_URL}/api/admin?action=redeem`,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  Accept:
                    "application/json",
                },

                credentials:
                  "omit",

                cache:
                  "no-store",

                body:
                  JSON.stringify({
                    code:
                      cleanedCode,
                  }),
              }
            );

          const data =
            await response
              .json()
              .catch(
                () => null
              );

          // ==================================================
          // RATE LIMITED
          // ==================================================

          if (
            response.status ===
            429
          ) {
            const message =
              handleRateLimited(
                response,
                data,
                "redeem"
              );

            return {
              success:
                false,
              rateLimited:
                true,
              error:
                message,
            };
          }

          if (
            !response.ok ||
            !data?.success
          ) {
            console.error(
              "Invite redemption failed:",
              response.status,
              data
            );

            const errorMessage =
              data?.error ||
              data?.message ||
              "The invitation could not be redeemed.";

            showToast({
              title:
                "Invitation not redeemed",
              message:
                errorMessage,
              type:
                "error",
              duration:
                7000,
            });

            return {
              success:
                false,
              error:
                errorMessage,
            };
          }

          inviteRedeemedRef.current =
            true;

          const updatedInvite =
            normalizeInviteInfo(
              data.invite
            );

          if (
            updatedInvite
          ) {
            setInviteInfo(
              updatedInvite
            );
          }

          showToast({
            title:
              "Invitation redeemed",
            message:
              "Your invitation has been successfully used for this mailbox.",
            type:
              "success",
            duration:
              5000,
          });

          return {
            success:
              true,

            invite:
              data.invite ||
              null,
          };
        } catch (error) {
          console.error(
            "Invite redemption request failed:",
            error
          );

          const errorMessage =
            "We couldn't connect to the invitation server to complete your invitation.";

          showToast({
            title:
              "Connection problem",
            message:
              errorMessage,
            type:
              "error",
            duration:
              7000,
          });

          return {
            success:
              false,
            error:
              errorMessage,
          };
        }
      },
      [
        rateLimitCooldown,
        normalizeInviteInfo,
        showToast,
      ]
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

      setInviteInfo(
        null
      );

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
      params.get(
        "invite"
      );

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

      setInviteInfo(
        null
      );
    }
  }, [
    isSignIn,
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

    setInviteCode(
      value
    );

    setInviteState(
      "invalid"
    );

    setInviteInfo(
      null
    );

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

    if (
      inviteChecking ||
      rateLimitCooldown > 0
    ) {
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

    setInviteInfo(
      null
    );

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
    if (
      inviteState !==
      "valid"
    ) {
      event.preventDefault();

      setInviteError(
        "Please verify your invitation first."
      );

      showToast({
        title:
          "Invitation required",
        message:
          "Verify your invitation code before creating your mailbox.",
        type:
          "warning",
        duration:
          5000,
      });

      return;
    }

    const cleanedCode =
      String(
        inviteCode || ""
      )
        .trim()
        .toUpperCase();

    if (!cleanedCode) {
      event.preventDefault();

      setInviteError(
        "Your invitation code is missing. Please verify your invitation again."
      );

      return;
    }

    if (
      rateLimitCooldown > 0
    ) {
      event.preventDefault();

      showToast({
        title:
          "Please wait",
        message:
          "The invitation service is temporarily rate-limiting requests.",
        type:
          "warning",
        retryAfter:
          rateLimitCooldown,
        duration:
          7000,
      });

      return;
    }

    auth.inviteCode =
      cleanedCode;

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
      const result =
        await submitAuth(
          event
        );

      if (
        result === false ||
        result?.success ===
          false ||
        result?.ok === false
      ) {
        signupAttemptRef.current =
          false;

        return;
      }

      await new Promise(
        (resolve) =>
          setTimeout(
            resolve,
            50
          )
      );

      if (authError) {
        signupAttemptRef.current =
          false;

        return;
      }

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
      <DoodleBackground />

      {/* ================================================== */}
      {/* TOAST LAYER */}
      {/* ================================================== */}

      <div
        className="fades-toast-layer"
        aria-live="polite"
        aria-atomic="true"
      >
        <Toast
          toast={toast}
          onClose={
            closeToast
          }
        />
      </div>

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
                <label>
                  <span>
                    Email
                  </span>

                  <input
                    type="email"
                    value={email}
                    onChange={(
                      event
                    ) =>
                      setEmail(
                        event.target
                          .value
                      )
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </label>

                <label>
                  <span>
                    Password
                  </span>

                  <input
                    type="password"
                    value={password}
                    onChange={(
                      event
                    ) =>
                      setPassword(
                        event.target
                          .value
                      )
                    }
                    placeholder="Your password"
                    autoComplete="current-password"
                    required
                  />
                </label>

                {authError && (
                  <div className="auth-error">
                    <span>
                      !
                    </span>

                    <span>
                      {authError}
                    </span>
                  </div>
                )}

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
                          64
                        }
                        disabled={
                          inviteChecking ||
                          rateLimitCooldown >
                            0
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

                    {rateLimitCooldown >
                      0 && (
                      <div className="invite-rate-limit-warning">
                        <div className="invite-rate-limit-warning-icon">
                          ⏱
                        </div>

                        <div>
                          <strong>
                            Verification temporarily limited
                          </strong>

                          <span>
                            Try again in{" "}
                            <b>
                              {
                                rateLimitCooldown
                              }{" "}
                              seconds
                            </b>
                            .
                          </span>
                        </div>
                      </div>
                    )}

                    <button
                      className="auth-submit"
                      type="submit"
                      disabled={
                        inviteChecking ||
                        !inviteCode.trim() ||
                        rateLimitCooldown >
                          0
                      }
                    >
                      <span>
                        {inviteChecking
                          ? "Verifying invitation..."
                          : rateLimitCooldown >
                            0
                          ? `Try again in ${rateLimitCooldown}s`
                          : "Verify invitation"}
                      </span>

                      {!inviteChecking &&
                        rateLimitCooldown <=
                          0 && (
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

                  <RateLimitInfo />

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
                              event.target
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
                            event.target
                              .value
                          )
                        }
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                      />
                    </label>

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
                            event.target
                              .value
                          )
                        }
                        placeholder="Your password"
                        autoComplete="new-password"
                        required
                      />
                    </label>

                    {authError && (
                      <div className="auth-error">
                        <span>
                          !
                        </span>

                        <span>
                          {authError}
                        </span>
                      </div>
                    )}

                    <button
                      className="auth-submit"
                      type="submit"
                      disabled={
                        authSubmitting ||
                        signupBlocked ||
                        rateLimitCooldown >
                          0
                      }
                    >
                      <span>
                        {authSubmitting
                          ? "Creating mailbox..."
                          : rateLimitCooldown >
                            0
                          ? `Please wait ${rateLimitCooldown}s`
                          : "Create mailbox"}
                      </span>

                      {!authSubmitting &&
                        rateLimitCooldown <=
                          0 && (
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

      {/* ================================================== */}
      {/* TOAST FALLBACK STYLES */}
      {/* ================================================== */}

      <style jsx>{`
        .fades-toast-layer {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 999999;
          width: min(
            calc(100vw - 40px),
            430px
          );
          pointer-events: none;
        }

        .fades-toast {
          width: 100%;
          min-width: 0;
          box-sizing: border-box;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 15px 16px;
          border-radius: 16px;
          border: 1px solid
            rgba(0, 0, 0, 0.09);
          background: rgba(
            255,
            255,
            255,
            0.98
          );
          color: #171717;
          box-shadow:
            0 18px 45px
              rgba(0, 0, 0, 0.15),
            0 3px 12px
              rgba(0, 0, 0, 0.08);
          backdrop-filter: blur(
            18px
          );
          -webkit-backdrop-filter: blur(
            18px
          );
          animation:
            fadesToastIn
            0.22s ease-out;
          pointer-events: auto;
          overflow: hidden;
        }

        .fades-toast-icon {
          flex: 0 0 30px;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #f1f1f1;
          font-weight: 800;
          font-size: 16px;
        }

        .fades-toast-success
          .fades-toast-icon {
          background: #e9f8ef;
          color: #18864b;
        }

        .fades-toast-warning
          .fades-toast-icon {
          background: #fff5dc;
          color: #a96c00;
        }

        .fades-toast-error
          .fades-toast-icon {
          background: #ffeded;
          color: #c93636;
        }

        .fades-toast-content {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
          line-height: 1.4;
        }

        .fades-toast-content strong {
          font-size: 14px;
          line-height: 1.25;
        }

        .fades-toast-content span {
          font-size: 13px;
          line-height: 1.45;
          overflow-wrap: anywhere;
          word-break: break-word;
        }

        .fades-toast-content small {
          margin-top: 3px;
          font-size: 12px;
          opacity: 0.65;
        }

        .fades-toast-close {
          flex: 0 0 auto;
          width: 28px;
          height: 28px;
          border: 0;
          background: transparent;
          color: inherit;
          opacity: 0.5;
          border-radius: 8px;
          cursor: pointer;
          font-size: 21px;
          line-height: 1;
        }

        .fades-toast-close:hover {
          opacity: 1;
          background: rgba(
            0,
            0,
            0,
            0.05
          );
        }

        .invite-rate-limit {
          width: 100%;
          box-sizing: border-box;
          margin-top: 18px;
          padding: 14px;
          border-radius: 14px;
          background: rgba(
            0,
            0,
            0,
            0.025
          );
          border: 1px solid
            rgba(0, 0, 0, 0.07);
        }

        .invite-rate-limit-header {
          display: flex;
          gap: 10px;
          align-items: flex-start;
        }

        .invite-rate-limit-shield {
          width: 28px;
          height: 28px;
          flex: 0 0 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: #f1f1f1;
          font-size: 14px;
          font-weight: 800;
        }

        .invite-rate-limit-header
          strong {
          display: block;
          font-size: 12px;
          line-height: 1.3;
        }

        .invite-rate-limit-header
          span {
          display: block;
          margin-top: 2px;
          font-size: 11px;
          line-height: 1.4;
          opacity: 0.6;
        }

        .invite-rate-limit-list {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .invite-rate-limit-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          font-size: 11px;
        }

        .invite-rate-limit-row span {
          opacity: 0.6;
        }

        .invite-rate-limit-row strong {
          font-weight: 650;
          white-space: nowrap;
        }

        .invite-rate-limit-warning {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-top: 10px;
          padding: 12px;
          border-radius: 12px;
          background: #fff8e7;
          border: 1px solid
            #f0dca8;
          color: #765100;
        }

        .invite-rate-limit-warning-icon {
          flex: 0 0 24px;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          background: #f7e8bd;
          font-size: 12px;
        }

        .invite-rate-limit-warning
          strong {
          display: block;
          font-size: 12px;
          line-height: 1.3;
        }

        .invite-rate-limit-warning
          span {
          display: block;
          margin-top: 2px;
          font-size: 11px;
          line-height: 1.45;
        }

        @keyframes fadesToastIn {
          from {
            opacity: 0;
            transform: translateY(
              -10px
            ) scale(0.98);
          }

          to {
            opacity: 1;
            transform: translateY(
              0
            ) scale(1);
          }
        }

        @media (max-width: 600px) {
          .fades-toast-layer {
            top: 12px;
            right: 12px;
            width: calc(
              100vw - 24px
            );
          }

          .fades-toast {
            padding: 14px;
            border-radius: 14px;
          }
        }
      `}</style>
    </main>
  );
}
