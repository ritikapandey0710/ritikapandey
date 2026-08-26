import { authClient } from '@/lib/auth-client';
import { useNavigate } from 'react-router-dom';
import type { AuthUser } from '@/types/user';
import { UserRole } from '@/types/role';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function Navbar() {
  const { data: session } = authClient.useSession();
  const navigate = useNavigate();

  // User is authenticated - cast user to access role and email
  const user = session?.user as AuthUser | undefined;

  const handleLogout = async () => {
    await authClient.signOut();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 bg-[hsl(var(--background))] border-b border-[hsl(var(--border)/0.5)] backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            {/* Ticket icon from lucide-react */}
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 3v6a2 2 0 01-2 2H8a2 2 0 01-2-2V3m0 0l4 4m4-4l4 4M8 13a2 2 0 100-4h8a2 2 0 100 4H8z" />
            </svg>
          </div>
          <span className="font-semibold text-foreground text-lg">Help Desk</span>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-4">
          {/* Email display */}
          <span className="hidden sm:block text-sm text-muted-foreground">
            {user?.email}
          </span>

          {/* Admin-only link */}
          {user?.role === UserRole.ADMIN && (
            <a
              href="/user"
              className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              Users
            </a>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <ThemeToggle className="hidden md:block" />

          <button
            onClick={handleLogout}
            className="text-sm font-medium"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  );
}