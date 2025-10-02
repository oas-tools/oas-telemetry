
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { MessageSquare, X, Minimize2, Maximize2, ArrowDown, ArrowUp } from "lucide-react"
import { TelemetryChat } from "@/components/chat/ChatComponent"
import { cn } from "@/lib/utils"

interface ChatOpenerProps {
  className?: string
  buttonClassName?: string
  panelClassName?: string
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left"
  size?: "sm" | "md" | "lg"
}

export function ChatOpener({
  className,
  buttonClassName,
  panelClassName,
  position = "bottom-right",
  size = "md",
}: ChatOpenerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [isBigPanel, setIsBigPanel] = useState(false)

  const getPositionClasses = () => {
    switch (position) {
      case "bottom-left":
        return "bottom-6 left-6"
      case "top-right":
        return "top-6 right-6"
      case "top-left":
        return "top-6 left-6"
      default:
        return "bottom-6 right-6"
    }
  }

  const getPanelPositionClasses = () => {
    switch (position) {
      case "bottom-left":
        return "bottom-0 left-0 items-start justify-start"
      case "top-right":
        return "top-0 right-0 items-start justify-end"
      case "top-left":
        return "top-0 left-0 items-start justify-start"
      default:
        return "bottom-0 right-0 items-end justify-end"
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return { button: "h-12 w-12", icon: "h-5 w-5", panel: "w-80 h-96" }
      case "lg":
        return { button: "h-16 w-16", icon: "h-7 w-7", panel: "w-96 h-[700px]" }
      default:
        return { button: "h-14 w-14", icon: "h-6 w-6", panel: "w-full max-w-md h-[600px]" }
    }
  }

  const sizeClasses = getSizeClasses()

  const toggleChat = () => {
    setIsOpen(!isOpen)
    if (!isOpen) {
      setIsMinimized(false)
      setIsBigPanel(false)
    }
  }

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const toggleBigPanel = () => {
    setIsBigPanel(!isBigPanel)
  }

  return (
    <div className={cn("fixed z-50", className)}>
      {/* Chat Panel */}
      {isOpen && (
        <div className={cn("fixed inset-0 flex p-4 pointer-events-none", getPanelPositionClasses())}>
          <div
            className={cn(
              "bg-white rounded-lg shadow-2xl border pointer-events-auto transition-all duration-200",
              isBigPanel ? "w-[100%] h-[90%]" : sizeClasses.panel,
              isMinimized && "h-14",
              panelClassName,
            )}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gray-50 rounded-t-lg">
              <h3 className="font-semibold text-gray-900 text-sm">{isMinimized ? "Chat" : "Telemetry AI Assistant"}</h3>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleMinimize}
                  className="h-7 w-7 p-0 hover:bg-gray-200"
                  title={isMinimized ? "Expand" : "Minimize"}
                >
                  {isMinimized ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                </Button>
                {!isMinimized && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleBigPanel}
                    className="h-7 w-7 p-0 hover:bg-gray-200"
                    title={isBigPanel ? "Switch to Panel" : "Switch to Big Panel"}
                  >
                    {isBigPanel ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleChat}
                  className="h-7 w-7 p-0 hover:bg-gray-200"
                  title="Close chat"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Panel Content */}

              <div className={cn("h-[calc(100%-57px)] transition-all duration-200", isMinimized && "hidden")}>
                <TelemetryChat mode="panel" />
              </div>

          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      {!isOpen && (
        <Button
          onClick={toggleChat}
          className={cn(
            "fixed rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105",
            getPositionClasses(),
            sizeClasses.button,
            buttonClassName,
          )}
          title="Open AI Assistant"
        >
          <MessageSquare className={sizeClasses.icon} />
        </Button>
      )}
    </div>
  )
}
