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
    const [authEnabled, setAuthEnabled] = useState(true);

    useEffect(() => {
        isAuthEnabled().then((enabled) => {
            setAuthEnabled(enabled);
            if (enabled) {
                refreshAuth().then((valid) => {
                    setAuthenticated(valid);
                    if (!valid) {
                        redirectToLogin();
                    }
                });
            } else {
                setAuthenticated(true);
            }
        });
    }, []);

    const logout = async () => {
        if (authEnabled) {
            await backendLogout();
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
