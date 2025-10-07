import { TelemetryHeader } from "@/components/pages/telemetry-header";
import { Footer } from "./footer";
import type { ReactNode } from "react";
import { ChatPopupTrigger } from "@/components/ai/chat-popup-trigger"
import { ChatProvider } from "@/lib/chat-store"
import { useLocation } from "react-router-dom"


interface PageTemplateProps {
  children: ReactNode;
  activeTab?: string;
  showFooter?: boolean;
}

export default function PageTemplate({ children, activeTab, showFooter = true }: PageTemplateProps) {
  const location = useLocation()
  const isChatPage = location.pathname.includes("/chat")

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TelemetryHeader activeTab={activeTab} />
      <ChatProvider>
        <main className="flex-1 flex flex-col">{children}</main>
        {!isChatPage && <ChatPopupTrigger />}
      </ChatProvider>
      {showFooter && <Footer />}
    </div>
  );
}
