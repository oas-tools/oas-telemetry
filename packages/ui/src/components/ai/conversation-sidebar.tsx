"use client"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Conversation } from "@/lib/chat-store"
import { cn } from "@/lib/utils"
import { MessageSquare, Trash2, Menu, Plus } from "lucide-react"

interface ConversationSidebarProps {
  conversations: Conversation[]
  activeConversationId: string
  onSelectConversation: (id: string) => void
  onNewChat: () => void
  onDeleteConversation: (id: string) => void
  onClose: () => void
  variant?: "popup" | "page"
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onClose,
  variant = "page",
}: ConversationSidebarProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header, visually matches chat header */}
      <div className={cn(
        "flex items-center gap-2 p-3 border-b border-border bg-card",
        variant === "popup" && "p-2"
      )}>
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
        <h3 className="font-medium text-sm truncate">Conversations</h3>
      </div>

      {/* New Chat button below header */}
      <div className={cn("p-3 border-b border-border", variant === "popup" && "p-2")}>
        <Button
          onClick={async () => {
            await onNewChat()
            onClose()
          }}
          className="w-full justify-start gap-2"
          size="default"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">New Chat</span>
        </Button>
      </div>

      {/* Conversation list */}
      <ScrollArea className="flex-1">
        <div className={cn("p-2 space-y-1", variant === "popup" && "p-1")}>
          {conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={cn(
                "group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors",
                variant === "popup" && "px-2 py-1.5 text-sm",
                activeConversationId === conversation.id
                  ? "bg-accent text-accent-foreground"
                  : "hover:bg-accent/50 text-foreground",
              )}
              onClick={() => onSelectConversation(conversation.id)}
            >
              <MessageSquare className="w-4 h-4" />
              <span
                className={cn("flex-1 truncate text-sm max-w-[10rem]", variant === "popup" && "max-w-[7rem]")}
              >
                {conversation.name ?? conversation.id}
              </span>
              <Button
                key={`delete-${conversation.id}`}
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteConversation(conversation.id)
                }}
                variant="outline"
                size="sm"
                aria-label="Delete conversation"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
