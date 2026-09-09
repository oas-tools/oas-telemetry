"use client"

import { useState, useEffect } from "react"
import { ConversationSidebar } from "./conversation-sidebar"
import { MessageInput } from "./message-input"
import { MessageList } from "./message-list"
import { useChatStore } from "@/lib/store/chat"
import { cn } from "@/lib/utils"
import { Button } from "../ui/button"
import { X, Menu } from "lucide-react"
import { chatService } from "@/services/chatService"
import type { AiTool } from "@/services/chatService"

interface ChatContainerProps {
  variant?: "popup" | "page"
  onClose?: () => void
}

export function ChatContainer({ variant = "page", onClose }: ChatContainerProps) {
  const {
    conversations,
    activeConversationId,
    isLoading,
    setActiveConversationId,
    createConversation,
    deleteConversation,
    sendMessage,
  } = useChatStore()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [available, setAvailable] = useState<boolean>(false)
  const [allowedTools, setAllowedTools] = useState<string[]>([])
  const [availableTools, setAvailableTools] = useState<AiTool[]>([])

  useEffect(() => {
    Promise.all([chatService.isChatAvailable(), chatService.listAvailableTools()])
      .then(([isAvailable, tools]) => {
        setAvailable(isAvailable)
        setAvailableTools(tools)
      })
      .catch(() => setAvailable(false))
  }, [])

  if (available === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-lg font-semibold mb-2">Chat system unavailable</div>
        <div className="text-muted-foreground">The chat API is not enabled or no API key is configured.</div>
      </div>
    )
  }

  const activeConversation = conversations.find((c: any) => c.id === activeConversationId)

  return (
    <div className="relative flex h-full w-full">
      {/* Sidebar overlay */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 z-50 border-r border-border bg-card transition-transform duration-300",
          variant === "popup" ? "w-[200px]" : "w-64",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId || ""}
          onSelectConversation={(id) => {
            setActiveConversationId(id)
            setSidebarOpen(false)
          }}
          onNewChat={createConversation}
          onDeleteConversation={deleteConversation}
          onClose={() => setSidebarOpen(false)}
          variant={variant}
        />
      </div>

      {/* Backdrop */}
      {sidebarOpen && (
        <div className="absolute inset-0 bg-black/50 z-40 transition-opacity" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main chat area */}
      <div className="flex flex-col h-full w-full">
        
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                variant="ghost"
                size="icon"
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5" />
              </Button>
              <h2 className="font-medium truncate">{activeConversation?.name || "Chat"}</h2>
            </div>
            {variant === "popup" && onClose && (
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                aria-label="Close chat"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>


        <div className="flex-1 min-h-0 overflow-y-auto p-2 bg-background">
            <MessageList
              messages={activeConversation?.messages || []}
              isLoading={isLoading}
              variant={variant}
            />
        </div>

        {/* Footer (fixed at bottom inside Card) */}
          <div className="shrink-0">
            <MessageInput
              onSendMessage={(content) => sendMessage(content, allowedTools)}
              allowedTools={allowedTools}
              onAllowedToolsChange={setAllowedTools}
              availableTools={availableTools}
              variant={variant}
            />
          </div>
      </div>
    </div>
  )
}
