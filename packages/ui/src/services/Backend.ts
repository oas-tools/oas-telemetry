const FRONTEND_MARKER = "/oas-telemetry-ui";

export function getFrontendBaseName() {
    const path = window.location.pathname;
    const index = path.indexOf(FRONTEND_MARKER);
    let result: string;

    if (index !== -1) {
        console.log("OASTLM frontend marker found in path:", path, "Marker:", path.substring(0, index + FRONTEND_MARKER.length));
        result = path.substring(0, index + FRONTEND_MARKER.length);
    } else {
        console.log(`Marker: ${FRONTEND_MARKER}. OASTLM is in development mode. No marker was found in the path: ${path}`);
        result = "/";
    }

    console.log("OASTLM frontend base name:", result);
    return result;
}

export function getBackendUrl() {
    const path = window.location.pathname;
    const index = path.indexOf(FRONTEND_MARKER);
    let result: string;

    if (index !== -1) {
        // Remove the marker to get the backend base path
        const backendBase = path.substring(0, index);
        result = backendBase.endsWith("/") ? backendBase.slice(0, -1) : backendBase;
    } else {
        // Try to get from env, fallback to localhost
        const envUrl = import.meta.env.VITE_OASTLM_BACKEND_URL;
        if (envUrl && envUrl !== "") console.log("OASTLM backend URL loaded from env");
        result = envUrl || "http://localhost:3000/telemetry";
    }
    console.log("OASTLM backend URL:", result);
    return result;
}