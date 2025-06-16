import axios from "axios";

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export const fetchTracesFromBackend = async () => {
  try {
    const response = await axios.get(`${backendUrl}/telemetry/traces`);
    return response.data;
  } catch (error) {
    console.error("Error fetching traces from backend:", error);
    return null;
  }
};
