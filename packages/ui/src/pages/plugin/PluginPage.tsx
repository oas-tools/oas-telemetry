"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Puzzle } from "lucide-react"
import { PluginList } from "@/components/plugin-list"
import { PluginExport, PluginImport } from "@/components/plugin-import-export"
import type { Plugin } from "@/lib/types"
import { getPluginService } from "@/services/pluginService"
import { useNavigate } from "react-router-dom"

export default function PluginManager() {
    const [refreshKey, setRefreshKey] = useState(0)
    const [plugins, setPlugins] = useState<Plugin[]>([])
    const navigate = useNavigate()

    useEffect(() => {
        loadPlugins()
    }, [refreshKey])

    const loadPlugins = async () => {
        try {
            const pluginService = getPluginService()
            const result = await pluginService.listPlugins()
            if (result.status === "success") {
                setPlugins(result.data)
            } else {
                setPlugins([])
            }
        } catch (error) {
            console.error("Failed to load plugins:", error)
            setPlugins([])
        }
    }

    const handlePluginCreated = () => {
        setRefreshKey((prev) => prev + 1)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <main className="container mx-auto px-6 py-8 space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Puzzle className="h-5 w-5" />
                                    Plugin Management
                                </CardTitle>
                                <CardDescription>Control and manage telemetry system plugins</CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent>
                        {/* Action Bar */}
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <Button className="gap-2 w-full sm:w-auto" onClick={() => navigate('/plugins/create')}>
                                  <span className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    Add Plugin
                                  </span>
                                </Button>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <PluginImport onPluginsImported={handlePluginCreated} />
                                <PluginExport plugins={plugins} />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <PluginList key={refreshKey} onRefresh={handlePluginCreated} />

            </main>
        </div>
    )
}
