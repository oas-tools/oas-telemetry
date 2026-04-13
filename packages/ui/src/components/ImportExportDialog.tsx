import React, { useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Download, Upload, X } from "lucide-react"
import { toast } from "sonner"

interface ImportExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  resourceType: "logs" | "metrics" | "traces"
  onDownload?: () => Promise<void>
  onImport?: (file: File, options: { reset: boolean; format?: string }) => Promise<void>
}

const ImportExportDialog: React.FC<ImportExportDialogProps> = ({
  open,
  onOpenChange,
  resourceType,
  onDownload,
  onImport,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [reset, setReset] = useState(false)
  const [format, setFormat] = useState("raw" as "raw" | "otel")
  const [importing, setImporting] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const validateFile = (file: File): boolean => {
    if (!file.name.toLowerCase().endsWith(".json")) {
      toast.error("File must be .json format")
      return false
    }
    return true
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const file = e.dataTransfer.files?.[0]
    if (file && validateFile(file)) {
      setSelectedFile(file)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && validateFile(file)) {
      setSelectedFile(file)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error("Please select a file")
      return
    }

    setImporting(true)
    try {
      await onImport?.(selectedFile, { reset, format })
      toast.success(`${resourceType} imported successfully`)
      setSelectedFile(null)
      onOpenChange(false)
    } catch (error) {
      toast.error(`Failed to import: ${(error as Error).message}`)
    } finally {
      setImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const clearSelection = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import / Export {resourceType}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="export" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="export">Export</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
          </TabsList>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">Download all {resourceType} as JSON file</p>
              <Button
                onClick={onDownload}
                className="w-full"
                disabled={!onDownload}
              >
                <Download className="h-4 w-4 mr-2" />
                Download {resourceType}.json
              </Button>
            </div>
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">Select JSON file</p>

              {/* Drop Zone */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileInputChange}
                disabled={importing}
                className="hidden"
              />

              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                } ${selectedFile ? "bg-green-50/50 border-green-300" : ""}`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                {selectedFile ? (
                  <div>
                    <p className="font-medium text-sm text-green-700">{selectedFile.name}</p>
                    <p className="text-xs text-green-600 mt-1">
                      ({(selectedFile.size / 1024).toFixed(2)} KB)
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium">Drag and drop your file here</p>
                    <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
                  </div>
                )}
              </div>

              {selectedFile && (
                <Button
                  onClick={clearSelection}
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2"
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear Selection
                </Button>
              )}

              {/* Upload Button */}
              <Button
                onClick={handleImport}
                className="w-full"
                disabled={importing || !selectedFile}
              >
                {importing ? "Uploading..." : "Upload & Import"}
              </Button>

              {/* Options */}
              <div className="space-y-3 mt-4 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="reset"
                    checked={reset}
                    onCheckedChange={(checked) => setReset(checked as boolean)}
                    disabled={importing}
                  />
                  <Label htmlFor="reset" className="text-sm cursor-pointer">
                    Clear data before import
                  </Label>
                </div>

                {resourceType === "metrics" && (
                  <div className="space-y-2">
                    <Label htmlFor="format" className="text-sm">
                      Import Format
                    </Label>
                    <Select value={format} onValueChange={(v) => setFormat(v as "raw" | "otel")}>
                      <SelectTrigger id="format" disabled={importing}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="raw">Raw</SelectItem>
                        <SelectItem value="otel">OpenTelemetry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

export default ImportExportDialog
