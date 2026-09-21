import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

function extractUser(data) {
  return data?.user || data?.account || data;
}

/**
 * Session + sign in / sign up form state.
 * `expireSession` is what other hooks call when the API answers 401.
 */
export function useAuth() {
  const [authLoading, setAuthLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  const [authMode, setAuthMode] = useState("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const expireSession = useCallback(() => {
    setAuthenticated(false);
    setUser(null);
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      setAuthLoading(true);

      const response = await apiFetch("/auth/me");

      if (!response.ok) {
        expireSession();
        return;
      }

      const authenticatedUser = extractUser(await response.json());

      if (!authenticatedUser || authenticatedUser.error) {
        expireSession();
        return;
      }

      setUser(authenticatedUser);
      setAuthenticated(true);
    } catch (error) {
      console.error("[Fades Mail] Auth check failed:", error);
      expireSession();
    } finally {
      setAuthLoading(false);
    }
  }, [expireSession]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  async function submitAuth(event) {
    event.preventDefault();

    setAuthError("");
    setAuthSubmitting(true);

    try {
      const isSignIn = authMode === "signin";

      const body = isSignIn
        ? {
            email: email.trim().toLowerCase(),
            password,
          }
        : {
            username: username.trim().toLowerCase(),
            email: email.trim().toLowerCase(),
            password,
          };

      const response = await apiFetch(isSignIn ? "/auth/login" : "/auth/signup", {
        method: "POST",
        json: body,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Authentication failed.");
      }

      const authenticatedUser = extractUser(data);

      if (authMode === "signup" && data?.status === "verification_required") {
        sessionStorage.setItem(
          "fades_mail_verification_user",
          JSON.stringify(authenticatedUser)
        );

        setPassword("");
        setAuthError("");

        window.location.href = "/verify";
        return;
      }

      setUser(authenticatedUser);
      setAuthenticated(true);
      setPassword("");
      setAuthError("");
    } catch (error) {
      setAuthError(error.message || "Unable to authenticate.");
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function logout() {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("[Fades Mail] Logout failed:", error);
    }

    expireSession();
  }

  function toggleAuthMode() {
    setAuthError("");
    setAuthMode(authMode === "signin" ? "signup" : "signin");
  }

  return {
    authLoading,
    authenticated,
    user,
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
    logout,
    expireSession,
  };
}
