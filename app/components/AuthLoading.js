import Logo from "./Logo";

export default function AuthLoading() {
  return (
    <main className="auth-page">
      <div className="auth-loading-card">
        <Logo size={46} />

        <div className="spinner" />

        <p>Connecting to Fades Mail</p>

        <span>Securing your mailbox...</span>
      </div>
    </main>
  );
}
