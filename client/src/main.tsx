import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import CreateTicketPage from './pages/CreateTicketPage'
import { authClient } from './lib/auth-client'

// Private route component to protect routes
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { useSession } = authClient;
  const { data: session, isPending } = useSession();
  if (isPending) return <div>Loading...</div>
  return session ? children : <Navigate to="/login" replace />;
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<LoginPage />} /> {/* Same component, different view state */}
      <Route path="/" element={<PrivateRoute><HomePage /></PrivateRoute>} />
      <Route path="/tickets/create" element={<PrivateRoute><CreateTicketPage /></PrivateRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  </BrowserRouter>,
)