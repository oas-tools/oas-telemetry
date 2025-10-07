import backend from "./Backend";

export type Message = {
  role: string;
  content: string;
  timestamp: string;
};

export type Conversation = {
  id: string;
  name?: string;
};

export interface ConversationHistory {
  messages: Message[];
  name?: string;
}

class ChatService {
  async createConversation(): Promise<{ id: string }> {
    const res = await backend.post("/ai/chat");
    return res.data;
  }

  async sendMessage(conversationId: string, content: string): Promise<Message[]> {
    const res = await backend.post(`/ai/chat/${conversationId}/message`, {
      role: "user",
      content,
    });
    return res.data;
  }

  async getConversationHistory(conversationId: string): Promise<ConversationHistory> {
    const res = await backend.get(`/ai/chat/${conversationId}`);
    return res.data;
  }

  async listConversations(): Promise<Conversation[]> {
    const res = await backend.get("/ai/chat");
    // Expecting array of { id, title }
    return res.data;
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await backend.delete(`/ai/chat/${conversationId}`);
  }

  async renameConversation(conversationId: string, title: string): Promise<void> {
    await backend.patch(`/ai/chat/${conversationId}`, { title });
  }

  async isChatAvailable(): Promise<boolean> {
    try {
      await backend.get("/ai/chat/health");
      return true;
    } catch {
      return false;
    }
  }
}

export const chatService = new ChatService();
