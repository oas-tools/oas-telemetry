"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
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
  sendMessage: (content: string) => Promise<void>
}

const ChatContext = createContext<ChatStore | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

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
      setIsLoading(false)
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
      console.error("Failed to delete conversation:", error)
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

  const sendMessage = async (content: string) => {
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
    // Espera la respuesta del backend y agrega los mensajes recibidos
    const messages = await chatService.sendMessage(conversationId, content)
    const formattedMessages = messages.map((m: ServiceMessage, idx: number) => ({
      id: `${conversationId}-${Date.now()}-${idx}`,
      role: m.role,
      content: m.content,
      timestamp: new Date(m.timestamp),
    }))
    // Obtiene el nombre actualizado de la conversación si no lo tiene
    const history = await chatService.getConversationHistory(conversationId)
    setConversations((previousConversations) => {
      return previousConversations.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              name: history.name ?? c.name ?? "Chat-" + c.id.slice(0, 4),
              messages: [...c.messages, ...formattedMessages],
            }
          : c,
      )
    })
    setIsLoading(false)
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
