import { authClient } from '../lib/auth-client';
import { useNavigate, Link } from 'react-router-dom';
import type { AuthUser } from '@/types/user';
import { UserRole } from '@/types/role';

export default function Navbar() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authClient.signOut();
    navigate('/login');
  };

  const user = session?.user as AuthUser | undefined;

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* Left: Logo + Nav links */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shadow-sm shadow-violet-200 group-hover:bg-violet-700 transition">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900 text-sm">Help Desk</span>
          </Link>

          {!isPending && user && (
            <div className="flex items-center gap-1">
              <Link
                to="/"
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition font-medium"
              >
                Dashboard
              </Link>
              <Link
                to="/tickets"
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition font-medium"
              >
                Tickets
              </Link>
              {user.role === UserRole.ADMIN && (
                <Link
                  to="/user"
                  className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition font-medium"
                >
                  Users
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Right: User info + Sign out */}
        <div className="flex items-center gap-3">
          {isPending ? (
            <div className="w-24 h-4 bg-slate-100 rounded animate-pulse" />
          ) : user ? (
            <>
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 text-xs font-bold">
                  {user.name?.charAt(0).toUpperCase() ?? user.email.charAt(0).toUpperCase()}
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-xs font-medium text-slate-900 leading-none">{user.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition font-medium border border-slate-200 hover:border-red-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="px-3 py-1.5 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
