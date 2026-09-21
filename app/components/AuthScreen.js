import Logo from "./Logo";

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

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-brand">
          <Logo size={40} />

          <div>
            <strong>Fades Mail</strong>

            <span>Private email, beautifully simple.</span>
          </div>
        </div>

        <div className="auth-card">
          <div className="auth-heading">
            <h1>{isSignIn ? "Welcome back." : "Create your mailbox."}</h1>

            <p>
              {isSignIn
                ? "Sign in to continue to your Fades Mail account."
                : "Create your own Fades Mail address and start sending."}
            </p>
          </div>

          <form className="auth-form" onSubmit={submitAuth}>
            {authMode === "signup" && (
              <label>
                <span>Username</span>

                <div className="input-shell">
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
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
            )}

            <label>
              <span>Email</span>

              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Your password"
                autoComplete={isSignIn ? "current-password" : "new-password"}
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
                  : isSignIn
                  ? "Sign in"
                  : "Create mailbox"}
              </span>

              {!authSubmitting && <span className="submit-arrow">→</span>}
            </button>
          </form>

          <div className="auth-switch">
            <span>
              {isSignIn ? "Don't have an account?" : "Already have an account?"}
            </span>

            <button type="button" onClick={toggleAuthMode}>
              {isSignIn ? "Create one" : "Sign in"}
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
