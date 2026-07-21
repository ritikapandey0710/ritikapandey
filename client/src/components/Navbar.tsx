import { authClient } from "../lib/auth-client";
import { useNavigate } from "react-router-dom";

export default function Navbar() {
  const { useSession } = authClient;
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();

  if (isPending) return null;

  const handleSignOut = async () => {
    await authClient.signOut();
    navigate("/login");
  };

  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "1rem 2rem",
      backgroundColor: "#1f2937",
      color: "white",
      borderBottom: "1px solid #374151"
    }}>
      <div style={{ fontSize: "1.25rem", fontWeight: "bold" }}>Help Desk</div>
      {session ? (
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span>Hello, {session.user.name || session.user.email}!</span>
          <button
            onClick={handleSignOut}
            style={{ padding: "0.5rem 1rem", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div>Not logged in</div>
      )}
    </div>
  );
}