import { authClient } from '../lib/auth-client';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const { useSession } = authClient;
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  if (isPending) return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>;
  if (!session) return <div style={{ textAlign: 'center', padding: '2rem' }}>Please log in to continue.</div>;

  return (
    <div style={{ padding: '2rem', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <h1 style={{ margin: '0 0 1.5rem 0', fontSize: '1.8rem', fontWeight: 'bold', color: '#1f2937', textAlign: 'center' }}>
        Welcome
      </h1>

      <div style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <p style={{ margin: '0 0 1rem 0', color: '#6b7280', fontSize: '0.95' }}>
          You have successfully logged in. This is the authentication-only version of the help desk.
        </p>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.9' }}>
          No ticket management features are available in this version.
        </p>
      </div>
    </div>
  );
}
