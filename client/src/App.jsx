import { useNavigate } from "react-router-dom";
import { authClient } from "./lib/auth-client";
import { useEffect } from "react";

export default function App() {
  const navigate = useNavigate();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;
    navigate(session ? "/" : "/login");
  }, [session, isPending, navigate]);

  if (isPending) return <div style={{ textAlign: "center", padding: "2rem" }}>Loading…</div>;
  return null;
}
