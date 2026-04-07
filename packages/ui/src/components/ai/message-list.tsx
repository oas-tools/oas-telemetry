"use client"

import type { Message } from "@/lib/store/chat"
import { cn } from "@/lib/utils"
import { Bot, MessageCircle, Sparkles, User, Wrench } from "lucide-react"
import { marked } from "marked"
import { useEffect, useRef, useState } from "react"

interface MessageListProps {
  messages: Message[]
  isLoading?: boolean
  variant?: "popup" | "page"
}

function MessageBubble({
  content,
  timestamp,
  isUser,
  variant = "page",
}: {
  content: string
  timestamp: Date
  isUser: boolean
  variant?: "popup" | "page"
}) {
  return (
    <div className={cn(
      "flex items-end gap-2",
      isUser ? "justify-end" : "justify-start"
    )}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full border m-1 p-1 flex items-center justify-center">
          <Bot />
        </div>
      )}
      <div
        className={cn(
          "max-w-[75%] rounded-md px-3 py-1.5 break-words",
          variant === "popup" && "px-2.5 py-1 text-sm max-w-[80%]",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
          "overflow-x-auto" // scroll horizontal si se desborda
        )}
      >
        <div
          className="markdown leading-relaxed break-words"
          dangerouslySetInnerHTML={{ __html: marked.parse(content) }}
        />
        <span className={cn("text-[11px] opacity-60 mt-0.5 block", variant === "popup" && "text-[10px]")}>
          {timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full border m-1 p-1 flex items-center justify-center">
          <User />
        </div>
      )}
    </div>
  )
}

function FunctionCallMessage({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex items-end gap-2 justify-start">
      <div className="flex-shrink-0 w-8 h-8 rounded-full border m-1 p-1 flex items-center justify-center bg-yellow-50 border-yellow-300">
        <Wrench className="text-yellow-900" />
      </div>
      <div className="max-w-[75%] rounded-md px-3 py-1.5 bg-yellow-50 border border-yellow-300 text-yellow-900 sm:text-sm  break-words">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setOpen((v) => !v)}>
          <span>Tools used! </span>
          <button className="ml-auto text-xs underline">{open ? "Hide details" : "Show details"}</button>
        </div>
        {open && (
          <pre className="mt-2 text-xs whitespace-pre-wrap break-words">{content}</pre>
        )}
      </div>
    </div>
  )
}

export function MessageList({ messages, isLoading, variant = "page" }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  return (
    <div className="h-full w-full overflow-y-auto px-4">
      {messages.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-full text-center px-4">
          <div className="space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-muted flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Start a conversation</p>
            <p className="text-xs text-muted-foreground">Type a message below to begin</p>
          </div>
        </div>
      )}
      {/* Message list */}
      <div className="space-y-4">
        {messages.map((message) => {
          if (message.role === "assistant" || message.role === "user") {
            return (
              <MessageBubble
                key={message.id}
                content={message.content}
                timestamp={message.timestamp}
                isUser={message.role === "user"}
                variant={variant}
              />
            )
          }
          if (message.role === "function") {
            return (
              <FunctionCallMessage
                key={message.id}
                content={message.content}
              />
            )
          }
          return null
        })}
        {isLoading && (
          <div className="flex gap-2">
            <div
              className={`flex-shrink-0 rounded-full bg-primary flex items-center justify-center ${variant === "popup" ? "w-6 h-6" : "w-7 h-7"
                }`}
            >
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <div
              className={`bg-muted rounded-md flex items-center gap-1 ${variant === "popup" ? "px-2.5 py-1" : "px-3 py-1.5"
                }`}
            >
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}
