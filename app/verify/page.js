"use client";

import {
  useEffect,
  useState
} from "react";

import "./verify.css";

const API_URL =
  process.env.NEXT_PUBLIC_MAIL_API_URL ||
  "https://mail-api.fades.lol";

const STORAGE_KEY =
  "fades_mail_verification_user";

export default function VerifyPage() {
  const [user, setUser] =
    useState(null);

  const [code, setCode] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [resending, setResending] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [cooldown, setCooldown] =
    useState(0);

  useEffect(() => {
    try {
      const stored =
        sessionStorage.getItem(
          STORAGE_KEY
        );

      if (!stored) {
        window.location.href = "/";
        return;
      }

      const parsed =
        JSON.parse(stored);

      if (!parsed?.id) {
        window.location.href = "/";
        return;
      }

      setUser(parsed);
    } catch {
      sessionStorage.removeItem(
        STORAGE_KEY
      );

      window.location.href = "/";
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer =
      setInterval(() => {
        setCooldown((current) =>
          current > 0
            ? current - 1
            : 0
        );
      }, 1000);

    return () =>
      clearInterval(timer);
  }, [cooldown]);

  function handleCodeChange(event) {
    const value =
      event.target.value
        .replace(/\D/g, "")
        .slice(0, 6);

    setCode(value);
    setError("");
    setSuccess("");
  }

  async function verifyCode(event) {
    event.preventDefault();

    if (!user?.id) {
      setError(
        "Your verification session is missing. Please sign up again."
      );
      return;
    }

    if (code.length !== 6) {
      setError(
        "Enter the 6-digit verification code."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          `${API_URL}/auth/verify`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            credentials: "include",

            body: JSON.stringify({
              userId: user.id,
              code
            })
          }
        );

      let payload = null;

      const text =
        await response.text();

      if (text) {
        try {
          payload =
            JSON.parse(text);
        } catch {
          payload = null;
        }
      }

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            "Verification failed. Please try again."
        );
      }

      setSuccess(
        "Your email has been verified. Signing you in..."
      );

      sessionStorage.removeItem(
        STORAGE_KEY
      );

      setTimeout(() => {
        window.location.href = "/";
      }, 700);
    } catch (err) {
      setError(
        err?.message ||
          "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function resendCode() {
    if (
      !user?.id ||
      cooldown > 0 ||
      resending
    ) {
      return;
    }

    setResending(true);
    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          `${API_URL}/auth/verify/resend`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            credentials: "include",

            body: JSON.stringify({
              userId: user.id
            })
          }
        );

      let payload = null;

      const text =
        await response.text();

      if (text) {
        try {
          payload =
            JSON.parse(text);
        } catch {
          payload = null;
        }
      }

      if (!response.ok) {
        throw new Error(
          payload?.message ||
            "Could not resend the verification code."
        );
      }

      setCode("");

      setSuccess(
        "A new verification code has been sent."
      );

      setCooldown(60);
    } catch (err) {
      setError(
        err?.message ||
          "Could not resend the verification code."
      );
    } finally {
      setResending(false);
    }
  }

  function goBack() {
    sessionStorage.removeItem(
      STORAGE_KEY
    );

    window.location.href = "/";
  }

  if (!user) {
    return null;
  }

  return (
    <main className="verify-page">
      <div className="verify-shell">
        <section className="verify-card">
          <div className="verify-brand">
            <img
              className="verify-logo"
              src="/logo.png"
              alt="Fades"
            />
          </div>

          <h1 className="verify-title">
            Verify your email
          </h1>

          <p className="verify-subtitle">
            We sent a 6-digit verification
            code to
          </p>

          <div className="verify-email">
            {user.email}
          </div>

          <form
            className="verify-form"
            onSubmit={verifyCode}
          >
            <input
              className="verify-code-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={
                handleCodeChange
              }
              placeholder="000000"
              aria-label="Verification code"
              disabled={loading}
              autoFocus
            />

            {error && (
              <div
                className="verify-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {success && (
              <div
                className="verify-success"
                role="status"
              >
                {success}
              </div>
            )}

            <button
              className="verify-button"
              type="submit"
              disabled={
                loading ||
                code.length !== 6
              }
            >
              {loading
                ? "Verifying..."
                : "Verify email"}
            </button>
          </form>

          <div className="verify-resend">
            Didn't receive the code?{" "}

            <button
              type="button"
              onClick={resendCode}
              disabled={
                cooldown > 0 ||
                resending
              }
            >
              {resending
                ? "Sending..."
                : cooldown > 0
                ? `Resend in ${cooldown}s`
                : "Resend code"}
            </button>
          </div>

          <div className="verify-expiry">
            Your verification code expires
            after 10 minutes.
          </div>

          <button
            className="verify-back"
            type="button"
            onClick={goBack}
          >
            Back to Fades Mail
          </button>
        </section>
      </div>
    </main>
  );
}
