import { useState } from "react";
import { authClient } from "./lib/auth-client";

type View = "login" | "signup";

export default function App() {
  const { useSession } = authClient;
  const { data: session, isPending } = useSession();

  const [view, setView] = useState<View>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (view === "signup") {
        const res = await authClient.signUp.email({ name, email, password });
        if (res.error) setError(res.error.message ?? "Sign up failed");
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) setError(res.error.message ?? "Sign in failed");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await authClient.signOut();
  }

  if (isPending) return <div style={styles.center}>Loading…</div>;

  if (session) {
    return (
      <div style={styles.center}>
        <div style={styles.card}>
          <h2 style={styles.title}>✅ Logged in</h2>
          <p style={styles.info}><b>Name:</b> {session.user.name}</p>
          <p style={styles.info}><b>Email:</b> {session.user.email}</p>
          <p style={styles.info}><b>ID:</b> {session.user.id}</p>
          <button style={styles.btn} onClick={handleLogout}>Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.center}>
      <div style={styles.card}>
        <h2 style={styles.title}>{view === "login" ? "Sign in" : "Sign up"}</h2>
        {error && <p style={styles.error}>{error}</p>}
        <form onSubmit={handleSubmit} style={styles.form}>
          {view === "signup" && (
            <input
              style={styles.input}
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          )}
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? "…" : view === "login" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <p style={styles.toggle}>
          {view === "login" ? "No account? " : "Have an account? "}
          <span
            style={styles.link}
            onClick={() => { setView(view === "login" ? "signup" : "login"); setError(""); }}
          >
            {view === "login" ? "Sign up" : "Sign in"}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  center: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f0f2f5" },
  card: { background: "#fff", padding: "2rem", borderRadius: "12px", boxShadow: "0 4px 24px rgba(0,0,0,0.1)", width: "100%", maxWidth: "380px" },
  title: { margin: "0 0 1.2rem", fontSize: "1.4rem", fontWeight: 700 },
  form: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  input: { padding: "0.65rem 0.9rem", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "0.95rem", outline: "none" },
  btn: { padding: "0.7rem", borderRadius: "8px", background: "#2563eb", color: "#fff", border: "none", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer" },
  error: { color: "#dc2626", fontSize: "0.875rem", margin: "0 0 0.5rem" },
  info: { margin: "0.3rem 0", fontSize: "0.9rem", color: "#374151" },
  toggle: { marginTop: "1rem", fontSize: "0.875rem", textAlign: "center", color: "#6b7280" },
  link: { color: "#2563eb", cursor: "pointer", fontWeight: 600 },
};