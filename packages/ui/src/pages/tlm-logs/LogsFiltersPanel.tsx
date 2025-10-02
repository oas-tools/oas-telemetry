import React, { useState } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import { Search, RefreshCw, Wand2 } from "lucide-react"
import { severityOptions } from "./severityOptions"
import { toast } from "sonner"

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
  const [serviceFilter, setServiceFilter] = useState<string>(SERVICE_ALL)
  const [userInputQuery, setUserInputQuery] = useState("")

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
      if (serviceFilter !== SERVICE_ALL) query = { ...query, ["resource.attributes.service.name"]: serviceFilter }
      textSearch = textSearchInput
    }
    onFiltersChange(query, textSearch)
  }

  const handleClear = () => {
    setSearchText("")
    setSeverityFilter([])
    setServiceFilter(SERVICE_ALL)
    setUserInputQuery("")
    setActiveTab(TAB_NORMAL)
    onFiltersChange({}, "")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search & Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
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
              <div>
                <Label htmlFor="severity" className="text-sm">
                  Severity Levels
                </Label>
                <MultiSelect
                  id="severity"
                  options={severityOptions}
                  value={severityFilter}
                  onValueChange={setSeverityFilter}
                />
              </div>
              <div>
                <Label htmlFor="service" className="text-sm">
                  Service
                </Label>
                <Select
                  value={serviceFilter}
                  onValueChange={setServiceFilter}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {uniqueServices.map((service) => (
                      <SelectItem key={service} value={service}>
                        {service}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    size="sm"
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
                />
              </div>
            </TabsContent>
          </Tabs>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              size="sm"
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
              size="sm"
              variant="outline"
              onClick={handleClear}
              className="w-full sm:w-auto bg-transparent"
            >
              Clear
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default LogsFiltersCard
