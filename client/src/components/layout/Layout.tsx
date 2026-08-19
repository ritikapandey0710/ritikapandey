import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { authClient } from '../../lib/auth-client';
import type { AuthUser } from '../../types/user';
import { UserRole } from '../../types/role';
import {
  Home,
  Ticket,
  Users,
  Menu,
  LogOut,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = session?.user as AuthUser | undefined;
  const isAdmin = user?.role === UserRole.ADMIN;

  const handleLogout = async () => {
    await authClient.signOut();
    navigate('/login');
  };

  // Navigation items
  const navLinks = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Tickets', path: '/tickets', icon: Ticket },
    ...(isAdmin ? [{ name: 'Users', path: '/user', icon: Users }] : []),
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static md:translate-x-0 z-50 w-64
          bg-white border-r border-slate-200
          flex flex-col
          transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 px-4 border-b border-slate-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
            <Ticket className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-slate-900">Help Desk</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3">
          <ul className="space-y-1 px-2">
            {navLinks.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-violet-50 text-violet-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-slate-200">
          {user && (
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="text-sm font-semibold text-slate-900">
              {navLinks.find((l) => l.path === location.pathname)?.name || 'Help Desk'}
            </h1>
          </div>

          {/* User info (desktop) */}
          <div className="flex items-center gap-3">
            {isPending ? (
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            ) : user ? (
              <>
                <div className="hidden items-center gap-2 md:flex">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-violet-100 text-violet-700 text-xs font-bold">
                    {user.name?.charAt(0).toUpperCase() ?? user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-900 leading-none">{user.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate max-w-32">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-violet-600 hover:bg-violet-50 transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
