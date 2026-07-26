import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import UserPage from './pages/UserPage'
import { authClient } from './lib/auth-client'
import Navbar from './components/Navbar'

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
  // Add type assertion for user to access role
  const user = session.user as { role: string };
  // If not admin, redirect to home
  if (user.role !== "ADMIN") return <Navigate to="/" replace />;
  return (
    <>
      <Navbar />
      <div>{children}</div>
    </>
  );
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<LoginPage />} /> {/* Same component, different view state */}
      <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
      <Route path="/user" element={<AdminRoute><UserPage /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </BrowserRouter>,
)
