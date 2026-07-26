import { useState } from "react";
import { authClient } from "./lib/auth-client";

type View = "login" | "signup";

export default function App() {
  const { data: session, isPending } = authClient.useSession();

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

  if (isPending) return <div className="flex items-center justify-center min-h-screen bg-gray-100">Loading…</div>;

  if (session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-[380px]">
          <h2 className="text-xl font-bold mb-4">✅ Logged in</h2>
          <p className="mb-2"><b>Name:</b> {session.user.name}</p>
          <p className="mb-2"><b>Email:</b> {session.user.email}</p>
          <p className="mb-2"><b>ID:</b> {session.user.id}</p>
          <button className="px-3 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-[380px]">
        <h2 className="text-xl font-bold mb-4">{view === "login" ? "Sign in" : "Sign up"}</h2>
        {error && <p className="mb-2 text-red-600 text-sm">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {view === "signup" && (
            <input
              className="px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          )}
          <input
            className="px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <input
            className="px-3 py-2 rounded border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button className="px-3 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700" type="submit" disabled={loading}>
            {loading ? "…" : view === "login" ? "Sign in" : "Sign up"}
          </button>
        </form>
        <p className="mt-4 text-sm text-center text-gray-600">
          {view === "login" ? "No account? " : "Have an account? "}
          <span
            className="text-blue-600 font-semibold underline cursor-pointer"
            onClick={() => { setView(view === "login" ? "signup" : "login"); setError(""); }}
          >
            {view === "login" ? "Sign up" : "Sign in"}
          </span>
        </p>
      </div>
    </div>
  );
}