import backend from "@/services/Backend";

export const fetchTracesFromBackend = async () => {
  try {
    const response = await backend.get(`/traces`);
    return response.data;
  } catch (error) {
    console.error("Error fetching traces from backend:", error);
    return null;
  }
};
