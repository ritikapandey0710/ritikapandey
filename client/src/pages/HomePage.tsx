import { authClient } from "../lib/auth-client";
import { useEffect, useState } from "react";
import { fetchTickets } from "../api";
import { useNavigate } from "react-router-dom";

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignee: { id: string; name: string | null; email: string } | null;
}

export default function HomePage() {
  const { data: session, isPending } = authClient.useSession();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");

  // Fetch tickets when filters change or component mounts
  useEffect(() => {
    if (!session?.user.id) return;

    fetchTicketsData();
  }, [session, search, statusFilter, priorityFilter]);

  async function fetchTicketsData() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchTickets({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined
      });
      setTickets(data);
    } catch (err) {
      console.error("Failed to fetch tickets:", err);
      setError("Failed to load tickets. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  // Handle logout
  const handleLogout = async () => {
    await authClient.signOut();
    navigate("/login");
  };

  if (isPending) return <div style={{ textAlign: "center", padding: "2rem" }}>Loading…</div>;
  if (!session) return <div style={{ textAlign: "center", padding: "2rem" }}>Please log in to continue.</div>;

  return (
    <div style={{ padding: "2rem", minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: "bold", color: "#1f2937" }}>Ticket Dashboard</h1>
        <div>
          <button
            onClick={() => navigate("/tickets/create")}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#10b981",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.95rem",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Create Ticket
          </button>
          <button
            onClick={handleLogout}
            style={{
              marginLeft: "0.5rem",
              padding: "0.75rem 1.5rem",
              backgroundColor: "#ef4444",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.95rem",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Log out
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "1rem", borderRadius: "6px", marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      {/* Welcome message and filters */}
      <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ flex: 1, minWidth: 260, padding: "1.5rem", backgroundColor: "#ffffff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem", color: "#374151" }}>
            Welcome back, {session.user.name || "Admin"}!
          </h2>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.95rem" }}>
            Here you can view and manage all support tickets.
          </p>
        </div>
        <div style={{ flex: 1, minWidth: 200, display: "flex", gap: "0.5rem" }}>
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "0.95rem"
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "0.95rem"
            }}
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            style={{
              padding: "0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              fontSize: "0.95rem"
            }}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      {/* Tickets table */}
      <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <div>Loading tickets...</div>
          </div>
        ) : tickets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#6b7280" }}>
            <p>No tickets found.</p>
            <button
              onClick={() => navigate("/tickets/create")}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              Create First Ticket
            </button>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1.2fr 100px 100px 120px", padding: "1rem", backgroundColor: "#f3f4f6", fontWeight: "600", fontSize: "0.9rem", color: "#374151" }}>
              <div>ID</div>
              <div>Title</div>
              <div>Description</div>
              <div>Status</div>
              <div>Priority</div>
              <div>Assigned To</div>
            </div>

            {/* Table rows */}
            <div style={{ maxHeight: "500px", overflowY: "auto" }}>
              {tickets.map((ticket, index) => (
                <div
                  key={ticket.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "80px 1fr 1.2fr 100px 100px 120px",
                    padding: "1rem",
                    borderBottom: "1px solid #e5e7eb",
                    backgroundColor: index % 2 === 0 ? "#fafafa" : "white"
                  }}
                >
                  <div>{ticket.id.slice(0, 8)}...</div>
                  <div style={{ fontWeight: "500" }}>{ticket.title}</div>
                  <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>{ticket.description || "-"}</div>
                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                        fontWeight: "500",
                        backgroundColor: getStatusColor(ticket.status),
                        color: "white"
                      }}
                    >
                      {ticket.status}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.8rem",
                        fontWeight: "500",
                        backgroundColor: getPriorityColor(ticket.priority),
                        color: "white"
                      }}
                    >
                      {ticket.priority}
                    </span>
                  </div>
                  <div>
                    {ticket.assignee ? (
                      <span>{ticket.assignee.name || ticket.assignee.email || "Unknown"}</span>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>Unassigned</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Helper functions for status and priority colors
function getStatusColor(status: string): string {
  switch (status) {
    case "OPEN": return "#3b82f6"; // Blue
    case "IN_PROGRESS": return "#f59e0b"; // Amber
    case "RESOLVED": return "#10b981"; // Emerald
    case "CLOSED": return "#6b7280"; // Gray
    default: return "#6b7280"; // Gray
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "LOW": return "#10b981"; // Emerald
    case "MEDIUM": return "#f59e0b"; // Amber
    case "HIGH": return "#ef4444"; // Red
    case "URGENT": return "#dc2626"; // Dark Red
    default: return "#6b7280"; // Gray
  }
}