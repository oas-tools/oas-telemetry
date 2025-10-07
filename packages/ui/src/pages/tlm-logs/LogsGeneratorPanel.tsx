import React, { useState } from "react"
import {
    CardTitle,
    CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { toast } from "sonner"
import { logsService } from "@/services/logService"
import { Wand2, Plus } from "lucide-react"
import { severityOptions } from "./severityOptions"
import { Textarea } from "@/components/ui/textarea"
import CollapsibleCard from "../../components/CollapsibleCard"

const logMethods = [
    { value: "info", label: "Info", icon: severityOptions[2].icon },
    { value: "warn", label: "Warn", icon: severityOptions[3].icon },
    { value: "error", label: "Error", icon: severityOptions[4].icon },
    { value: "debug", label: "Debug", icon: severityOptions[1].icon },
]

export default function LogsGeneratorPanel() {
    const [tab, setTab] = useState<"custom" | "mock">("custom")
    const [message, setMessage] = useState("Hello Telemetry!")
    const [method, setMethod] = useState("info")
    const [repeat, setRepeat] = useState(1)
    const [mockCount, setMockCount] = useState(50)
    const [loading, setLoading] = useState(false)
    const [expanded, setExpanded] = useState(false)

    const handleGenerateLog = async () => {
        setLoading(true)
        try {
            await logsService.generateCustomLog({ log: message, method, repeat })
            toast.success("Log(s) generated. Please wait a few seconds for them to appear.")
        } catch {
            toast.error("Failed to generate log(s).")
        } finally {
            setLoading(false)
        }
    }

    const handleGenerateMockLogs = async () => {
        setLoading(true)
        try {
            await logsService.generateMockLogs(mockCount)
            toast.success("Mock logs generation started.")
        } catch {
            toast.error("Failed to generate mock logs.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <CollapsibleCard
            isOpen={expanded}
            onToggle={() => setExpanded((v) => !v)}
            header={
                <>
                    <CardTitle className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5" />
                        Log Generator
                    </CardTitle>
                    <CardDescription>
                        Generate logs for testing and demonstration purposes.
                    </CardDescription>
                </>
            }
        >
            <Tabs value={tab} onValueChange={v => setTab(v as "custom" | "mock")}>
                <TabsList className="mb-4 grid grid-cols-2 w-full">
                    <TabsTrigger value="custom">Custom Log</TabsTrigger>
                    <TabsTrigger value="mock">Mock Logs</TabsTrigger>
                </TabsList>
                <TabsContent value="custom">
                    <div className="flex flex-col gap-4">
                        <div>
                            <Label htmlFor="log-message" className="mb-1 block">Message</Label>
                            <Textarea
                                id="log-message"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Log text"
                                disabled={loading}
                                className="mb-2"
                            />
                        </div>
                        <div className="flex gap-4 flex-col sm:flex-row sm:items-end">
                            <div className="flex gap-4 flex-row">
                                <div>
                                    <Label htmlFor="log-method" className="mb-1 block">Method</Label>
                                    <Select value={method} onValueChange={setMethod} disabled={loading}>
                                        <SelectTrigger className="min-w-[120px]">
                                            <SelectValue placeholder="Method" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {logMethods.map((m) => {
                                                const Icon = m.icon
                                                return (
                                                    <SelectItem key={m.value} value={m.value} className="flex items-center gap-2">
                                                        <Icon className="h-4 w-4 mr-1" />
                                                        {m.label}
                                                    </SelectItem>
                                                )
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="log-repeat" className="mb-1 block">Repeat</Label>
                                    <Input
                                        id="log-repeat"
                                        type="number"
                                        min={1}
                                        value={repeat}
                                        onChange={(e) => setRepeat(Number(e.target.value))}
                                        disabled={loading}
                                        className="w-20"
                                    />
                                </div>
                            </div>
                            <Button
                                onClick={handleGenerateLog}
                                disabled={loading}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Generate
                            </Button>
                        </div>
                    </div>
                </TabsContent>
                <TabsContent value="mock">
                    <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                        <div>
                            <Label htmlFor="mock-count" className="mb-1 block">Number of Mock Logs</Label>
                            <Input
                                id="mock-count"
                                type="number"
                                min={1}
                                value={mockCount}
                                onChange={(e) => setMockCount(Number(e.target.value))}
                                disabled={loading}
                                className="w-32"
                            />
                        </div>
                        <Button
                            onClick={handleGenerateMockLogs}
                            disabled={loading}
                            className="mt-2 sm:mt-0"
                        >
                            <Wand2 className="h-4 w-4 mr-2" />
                            Generate Mock Logs
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>
        </CollapsibleCard>
    )
}
