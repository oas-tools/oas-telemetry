import React, { createContext, useContext, useEffect, useState } from "react";
import { refreshAuth, logout as backendLogout, isAuthEnabled, redirectToLogin } from "@/services/Backend";

const AuthContext = createContext<{
    isAuthenticated: boolean;
    // eslint-disable-next-line no-unused-vars
    setAuthenticated: (v: boolean) => void;
    logout: () => Promise<void>;
    authEnabled: boolean;
}>({
    isAuthenticated: false,
    setAuthenticated: () => { },
    logout: async () => { },
    authEnabled: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setAuthenticated] = useState(false);
    const [authEnabled, setAuthEnabled] = useState(false);

    useEffect(() => {
        isAuthEnabled().then((enabled) => {
            setAuthEnabled(enabled);
            if (enabled) {
                // Only try to refresh auth if auth is enabled
                refreshAuth().then((valid) => {
                    setAuthenticated(valid);
                    if (!valid) {
                        redirectToLogin();
                    }
                }).catch(() => {
                    setAuthenticated(false);
                    redirectToLogin();
                });
            } else {
                // Auth is disabled, user is considered authenticated
                setAuthenticated(true);
            }
        }).catch(() => {
            // If we can't determine auth status, assume it's disabled
            setAuthEnabled(false);
            setAuthenticated(true);
        });
    }, []);

    const logout = async () => {
        if (authEnabled) {
            try {
                await backendLogout();
            } catch (error) {
                console.error("Logout error:", error);
            }
            setAuthenticated(false);
            redirectToLogin();
        }
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, setAuthenticated, logout, authEnabled }}>
            {children}
        </AuthContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    return useContext(AuthContext);
}
