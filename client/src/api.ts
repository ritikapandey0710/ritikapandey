/**
 * Simple API service for making requests to the backend
 */

const API_BASE_URL = "/api";

export async function fetchTickets(params?: {
  search?: string;
  status?: string;
  priority?: string;
}) {
  const queryParams = new URLSearchParams();

  if (params?.search) queryParams.append("search", params.search);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.priority) queryParams.append("priority", params.priority);

  const url = `${API_BASE_URL}/tickets${queryParams.toString() ? `?${queryParams}` : ""}`;

  try {
    const response = await fetch(url, {
      credentials: "include" // Important for sending cookies with the request
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tickets: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching tickets:", error);
    throw error;
  }
}

export async function createTicket(ticketData: {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
}) {
  const url = `${API_BASE_URL}/tickets`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(ticketData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create ticket: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error creating ticket:", error);
    throw error;
  }
}

export async function updateTicket(id: string, ticketData: Partial<{
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
}>) {
  const url = `${API_BASE_URL}/tickets/${id}`;

  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(ticketData)
    });

    if (!response.ok) {
      throw new Error(`Failed to update ticket: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating ticket:", error);
    throw error;
  }
}

export async function deleteTicket(id: string) {
  const url = `${API_BASE_URL}/tickets/${id}`;

  try {
    const response = await fetch(url, {
      method: "DELETE",
      credentials: "include"
    });

    if (!response.ok) {
      throw new Error(`Failed to delete ticket: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error deleting ticket:", error);
    throw error;
  }
}