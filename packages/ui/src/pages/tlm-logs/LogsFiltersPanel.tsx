import { Button } from "@/components/ui/button"
import {
  CardDescription,
  CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MultiSelect } from "@/components/ui/multi-select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { RefreshCw, Search, Wand2 } from "lucide-react"
import React, { useState } from "react"
import { toast } from "sonner"
import CollapsibleCard from "../../components/CollapsibleCard"
import { severityOptions } from "./severityOptions"

interface Props {
  uniqueServices: string[]
  loading: boolean
  // eslint-disable-next-line no-unused-vars
  onFiltersChange: (query: any, textSearch: string) => void
  initialTraceId?: string
}

const TAB_NORMAL = "normal"
const TAB_ADVANCED = "advanced"

const LogsFiltersCard: React.FC<Props> = ({
  uniqueServices,
  loading,
  onFiltersChange,
  initialTraceId = "",
  ...rest
}) => {
  const [activeTab, setActiveTab] = useState<"normal" | "advanced">("normal")
  const [textSearchInput, setSearchText] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string[]>([])
  const [serviceFilter, setServiceFilter] = useState<string[]>([])
  const [userInputQuery, setUserInputQuery] = useState("")
  const [traceIdInput, setTraceIdInput] = useState(initialTraceId)
  const [expanded, setExpanded] = useState(false)

  const handleApply = () => {
    let query = {}
    let textSearch = ""
    if (activeTab === TAB_ADVANCED) {
      try {
        query = userInputQuery ? JSON.parse(userInputQuery) : {}
        textSearch = textSearchInput
      } catch {
        toast.error("Invalid JSON in advanced query")
        return
      }
    } else {
      if (severityFilter.length > 0) query = { ...query, severityText: { $in: severityFilter } }
      if (serviceFilter.length > 0) {
        query = { ...query, ["resource.attributes.service.name"]: { $in: serviceFilter } }
      }
      if (traceIdInput.trim().length > 0) {
        query = { ...query, traceId: traceIdInput.trim() }
      }
      textSearch = textSearchInput
    }
    onFiltersChange(query, textSearch)
  }

  const handleClear = () => {
    setSearchText("")
    setSeverityFilter([])
    setServiceFilter([])
    setUserInputQuery("")
    setTraceIdInput("")
    setActiveTab(TAB_NORMAL)
    onFiltersChange({}, "")
  }


  // Autofocus and apply filter if initialTraceId is set
  React.useEffect(() => {
    if (initialTraceId) {
      setTraceIdInput(initialTraceId);
      handleApply();
    }
    // eslint-disable-next-line
  }, [initialTraceId]);

  return (
    <CollapsibleCard
      isOpen={expanded}
      onToggle={() => setExpanded((v) => !v)}
      header={
        <>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filters
          </CardTitle>
          <CardDescription>
            Filter logs by text, severity, service, or advanced query.
          </CardDescription>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="search" className="text-sm">
            Text Search
          </Label>
          <Input
            id="search"
            placeholder="Search logs..."
            value={textSearchInput}
            onChange={(e) => setSearchText(e.target.value)}
            className="mt-1"
            disabled={loading}
          />
        </div>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "normal" | "advanced")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="normal">Normal Filters</TabsTrigger>
            <TabsTrigger value="advanced">Advanced Query</TabsTrigger>
          </TabsList>
          <TabsContent value="normal" className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex-1 min-w-[160px]">
                <Label htmlFor="service" className="text-sm">
                  Service
                </Label>
                <MultiSelect
                  id="service"
                  options={uniqueServices.map((s) => ({ label: s, value: s }))}
                  value={serviceFilter}
                  onValueChange={setServiceFilter}
                  disabled={loading}
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <Label htmlFor="severity" className="text-sm">
                  Severity
                </Label>
                <MultiSelect
                  id="severity"
                  options={severityOptions}
                  value={severityFilter}
                  onValueChange={setSeverityFilter}
                  disabled={loading}
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <Label htmlFor="traceId" className="text-sm">
                  Trace ID
                </Label>
                <Input
                  id="traceId"
                  placeholder="Filter by Trace ID..."
                  value={traceIdInput}
                  onChange={(e) => setTraceIdInput(e.target.value)}
                  className="mt-1"
                  disabled={loading}
                />
              </div>
            </div>
          </TabsContent>
          <TabsContent value="advanced" className="space-y-4">
            <div>
              <Label htmlFor="advanced-query" className="text-sm">
                Advanced Query (JSON)
              </Label>
              <Textarea
                id="advanced-query"
                placeholder="{ }"
                value={userInputQuery}
                onChange={(e) => setUserInputQuery(e.target.value)}
                className="mt-1 font-mono"
                rows={4}
                disabled={loading}
              />
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleApply}
            disabled={loading}
            className="w-full sm:w-auto"
            variant="default"
          >
            <Search className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Apply
          </Button>
          <Button
            onClick={handleClear}
            disabled={loading}
            className="w-full sm:w-auto"
            variant="outline"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>
    </CollapsibleCard>
  )
}

export default LogsFiltersCard
