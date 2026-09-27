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

/*
 * ============================================================
 * CLIENT-SIDE ABUSE PROTECTION
 * ============================================================
 *
 * These do NOT replace the API's server-side rate limits.
 *
 * They simply stop accidental/repeated requests from this
 * browser before they ever reach the API.
 */

const VALIDATE_CLIENT_COOLDOWN_MS = 2000;
const REDEEM_CLIENT_COOLDOWN_MS = 3000;

/*
 * If the API returns a 429 with Retry-After, that value is
 * always authoritative over these client-side values.
 */

const DEFAULT_RATE_LIMIT_SECONDS = 60;

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
// RATE LIMIT HELPERS
// ============================================================

function getRetryAfterSeconds(
  response,
  data
) {
  /*
   * Retry-After is the preferred HTTP mechanism.
   *
   * It can be:
   *   - a number of seconds
   *   - an HTTP date
   */

  const retryAfterHeader =
    response.headers.get(
      "Retry-After"
    );

  if (retryAfterHeader) {
    const numeric =
      Number(
        retryAfterHeader
      );

    if (
      Number.isFinite(
        numeric
      ) &&
      numeric >= 0
    ) {
      return Math.ceil(
        numeric
      );
    }

    const retryDate =
      Date.parse(
        retryAfterHeader
      );

    if (
      Number.isFinite(
        retryDate
      )
    ) {
      return Math.max(
        0,
        Math.ceil(
          (retryDate -
            Date.now()) /
            1000
        )
      );
    }
  }

  /*
   * Also support JSON returned by the API.
   */

  const jsonRetry =
    Number(
      data?.retryAfter ??
        data?.retry_after ??
        data?.retryAfterSeconds ??
        data?.retry_after_seconds
    );

  if (
    Number.isFinite(
      jsonRetry
    ) &&
    jsonRetry >= 0
  ) {
    return Math.ceil(
      jsonRetry
    );
  }

  /*
   * Some APIs expose RateLimit-Reset.
   */

  const resetHeader =
    response.headers.get(
      "RateLimit-Reset"
    );

  if (resetHeader) {
    const resetValue =
      Number(
        resetHeader
      );

    if (
      Number.isFinite(
        resetValue
      )
    ) {
      /*
       * Most implementations expose Unix seconds.
       */

      if (
        resetValue >
        1000000000
      ) {
        return Math.max(
          0,
          Math.ceil(
            resetValue -
              Date.now() /
                1000
          )
        );
      }

      /*
       * Otherwise treat it as a relative number
       * of seconds.
       */

      if (
        resetValue >= 0
      ) {
        return Math.ceil(
          resetValue
        );
      }
    }
  }

  return DEFAULT_RATE_LIMIT_SECONDS;
}

