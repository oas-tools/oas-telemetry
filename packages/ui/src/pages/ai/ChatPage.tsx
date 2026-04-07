import { ChatContainer } from "@/components/ai/chat-container"
import { ChatProvider } from "@/lib/store/chat"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function ChatPage() {
    return (
        <main className="flex flex-1 flex-col items-center justify-center">
                   <div className="h-[90vh] w-[90vw] sm:w-[60vw] overflow-hidden rounded-lg border">
                    <ChatProvider>
                        <ChatContainer variant="page" />
                    </ChatProvider>
                </div>
        </main>
    )
}
