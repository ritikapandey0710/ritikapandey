import { authClient } from '../lib/auth-client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import type { AuthUser } from '@/types/user';

export default function Navbar() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authClient.signOut();
    navigate('/login');
  };

  // Show loading state while session is being fetched
  if (isPending) {
    return (
      <nav className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="font-semibold text-foreground">Help Desk</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Show placeholder while loading */}
            <span className="text-sm text-muted-foreground hidden sm:block">
              Loading...
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Loading...
            </Button>
          </div>
        </div>
      </nav>
    );
  }

  // If no session, show sign-in links
  if (!session) {
    return (
      <nav className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="font-semibold text-foreground">Help Desk</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/login"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Sign in
            </a>
            <a
              href="/signup"
              className="text-sm text-muted-foreground hover:text-primary transition-colors margin-left-1"
            >
              Sign up
            </a>
          </div>
        </div>
      </nav>
    );
  }

  // User is authenticated - our augmented types now include the role field
  const user = session.user as AuthUser;
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <span className="font-semibold text-foreground">Help Desk</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground hidden sm:block">
            {user.email}
          </span>
          {/* Admin-only link to user management */}
          {user.role === "ADMIN" && (
            <a
              href="/user"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              Users
            </a>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </div>
    </nav>
  );
}