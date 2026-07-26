import { useState } from "react";
import { authClient } from "./lib/auth-client";
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import UserPage from './pages/UserPage';
import type { AuthUser } from './types/user';

// Private route component to protect routes (requires authentication)
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return <div>Loading...</div>;
  return session ? (
    <>
      <Navbar />
      <div>{children}</div>
    </>
  ) : <Navigate to="/login" replace />;
}

// Admin route component to protect routes (requires admin role)
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return <div>Loading...</div>;
  // If not authenticated, redirect to login
  if (!session) return <Navigate to="/login" replace />;
  const user = session.user as AuthUser;
  // If not admin, redirect to home
  if (user.role !== "ADMIN") return <Navigate to="/" replace />;
  return (
    <>
      <Navbar />
      <div>{children}</div>
    </>
  );
}

export default function App() {
  const { data: session, isPending } = authClient.useSession();

  const [view, setView] = useState<"login" | "signup">("login");
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

  if (isPending) return <div className="flex items-center justify-center min-h-screen bg-gray-100">Loading…</div>;

  if (session) {
    return (
      <>
        <Routes>
          <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
          <Route path="/user" element={<AdminRoute><UserPage /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </>
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