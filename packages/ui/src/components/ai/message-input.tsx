"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send } from "lucide-react"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { AiTool } from "@/services/chatService"

interface MessageInputProps {
  onSendMessage: (content: string) => void
  allowedTools: string[]
  onAllowedToolsChange: (tools: string[]) => void
  availableTools: AiTool[]
  variant?: "popup" | "page"
}

export function MessageInput({ onSendMessage, allowedTools, onAllowedToolsChange, availableTools, variant = "page" }: MessageInputProps) {
  const [message, setMessage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSendMessage(message)
      setMessage("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={"p-4 border-t border-border bg-card"}>
      <details className="mb-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none">Tools: {allowedTools.length ? `${allowedTools.length} selected` : "all enabled"}</summary>
        <div className="grid grid-cols-2 gap-1 pt-2">
          {availableTools.map((tool) => (
            <label key={tool.id} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={allowedTools.includes(tool.id)}
                onChange={(event) => onAllowedToolsChange(
                  event.target.checked
                    ? [...allowedTools, tool.id]
                    : allowedTools.filter((selectedTool) => selectedTool !== tool.id),
                )}
              />
              <span>{tool.name}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Info about ${tool.name}`}>
                    <Info className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tool.userDescription}</TooltipContent>
              </Tooltip>
            </label>
          ))}
        </div>
      </details>
      <div className="flex gap-2 items-end">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className={"resize-none max-h-40  pb-1"}
          rows={1}
        />
        <Button
          type="submit"
          size="default"
          className="flex-shrink-0"
          disabled={!message.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </form>
  )
}
