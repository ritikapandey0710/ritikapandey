import { authClient } from "./lib/auth-client";
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import TicketsPage from './pages/TicketsPage';
import UserPage from './pages/UserPage';
import LoginPage from './pages/LoginPage';
import type { AuthUser } from './types/user';
import { UserRole } from './types/role';

// Private route component to protect routes (requires authentication)
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = authClient.useSession();
  if (isPending) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
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
  if (isPending) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!session) return <Navigate to="/login" replace />;
  const user = session.user as AuthUser;
  // If not admin, redirect to home
  if (user.role !== UserRole.ADMIN) return <Navigate to="/" replace />;
  return (
    <>
      <Navbar />
      <div>{children}</div>
    </>
  );
}

export default function App() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
      <Route path="/tickets" element={<PrivateRoute><TicketsPage /></PrivateRoute>} />
      <Route path="/user" element={<AdminRoute><UserPage /></AdminRoute>} />
      <Route path="*" element={<Navigate to={session ? "/" : "/login"} replace />} />
    </Routes>
  );
}