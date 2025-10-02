import React, { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { MultiSelect } from "@/components/ui/multi-select"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Search, RefreshCw, Wand2, ChevronDown, ChevronUp } from "lucide-react"
import { severityOptions } from "./severityOptions"
import { toast } from "sonner"
import CollapsibleCard from "./CollapsibleCard"

interface Props {
  uniqueServices: string[]
  loading: boolean
  onFiltersChange: (query: any, textSearch: string) => void
}

const TAB_NORMAL = "normal"
const TAB_ADVANCED = "advanced"
const SERVICE_ALL = "all"

const LogsFiltersCard: React.FC<Props> = ({
  uniqueServices,
  loading,
  onFiltersChange,
}) => {
  const [activeTab, setActiveTab] = useState<"normal" | "advanced">("normal")
  const [textSearchInput, setSearchText] = useState("")
  const [severityFilter, setSeverityFilter] = useState<string[]>([])
  const [serviceFilter, setServiceFilter] = useState<string[]>([])
  const [userInputQuery, setUserInputQuery] = useState("")
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
      textSearch = textSearchInput
    }
    onFiltersChange(query, textSearch)
  }

  const handleClear = () => {
    setSearchText("")
    setSeverityFilter([])
    setServiceFilter([])
    setUserInputQuery("")
    setActiveTab(TAB_NORMAL)
    onFiltersChange({}, "")
  }

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
                  options={
                    uniqueServices.map((service) => ({
                      label: service,
                      value: service,
                    }))
                  }
                  value={serviceFilter}
                  onValueChange={setServiceFilter}
                  disabled={loading}
                />
              </div>
              <div className="flex-1 min-w-[160px]">
                <Label htmlFor="severity" className="text-sm">
                  Severity Levels
                </Label>
                <MultiSelect
                  id="severity"
                  options={severityOptions}
                  value={severityFilter}
                  onValueChange={setSeverityFilter}
                  disabled={loading}
                />
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
                          severityText: "INFO",
                          "resource.attributes.service.name":
                            "oas-telemetry-service",
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
                placeholder='{"severityText": "ERROR"}'
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
            onClick={handleApply}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Apply and Update
          </Button>
          <Button
            variant="outline"
            onClick={handleClear}
            className="w-full sm:w-auto bg-transparent"
            disabled={loading}
          >
            Clear
          </Button>
        </div>
      </div>
    </CollapsibleCard>
  )
}

export default LogsFiltersCard
