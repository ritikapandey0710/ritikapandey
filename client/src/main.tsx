import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import UserPage from './pages/UserPage'
import { authClient } from './lib/auth-client'
import Navbar from './components/Navbar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AuthUser } from './types/user';
import React from 'react';

// Create a client instance
const queryClient = new QueryClient();

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

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<LoginPage />} /> {/* Same component, different view state */}
          <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
          <Route path="/user" element={<AdminRoute><UserPage /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)