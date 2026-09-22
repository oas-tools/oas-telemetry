import React, { createContext, useContext, useEffect, useState } from "react";
import { getEnabledModules, type EnabledModules } from "@/services/Backend";

const CapabilitiesContext = createContext<EnabledModules & { loading: boolean }>({
    auth: true,
    ai: false,
    plugins: false,
    loading: true,
});

export function CapabilitiesProvider({ children }: { children: React.ReactNode }) {
    const [modules, setModules] = useState<EnabledModules>({ auth: true, ai: false, plugins: false });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getEnabledModules().then(setModules).finally(() => setLoading(false));
    }, []);

    return (
        <CapabilitiesContext.Provider value={{ ...modules, loading }}>
            {children}
        </CapabilitiesContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCapabilities() {
    return useContext(CapabilitiesContext);
}
