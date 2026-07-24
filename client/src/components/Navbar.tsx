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
    <nav className="flex justify-between items-center px-4 py-2 bg-gray-50 border-b border-gray-200">
      <span className="font-semibold text-gray-800">
        Hello, {session.user.name || 'User'}!
      </span>
      <button
        onClick={handleLogout}
        className="px-3 py-1.5 bg-red-500 text-white font-medium rounded hover:bg-red-600"
      >
        Sign out
      </button>
    </nav>
  );
}