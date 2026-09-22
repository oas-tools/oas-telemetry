import { TelemetryHeader } from "@/components/pages/telemetry-header";
import { Footer } from "./footer";
import type { ReactNode } from "react";
import { ChatPopupTrigger } from "@/components/ai/chat-popup-trigger"
import { ChatProvider } from "@/lib/store/chat"
import { useLocation } from "react-router-dom"
import { useCapabilities } from "@/context/CapabilitiesContext"


interface PageTemplateProps {
  children: ReactNode;
  activeTab?: string;
  showFooter?: boolean;
}

function MainContent({ children }: { children: ReactNode }) {
  return <main className="flex-1 flex flex-col">{children}</main>
}

export default function PageTemplate({ children, activeTab, showFooter = true }: PageTemplateProps) {
  const location = useLocation()
  const isChatPage = location.pathname.includes("/chat")
  const { ai: aiEnabled } = useCapabilities()

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TelemetryHeader activeTab={activeTab} />
      {aiEnabled ? (
        <ChatProvider>
          <MainContent>{children}</MainContent>
          {!isChatPage && <ChatPopupTrigger />}
        </ChatProvider>
      ) : (
        <MainContent>{children}</MainContent>
      )}
      {showFooter && <Footer />}
    </div>
  );
}
