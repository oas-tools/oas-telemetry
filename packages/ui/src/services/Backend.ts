import axios from "axios";

const PROD_FRONTEND_MARKER = "/oas-telemetry-ui";

export function getFrontendBaseName() {
    const path = window.location.pathname;
    const index = path.indexOf(PROD_FRONTEND_MARKER);
    let result: string;

    if (index !== -1) {
        console.debug("OASTLM frontend marker found in path:", path, "Marker:", path.substring(0, index + PROD_FRONTEND_MARKER.length));
        result = path.substring(0, index + PROD_FRONTEND_MARKER.length);
    } else {
        console.debug(`Marker: ${PROD_FRONTEND_MARKER}. OASTLM is in development mode. No marker was found in the path: ${path}`);
        result = "";
    }

    console.debug("OASTLM frontend base name:", result);
    return result;
}

function getBackendTelemetryBaseUrl() {
    const path = window.location.pathname;
    const index = path.indexOf(PROD_FRONTEND_MARKER);
    let result: string;

    if (index !== -1) {
        // Remove the marker to get the backend base path
        // E.g. if http://localhost:3000/telemetry/oas-telemetry-ui is the path, we want http://localhost:3000/telemetry
        const backendBase = path.substring(0, index);
        result = backendBase.endsWith("/") ? backendBase.slice(0, -1) : backendBase;
    } else {
        // Try to get from env, fallback to localhost
        const envUrl = import.meta.env.VITE_OASTLM_BACKEND_URL;
        if (envUrl && envUrl !== "") console.debug("OASTLM backend URL loaded from env");
        result = envUrl || "http://localhost:3000/telemetry";
    }
    return result;
}

const backend = axios.create({
    baseURL: getBackendTelemetryBaseUrl(),
    withCredentials: true,
    headers: { "Content-Type": "application/json" },
});

backend.interceptors.response.use(
    (res) => res,
    async (err) => {
        const backendUrl = getBackendTelemetryBaseUrl();
        if (
            err.response?.status === 401 &&
            err.config?.baseURL?.includes(backendUrl) &&
            !err.config?.url?.includes("/auth")
        ) {
            try {
                const valid = await refreshAuth();
                if (valid) {
                    err.config.headers['Authorization'] = ''; // Clear any auth headers if set
                    return backend.request(err.config);
                } else {
                    await logout();
                    redirectToLogin();
                }
            } catch {
                await logout();
                redirectToLogin();
            }
            return Promise.reject(err);
        }
        return Promise.reject(err);
    }
);


export function redirectToLogin() {
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath.includes("/login")) {
        return; // Already on login page
    }
    const loginUrl = `${getFrontendBaseName()}/login`;
    window.location.href = loginUrl;
}

export async function isAuthEnabled() {
    try {
        const res = await backend.get("/auth/enabled");
        return res.data?.enabled === true;
    } catch {
        return true;
    }
}

export async function refreshAuth() {
    try {
        console.debug("I'm thirsty... refreshing! (auth token)");
        const res = await backend.post("/auth/refresh");
        return res.data?.valid === true;
    } catch {
        return false;
    }
}

export async function logout() {
    await backend.post("/auth/logout");
}

export function getLogoRelativePath() {
    const prodFrontendBaseName = getFrontendBaseName();
    if (prodFrontendBaseName === "") { // Development mode
        return "/oas-tlm.svg";
    }
    // Production mode. E.g. /telemetry/oas-telemetry-ui/oas-tlm.svg
    return prodFrontendBaseName + "/oas-tlm.svg";
}

export default backend;