import { useState, useEffect } from "react";
import { authClient } from "../lib/auth-client";
import { useNavigate, useLocation } from "react-router-dom";

export default function LoginPage() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState(location.pathname === "/signup" ? "signup" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setView(location.pathname === "/signup" ? "signup" : "login");
    setError("");
  }, [location.pathname]);

  useEffect(() => {
    if (!isPending && session) navigate("/");
  }, [session, isPending, navigate]);

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
    } catch (err: any) {
      setError(err?.message?.includes('fetch') ? "Cannot connect to server. Make sure the backend is running." : (err?.message ?? "Something went wrong"));
    } finally {
      setLoading(false);
    }
  }

  if (isPending) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (session) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-600 mb-4 shadow-lg shadow-violet-200">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Help Desk</h1>
          <p className="text-sm text-slate-500 mt-1">
            {view === "login" ? "Sign in to your account" : "Create your account"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">
            {view === "login" ? "Welcome back" : "Get started"}
          </h2>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
            {view === "signup" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <input
                  placeholder="Full Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete={view === "signup" ? "new-email" : "email"}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={view === "signup" ? "new-password" : "current-password"}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent focus:bg-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 py-2.5 px-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition shadow-sm shadow-violet-200 flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {loading
                ? (view === "login" ? "Signing in..." : "Creating account...")
                : (view === "login" ? "Sign in" : "Sign up")}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {view === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { navigate(view === "login" ? "/signup" : "/login"); setError(""); setName(""); setEmail(""); setPassword(""); }}
              className="font-semibold text-violet-600 hover:text-violet-700 hover:underline transition"
            >
              {view === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
