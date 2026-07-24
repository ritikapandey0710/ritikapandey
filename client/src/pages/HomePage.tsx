import { authClient } from '../lib/auth-client';

export default function HomePage() {
  const { useSession } = authClient;
  const { data: session, isPending } = useSession();

  if (isPending) return <div className="text-center py-8">Loading...</div>;
  if (!session) return <div className="text-center py-8">Please log in to continue.</div>;

  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <h1 className="mb-6 text-3xl font-bold text-gray-800 text-center">
        Welcome
      </h1>

      <div className="p-6 bg-white rounded-md shadow">
        <p className="mb-4 text-base text-gray-600">
          You have successfully logged in. This is the authentication-only version of the help desk.
        </p>
        <p className="text-sm text-gray-600">
          No ticket management features are available in this version.
        </p>
      </div>
    </div>
  );
}