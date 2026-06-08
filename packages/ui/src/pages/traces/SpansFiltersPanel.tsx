import { Button } from "@/components/ui/button"
import { CardDescription, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { MultiSelect } from "@/components/ui/multi-select"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { RefreshCw, Search, Wand2 } from "lucide-react"
import React, { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import CollapsibleCard from "../../components/CollapsibleCard"
import { HTTP_METHODS, parseStatusCodes } from "@/lib/helpers/trace"
import { utilService } from "@/services/utilService"

interface Props {
  uniqueEndpoints: string[]
  loading: boolean
  // eslint-disable-next-line no-unused-vars
  onFiltersChange: (query: any) => void
  initialTraceId?: string
}

const TAB_NORMAL = "normal"
const TAB_ADVANCED = "advanced"

const SpansFiltersPanel: React.FC<Props> = ({
  uniqueEndpoints,
  loading,
  onFiltersChange,
  initialTraceId = "",
}) => {
    const [traceIdInput, setTraceIdInput] = useState(initialTraceId)
  const [activeTab, setActiveTab] = useState<"normal" | "advanced">("normal")
  const [endpointFilter, setEndpointFilter] = useState<string[]>([])
  const [methodFilter, setMethodFilter] = useState<string[]>([])
  const [statusInput, setStatusInput] = useState("")
  const [userInputQuery, setUserInputQuery] = useState("")
  const [expanded, setExpanded] = useState(false)
  const [allEndpoints, setAllEndpoints] = useState<string[]>([])
  const [loadingEndpoints, setLoadingEndpoints] = useState(false)

  // Sort and merge endpoints from spans and OpenAPI spec
  const fetchAllEndpoints = useCallback(async () => {
    setLoadingEndpoints(true)
    try {
      // Get endpoints from current spans
      const spanEndpoints = new Set(uniqueEndpoints.filter(Boolean))

      // Try to get endpoints from OpenAPI spec
      try {
        const spec = await utilService.getOpenApiSpec()
        if (spec?.paths) {
          const specEndpoints = Object.keys(spec.paths)
          specEndpoints.forEach((ep) => spanEndpoints.add(ep))
        }
      } catch {
        // Spec is optional, just use span endpoints
      }

      // Sort and convert to array
      const sorted = Array.from(spanEndpoints).sort()
      setAllEndpoints(sorted)
    } finally {
      setLoadingEndpoints(false)
    }
  }, [uniqueEndpoints])

  // Fetch endpoints on mount and when span endpoints change
  useEffect(() => {
    fetchAllEndpoints()
  }, [fetchAllEndpoints])

  const handleApply = () => {
    let query = {}
    if (activeTab === TAB_ADVANCED) {
      try {
        query = userInputQuery ? JSON.parse(userInputQuery) : {}
      } catch {
        toast.error("Invalid JSON in advanced query")
        return
      }
    } else {
      if (endpointFilter.length > 0) {
        query = { ...query, ["attributes.http.target"]: { $in: endpointFilter } }
      }
      if (methodFilter.length > 0) {
        query = { ...query, ["attributes.http.method"]: { $in: methodFilter } }
      }
      if (statusInput.trim().length > 0) {
        const statusCodes = parseStatusCodes(statusInput)
        if (statusCodes.length > 0) {
          query = { ...query, ["attributes.http.status_code"]: { $in: statusCodes } }
        } else {
          toast.error("No valid status codes found. Use format: 200, 301, 404")
          return
        }
      }
      if (traceIdInput.trim().length > 0) {
        query = { ...query, traceId: traceIdInput.trim() }
      }
    }
    onFiltersChange(query)
  }

  const handleClear = () => {
    setEndpointFilter([])
    setMethodFilter([])
    setStatusInput("")
    setUserInputQuery("")
    setTraceIdInput("")
    setActiveTab(TAB_NORMAL)
    onFiltersChange({})
  }
  // Autofocus and apply filter if initialTraceId is set
  useEffect(() => {
    if (initialTraceId) {
      setTraceIdInput(initialTraceId)
      handleApply()
    }
    // eslint-disable-next-line
  }, [initialTraceId])

  return (
    <CollapsibleCard
      isOpen={expanded}
      onToggle={() => setExpanded((v) => !v)}
      header={
        <>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Span Filters
          </CardTitle>
          <CardDescription>
            Filter spans by endpoint, HTTP method, or status code.
          </CardDescription>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleApply()
        }}
        className="space-y-4"
      >
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
                <Label htmlFor="endpoint" className="text-sm">
                  Endpoint / Target
                  {loadingEndpoints && <span className="ml-2 text-xs text-muted-foreground">(loading...)</span>}
                </Label>
                <MultiSelect
                  id="endpoint"
                  options={allEndpoints.map((endpoint) => ({
                    label: endpoint || "(no target)",
                    value: endpoint,
                  }))}
                  value={endpointFilter}
                  onValueChange={setEndpointFilter}
                  disabled={loading || loadingEndpoints}
                />
              </div>
                <div className="flex-1 min-w-[160px] flex gap-4 flex-col sm:flex-row">
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
                <div className="flex-1">
                  <Label htmlFor="method" className="text-sm">
                    HTTP Method
                  </Label>
                  <MultiSelect
                    id="method"
                    options={HTTP_METHODS.map((method) => ({
                      label: method,
                      value: method,
                    }))}
                    value={methodFilter}
                    onValueChange={setMethodFilter}
                    disabled={loading}
                  />
                </div>
                <div className="flex-1">
                  <Label htmlFor="status" className="text-sm">
                    Status Codes
                  </Label>
                  <Input
                    id="status"
                    placeholder="200, 301, 404"
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value)}
                    className="font-mono text-sm"
                    disabled={loading}
                    title="Enter HTTP status codes separated by commas or spaces"
                  />
                  {statusInput && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Will query: {parseStatusCodes(statusInput).join(", ") || "none"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="advanced" className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="mongo-query" className="text-sm">
                  Advanced Query (JSON)
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setUserInputQuery(
                      JSON.stringify(
                        {
                          "attributes.http.method": "GET",
                          "attributes.http.status_code": { $gte: 400 },
                        },
                        null,
                        2,
                      ),
                    )
                  }
                  disabled={loading}
                >
                  <Wand2 className="h-4 w-4" />
                  Load Example
                </Button>
              </div>
              <Textarea
                id="mongo-query"
                placeholder='{"attributes.http.method": "GET"}'
                value={userInputQuery}
                onChange={(e) => setUserInputQuery(e.target.value)}
                className="min-h-[120px] font-mono text-sm"
                disabled={loading}
              />
            </div>
          </TabsContent>
        </Tabs>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Apply and Update
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleClear}
            className="w-full sm:w-auto bg-transparent"
            disabled={loading}
          >
            Clear
          </Button>
        </div>
      </form>
    </CollapsibleCard>
  )
}

export default SpansFiltersPanel
