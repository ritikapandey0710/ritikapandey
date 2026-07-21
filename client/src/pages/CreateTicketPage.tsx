import { authClient } from "../lib/auth-client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTicket } from "../api";

export default function CreateTicketPage() {
  const { useSession } = authClient;
  const { data: session, isPending } = useSession();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [priority, setPriority] = useState("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      // Prepare ticket data
      const ticketData: any = {
        title,
        description: description || undefined,
        status,
        priority,
      };

      // Only include assigneeId if provided
      if (assigneeId) {
        ticketData.assigneeId = assigneeId;
      }

      // Create ticket via API
      await createTicket(ticketData);

      setSuccess("Ticket created successfully!");
      // Reset form
      setTitle("");
      setDescription("");
      setStatus("OPEN");
      setPriority("MEDIUM");
      setAssigneeId("");

      // Redirect to home after a short delay
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err: any) {
      console.error("Failed to create ticket:", err);
      setError(err.message || "Failed to create ticket. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel
  const handleCancel = () => {
    navigate("/");
  };

  if (isPending) return <div>Loading...</div>;
  if (!session) return <div>Please log in to access this page.</div>;

  return (
    <div style={{ padding: "2rem", minHeight: "100vh", backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: "bold", color: "#1f2937" }}>Create New Ticket</h1>
        <div>
          <button
            onClick={handleCancel}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#6b7280",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "1rem", borderRadius: "6px", marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ backgroundColor: "#dcfce7", color: "#166534", padding: "1rem", borderRadius: "6px", marginBottom: "1.5rem" }}>
          {success}
        </div>
      )}

      {/* Form */}
      <div style={{ backgroundColor: "#ffffff", borderRadius: "8px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", padding: "2rem" }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div>
            <label htmlFor="title" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#374151" }}>
              Title *
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.95rem"
              }}
            />
          </div>

          <div>
            <label htmlFor="description" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#374151" }}>
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.95rem",
                resize: "vertical"
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label htmlFor="status" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#374151" }}>
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "0.95rem"
                }}
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            <div>
              <label htmlFor="priority" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#374151" }}>
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  fontSize: "0.95rem"
                }}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="assignee" style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", color: "#374151" }}>
              Assigned To (User ID)
            </label>
            <input
              id="assignee"
              type="text"
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              placeholder="Enter user ID to assign ticket (optional)"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "0.95rem"
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: "0.75rem",
                backgroundColor: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              {loading ? "Creating..." : "Create Ticket"}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                flex: 1,
                padding: "0.75rem",
                backgroundColor: "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}