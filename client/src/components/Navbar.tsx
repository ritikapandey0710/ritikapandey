import { authClient } from '../lib/auth-client';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { useSession } = authClient;
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  if (isPending) return <div>Loading...</div>;
  if (!session) return null; // Should not happen when used within ProtectedRoute

  const handleLogout = async () => {
    await authClient.signOut();
    navigate('/login');
  };

  return (
    <nav
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1.5rem',
        backgroundColor: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <span style={{ fontWeight: 600, color: '#1f2937' }}>
        Hello, {session.user.name || 'User'}!
      </span>
      <button
        onClick={handleLogout}
        style={{
          padding: '0.5rem 1rem',
          backgroundColor: '#ef4444',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '0.875rem',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        Sign out
      </button>
    </nav>
  );
}