function formatRetryTime(
  seconds
) {
  const value = Math.max(
    0,
    Math.ceil(
      Number(seconds) || 0
    )
  );

  if (value < 60) {
    return `${value} second${
      value === 1
        ? ""
        : "s"
    }`;
  }

  const minutes =
    Math.ceil(
      value / 60
    );

  return `${minutes} minute${
    minutes === 1
      ? ""
      : "s"
  }`;
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
  // RATE LIMIT STATE
  // ==========================================================

  const [
    rateLimitUntil,
    setRateLimitUntil,
  ] = useState(0);

  const [
    rateLimitAction,
    setRateLimitAction,
  ] = useState("");

  const [
    rateLimitSeconds,
    setRateLimitSeconds,
  ] = useState(0);

  /*
   * These refs provide an additional local request lock.
   */

  const lastValidateRequestRef =
    useRef(0);

  const lastRedeemRequestRef =
    useRef(0);

  const validateRequestRef =
    useRef(false);

  const redeemRequestRef =
    useRef(false);

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
      (
        message,
        type = "error",
        duration = 6500
      ) => {
        if (
          toastTimerRef.current
        ) {
          clearTimeout(
            toastTimerRef.current
          );
        }

        setToast({
          id: Date.now(),
          message:
            String(
              message || ""
            ),
          type,
        });

        toastTimerRef.current =
          setTimeout(() => {
            setToast(null);
          }, duration);
      },
      []
    );

  const dismissToast =
    useCallback(() => {
      if (
        toastTimerRef.current
      ) {
        clearTimeout(
          toastTimerRef.current
        );

        toastTimerRef.current =
          null;
      }

      setToast(null);
    }, []);

  // ==========================================================
  // TOAST CLEANUP
  // ==========================================================

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
  // RATE LIMIT COUNTDOWN
  // ==========================================================

  useEffect(() => {
    if (
      !rateLimitUntil
    ) {
      setRateLimitSeconds(
        0
      );

      return;
    }

    function updateCountdown() {
      const remaining =
        Math.max(
          0,
          Math.ceil(
            (rateLimitUntil -
              Date.now()) /
              1000
          )
        );

      setRateLimitSeconds(
        remaining
      );

      if (
        remaining <= 0
      ) {
        setRateLimitUntil(
          0
        );

        setRateLimitAction(
          ""
        );
      }
    }

    updateCountdown();

    const timer =
      setInterval(
        updateCountdown,
        1000
      );

    return () =>
      clearInterval(
        timer
      );
  }, [
    rateLimitUntil,
  ]);

  // ==========================================================
  // APPLY SERVER RATE LIMIT
  // ==========================================================

  const applyRateLimit =
    useCallback(
      (
        response,
        data,
        action
      ) => {
        const seconds =
          getRetryAfterSeconds(
            response,
            data
          );

        const safeSeconds =
          Math.max(
            1,
            seconds
          );

        const until =
          Date.now() +
          safeSeconds *
            1000;

        setRateLimitUntil(
          until
        );

        setRateLimitAction(
          action
        );

        setRateLimitSeconds(
          safeSeconds
        );

        const actionText =
          action ===
          "redeem"
            ? "invitation redemption"
            : "invitation verification";

        const serverMessage =
          data?.error ||
          data?.message;

        const message =
          serverMessage
            ? `${serverMessage} Please wait ${formatRetryTime(
                safeSeconds
              )} before trying again.`
            : `Too many ${actionText} requests. Please wait ${formatRetryTime(
                safeSeconds
              )} before trying again.`;

        showToast(
          message,
          "rate-limit",
          Math.max(
            6500,
            safeSeconds *
              1000
          )
        );

        setInviteError(
          message
        );

        return safeSeconds;
      },
      [showToast]
    );

  // ==========================================================
  // INVITE REDEMPTION STATE
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

  const normalizeInviteInfo =
    useCallback(
      (
        invite,
        fallbackCode = ""
      ) => {
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
            fallbackCode,

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
      []
    );

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

        /*
         * Server rate-limit cooldown.
         */

        if (
          rateLimitUntil &&
          Date.now() <
            rateLimitUntil
        ) {
          const remaining =
            Math.max(
              1,
              Math.ceil(
                (rateLimitUntil -
                  Date.now()) /
                  1000
              )
            );

          const message = `Too many requests. Please wait ${formatRetryTime(
            remaining
          )} before verifying another invitation.`;

          setInviteError(
            message
          );

          showToast(
            message,
            "rate-limit"
          );

          return false;
        }

        /*
         * Local request lock.
         */

        if (
          validateRequestRef.current
        ) {
          return false;
        }

        /*
         * Small browser-side cooldown between verification
         * requests. This is deliberately much shorter than
         * the server rate limit.
         */

        const now =
          Date.now();

        if (
          now -
            lastValidateRequestRef.current <
          VALIDATE_CLIENT_COOLDOWN_MS
        ) {
          const remaining =
            Math.ceil(
              (
                VALIDATE_CLIENT_COOLDOWN_MS -
                (now -
                  lastValidateRequestRef.current)
              ) / 1000
            );

          const message =
            "Please wait a moment before verifying the invitation again.";

          setInviteError(
            message
          );

          showToast(
            message,
            "warning",
            3000
          );

          return false;
        }

        lastValidateRequestRef.current =
          now;

        validateRequestRef.current =
          true;

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
                method: "GET",
                headers: {
                  Accept:
                    "application/json",
                  "Cache-Control":
                    "no-cache",
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

          /*
           * ==================================================
           * RATE LIMITED
           * ==================================================
           */

          if (
            response.status ===
            429
          ) {
            applyRateLimit(
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

            return false;
          }

          if (!response.ok) {
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

          if (
            !data?.valid
          ) {
            setInviteState(
              "invalid"
            );

            setInviteInfo(
              null
            );

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
              data.invite,
              cleanedCode
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

          showToast(
            "Invitation verified successfully.",
            "success",
            3500
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

          setInviteInfo(
            null
          );

          setInviteError(
            "Unable to connect to the invitation server. Please try again."
          );

          return false;
        } finally {
          validateRequestRef.current =
            false;

          setInviteChecking(
            false
          );
        }
      },
      [
        rateLimitUntil,
        applyRateLimit,
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

        /*
         * Prevent duplicate redemption requests.
         */

        if (
          redeemRequestRef.current
        ) {
          return {
            success: false,
            error:
              "The invitation redemption request is already being processed.",
          };
        }

        /*
         * Client-side cooldown.
         */

        const now =
          Date.now();

        if (
          now -
            lastRedeemRequestRef.current <
          REDEEM_CLIENT_COOLDOWN_MS
        ) {
          const message =
            "Please wait a moment before trying to redeem the invitation again.";

          showToast(
            message,
            "warning",
            3000
          );

          return {
            success: false,
            error: message,
          };
        }

        lastRedeemRequestRef.current =
          now;

        redeemRequestRef.current =
          true;

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

          /*
           * ==================================================
           * RATE LIMITED
           * ==================================================
           */

          if (
            response.status ===
            429
          ) {
            const seconds =
              applyRateLimit(
                response,
                data,
                "redeem"
              );

            return {
              success: false,
              rateLimited: true,
              retryAfter:
                seconds,
              error:
                data?.error ||
                data?.message ||
                `Too many redemption requests. Please wait ${formatRetryTime(
                  seconds
                )}.`,
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
              data.invite,
              cleanedCode
            );

          if (
            updatedInvite
          ) {
            setInviteInfo(
              updatedInvite
            );
          }

          showToast(
            "Invitation redeemed successfully.",
            "success",
            3500
          );

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
        } finally {
          redeemRequestRef.current =
            false;
        }
      },
      [
        applyRateLimit,
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

    if (
      inviteChecking
    ) {
      return;
    }

    if (
      rateLimitUntil &&
      Date.now() <
        rateLimitUntil
    ) {
      const remaining =
        Math.max(
          1,
          Math.ceil(
            (rateLimitUntil -
              Date.now()) /
              1000
          )
        );

      const message = `Too many requests. Please wait ${formatRetryTime(
        remaining
      )}.`;

      setInviteError(
        message
      );

      showToast(
        message,
        "rate-limit"
      );

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

      showToast(
        "Please verify your invitation first.",
        "warning",
        3500
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

      showToast(
        "Your invitation code is missing. Please verify it again.",
        "warning",
        4000
      );

      return;
    }

    /*
     * Keep the invite code available to the existing
     * authentication implementation.
     */

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
      /*
       * submitAuth should return after the account creation
       * request has completed.
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
         * If the API rate-limited redemption, make the
         * problem extremely obvious to the user.
         */

        if (
          redemption.rateLimited
        ) {
          return;
        }

        showToast(
          redemption.error ||
            "Your account was created, but the invitation could not be redeemed. Please contact Fades Mail support.",
          "error",
          8000
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
    <>
      {/* ====================================================== */}
      {/* GLOBAL RATE-LIMIT TOAST */}
      {/* ====================================================== */}

      {toast && (
        <div
          className={`fades-auth-toast fades-auth-toast-${toast.type}`}
          role="alert"
          aria-live="assertive"
          style={{
            position:
              "fixed",
            top:
              "20px",
            right:
              "20px",
            zIndex:
              999999,
            width:
              "min(440px, calc(100vw - 32px))",
            maxWidth:
              "calc(100vw - 32px)",
            pointerEvents:
              "auto",
          }}
        >
          <div
            className="fades-auth-toast-inner"
            style={{
              display:
                "flex",
              alignItems:
                "flex-start",
              gap:
                "12px",
              width:
                "100%",
              boxSizing:
                "border-box",
              padding:
                "14px 15px",
              borderRadius:
                "14px",
              background:
                "rgba(20, 20, 20, 0.97)",
              color:
                "#fff",
              border:
                "1px solid rgba(255,255,255,0.12)",
              boxShadow:
                "0 18px 50px rgba(0,0,0,0.25)",
              backdropFilter:
                "blur(18px)",
              WebkitBackdropFilter:
                "blur(18px)",
            }}
          >
            <div
              style={{
                flex:
                  "0 0 auto",
                width:
                  "28px",
                height:
                  "28px",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                borderRadius:
                  "9px",
                background:
                  toast.type ===
                  "success"
                    ? "rgba(80, 200, 120, 0.16)"
                    : toast.type ===
                      "warning"
                    ? "rgba(255, 190, 70, 0.16)"
                    : toast.type ===
                      "rate-limit"
                    ? "rgba(255, 170, 60, 0.16)"
                    : "rgba(255, 80, 80, 0.16)",
                color:
                  toast.type ===
                  "success"
                    ? "#65d68a"
                    : toast.type ===
                      "warning"
                    ? "#ffca63"
                    : toast.type ===
                      "rate-limit"
                    ? "#ffb84d"
                    : "#ff7777",
                fontWeight:
                  800,
                fontSize:
                  "14px",
              }}
            >
              {toast.type ===
              "success"
                ? "✓"
                : toast.type ===
                  "rate-limit"
                ? "⏱"
                : "!"}
            </div>

            <div
              style={{
                flex:
                  "1 1 auto",
                minWidth:
                  0,
                paddingTop:
                  "2px",
              }}
            >
              <div
                style={{
                  fontSize:
                    "13px",
                  fontWeight:
                    700,
                  lineHeight:
                    1.35,
                  marginBottom:
                    "3px",
                }}
              >
                {toast.type ===
                "rate-limit"
                  ? "Too many requests"
                  : toast.type ===
                    "success"
                  ? "Success"
                  : "Fades Mail"}
              </div>

              <div
                style={{
                  fontSize:
                    "13px",
                  lineHeight:
                    1.5,
                  color:
                    "rgba(255,255,255,0.78)",
                  overflowWrap:
                    "anywhere",
                  wordBreak:
                    "break-word",
                  whiteSpace:
                    "normal",
                }}
              >
                {
                  toast.message
                }
              </div>
            </div>

            <button
              type="button"
              onClick={
                dismissToast
              }
              aria-label="Dismiss notification"
              style={{
                flex:
                  "0 0 auto",
                width:
                  "28px",
                height:
                  "28px",
                border:
                  0,
                padding:
                  0,
                margin:
                  0,
                borderRadius:
                  "8px",
                background:
                  "rgba(255,255,255,0.07)",
                color:
                  "rgba(255,255,255,0.65)",
                cursor:
                  "pointer",
                fontSize:
                  "17px",
                lineHeight:
                  1,
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

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
                            inviteChecking ||
                            Boolean(
                              rateLimitUntil &&
                                Date.now() <
                                  rateLimitUntil
                            )
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

                      {/* RATE LIMIT STATUS */}

                      {rateLimitSeconds >
                        0 && (
                        <div
                          className="invite-rate-limit-card"
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "flex-start",
                            gap:
                              "10px",
                            marginTop:
                              "10px",
                            padding:
                              "11px 12px",
                            borderRadius:
                              "12px",
                            background:
                              "rgba(255, 170, 60, 0.08)",
                            border:
                              "1px solid rgba(255, 170, 60, 0.18)",
                            color:
                              "inherit",
                          }}
                        >
                          <span
                            style={{
                              fontSize:
                                "16px",
                              lineHeight:
                                1.2,
                              flex:
                                "0 0 auto",
                            }}
                          >
                            ⏱
                          </span>

                          <div
                            style={{
                              minWidth:
                                0,
                            }}
                          >
                            <strong
                              style={{
                                display:
                                  "block",
                                fontSize:
                                  "12px",
                                marginBottom:
                                  "2px",
                              }}
                            >
                              Verification temporarily limited
                            </strong>

                            <span
                              style={{
                                display:
                                  "block",
                                fontSize:
                                  "12px",
                                lineHeight:
                                  1.45,
                                opacity:
                                  0.72,
                              }}
                            >
                              Too many requests were detected. Try again in{" "}
                              <strong>
                                {
                                  formatRetryTime(
                                    rateLimitSeconds
                                  )
                                }
                              </strong>
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
                          Boolean(
                            rateLimitUntil &&
                              Date.now() <
                                rateLimitUntil
                          )
                        }
                      >
                        <span>
                          {inviteChecking
                            ? "Verifying invitation..."
                            : rateLimitSeconds >
                              0
                            ? `Try again in ${formatRetryTime(
                                rateLimitSeconds
                              )}`
                            : "Verify invitation"}
                        </span>

                        {!inviteChecking &&
                          rateLimitSeconds <=
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
    </>
  );
}
