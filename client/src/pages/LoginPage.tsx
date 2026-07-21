import { useState, useEffect } from "react";
import { authClient } from "../lib/auth-client";
import { useNavigate, useLocation } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: session, isPending } = authClient.useSession();

  const [view, setView] = useState(location.pathname === "/signup" ? "signup" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setView(location.pathname === "/signup" ? "signup" : "login");
  }, [location.pathname]);

  useEffect(() => {
    if (!isPending && session) navigate("/");
  }, [session, isPending, navigate]);

  if (isPending) return <div style={{ textAlign: "center", padding: "2rem" }}>Loading…</div>;
  if (session) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (view === "signup") {
        const res = await authClient.signUp.email({ name, email, password });
        if (res.error) setError(res.error.message ?? "Sign up failed");
        else navigate("/");
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) setError(res.error.message ?? "Sign in failed");
        else navigate("/");
      }
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: "0.65rem 0.9rem",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "0.95rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f0f2f5" }}>
      <div style={{ background: "#fff", padding: "2rem", borderRadius: "12px", boxShadow: "0 4px 24px rgba(0,0,0,0.1)", width: "100%", maxWidth: "380px" }}>
        <h2 style={{ margin: "0 0 1.2rem", fontSize: "1.4rem", fontWeight: 700 }}>
          {view === "login" ? "Sign in" : "Sign up"}
        </h2>
        {error && <p style={{ color: "#dc2626", fontSize: "0.875rem", margin: "0 0 0.5rem" }}>{error}</p>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {view === "signup" && (
            <input style={inputStyle} placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
          )}
          <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          <button
            style={{ padding: "0.7rem", borderRadius: "8px", background: "#2563eb", color: "#fff", border: "none", fontWeight: 600, fontSize: "0.95rem", cursor: "pointer" }}
            type="submit"
            disabled={loading}
          >
            {loading ? "…" : view === "login" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <p style={{ marginTop: "1rem", fontSize: "0.875rem", textAlign: "center", color: "#6b7280" }}>
          {view === "login" ? "No account? " : "Have an account? "}
          <span
            style={{ color: "#2563eb", cursor: "pointer", fontWeight: 600 }}
            onClick={() => { setView(view === "login" ? "signup" : "login"); setError(""); }}
          >
            {view === "login" ? "Sign up" : "Sign in"}
          </span>
        </p>
      </div>
    </div>
  );
}
