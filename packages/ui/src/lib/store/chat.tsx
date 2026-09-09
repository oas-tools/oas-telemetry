"use client"

import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react"
import { chatService, type Message as ServiceMessage, type Conversation as ServiceConversation } from "@/services/chatService"
import { toast } from "sonner"

export interface Message {
  id: string
  role: string
  content: string
  timestamp: Date
}

export interface Conversation {
  id: string
  name?: string
  messages: Message[]
}

interface ChatStore {
  conversations: Conversation[]
  activeConversationId: string | null
  isLoading: boolean
  setActiveConversationId: (id: string) => void
  createConversation: () => Promise<string>
  deleteConversation: (id: string) => Promise<void>
  sendMessage: (content: string, allowedTools?: string[]) => Promise<void>
}

const ChatContext = createContext<ChatStore | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const isSendingRef = useRef(false)

  // Load conversations from backend
  useEffect(() => {
    async function loadConversations() {
      const convs = await chatService.listConversations()
      const formatted = convs.map((c: ServiceConversation) => ({
        id: c.id,
        name: c.name ?? "Chat-" + c.id.slice(0, 4),
        messages: [],
      }))
      setConversations(formatted)
      if (formatted.length > 0) {
        setActiveConversationId(formatted[0].id)
      }
    }
    loadConversations()
  }, [])

  // Load messages for active conversation
  useEffect(() => {
    async function loadMessages() {
      if (!activeConversationId) return
      setIsLoading(true)
      try {
        const history = await chatService.getConversationHistory(activeConversationId)
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId
              ? {
                  ...c,
                  messages: history.messages.map((m: ServiceMessage, idx: number) => ({
                    id: `${activeConversationId}-${idx}`,
                    role: m.role,
                    content: m.content,
                    timestamp: new Date(m.timestamp),
                  })),
                }
              : c,
          ),
        )
      } finally {
        if (!isSendingRef.current) setIsLoading(false)
      }
    }
    if (activeConversationId) loadMessages()
  }, [activeConversationId])

  const createConversation = async () => {
    const res = await chatService.createConversation()
    const newConversation: Conversation = {
      id: res.id,
      messages: [],
    }
    setConversations((prev) => [...prev, newConversation])
    setActiveConversationId(newConversation.id)
    return newConversation.id // <-- return id for immediate use
  }

  const deleteConversation = async (id: string) => {
    try {
    await chatService.deleteConversation(id)
    } catch (error) {
      //
      toast.error("Failed to delete conversation")
      return
    }
    const filtered = conversations.filter((c) => c.id !== id)
    setConversations(filtered)
    if (activeConversationId === id && filtered.length > 0) {
      setActiveConversationId(filtered[0].id)
    } else if (filtered.length === 0) {
      setActiveConversationId(null)
    }
  }

  const sendMessage = async (content: string, allowedTools: string[] = []) => {
    isSendingRef.current = true
    let conversationId = activeConversationId
    if (!conversationId) {
      conversationId = (await createConversation())
    }
    // Agrega el mensaje del usuario inmediatamente
    const userMessage = {
      id: `${conversationId}-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date(),
    }
    setConversations((previousConversations) => {
      const exists = previousConversations.some((conv) => conv.id === conversationId)
      if (exists) {
        return previousConversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages: [...c.messages, userMessage],
              }
            : c,
        )
      } else {
        return previousConversations
      }
    })
    setActiveConversationId(conversationId)
    setIsLoading(true)
    let polling = true
    const poll = window.setInterval(async () => {
      const polledConversationId = conversationId
      try {
        const history = await chatService.getConversationHistory(polledConversationId!)
        if (!polling || polledConversationId !== conversationId) return
        setConversations((previousConversations) => previousConversations.map((c) =>
          c.id === polledConversationId
            ? {
                ...c,
                name: history.name ?? c.name ?? "Chat-" + c.id.slice(0, 4),
                messages: history.messages.map((m: ServiceMessage, idx: number) => ({
                  id: `${polledConversationId}-${idx}`,
                  role: m.role,
                  content: m.content ?? "",
                  timestamp: new Date(m.timestamp),
                })),
              }
            : c,
        ))
      } catch {
        // The final request handles errors.
      }
    }, 500)
    try {
      try {
        await chatService.sendMessage(conversationId, content, allowedTools)
      } catch (error: any) {
        // Conversations live in memory and disappear after a backend restart.
        if (error.response?.status !== 404) throw error

        const oldConversationId = conversationId
        const freshConversation = await chatService.createConversation()
        const newConversationId = freshConversation.id
        conversationId = newConversationId
        setConversations((previousConversations) => [
          ...previousConversations
            .map((c) => c.id === oldConversationId
              ? { ...c, messages: c.messages.filter((m) => m.id !== userMessage.id) }
              : c),
          { id: newConversationId, messages: [{ ...userMessage, id: `${newConversationId}-${Date.now()}` }] },
        ])
        setActiveConversationId(conversationId)
        await chatService.sendMessage(conversationId, content, allowedTools)
      }

      const history = await chatService.getConversationHistory(conversationId)
      setConversations((previousConversations) => previousConversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              name: history.name ?? c.name ?? "Chat-" + c.id.slice(0, 4),
              messages: history.messages.map((m: ServiceMessage, idx: number) => ({
                id: `${conversationId}-${idx}`,
                role: m.role,
                content: m.content ?? "",
                timestamp: new Date(m.timestamp),
              })),
            }
        : c,
      ))
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Could not send the message. Please check that the backend is available.")
    } finally {
      polling = false
      window.clearInterval(poll)
      isSendingRef.current = false
      setIsLoading(false)
    }
  }

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversationId,
        isLoading,
        setActiveConversationId,
        createConversation,
        deleteConversation,
        sendMessage,
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChatStore() {
  const context = useContext(ChatContext)
  if (!context) {
    throw new Error("useChatStore must be used within ChatProvider")
  }
  return context
}
