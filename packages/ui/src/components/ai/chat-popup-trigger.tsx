"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChatContainer } from "./chat-container"
import { cn } from "@/lib/utils"
import { MessageSquare, X } from "lucide-react"

export function ChatPopupTrigger() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Popup Container */}
      {isOpen && (
        <div className="h-[80vh] w-[90vw] sm:w-[33rem] overflow-hidden fixed bottom-20 right-4 z-50 animate-in slide-in-from-bottom-4 md:bottom-24 md:right-6 rounded-lg border bg-background shadow-lg">
          <ChatContainer variant="popup" onClose={() => setIsOpen(false)} />
        </div>
      )}

      {/* Trigger Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className={cn(
          "fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg transition-all hover:scale-105 z-40",
          "md:bottom-6 md:right-6",
          isOpen && "rotate-90",
        )}
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <MessageSquare className="w-6 h-6" />
        )}
      </Button>
    </>
  )
}
