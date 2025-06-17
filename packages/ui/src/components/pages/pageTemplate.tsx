
import { TelemetryHeader } from "@/components/pages/telemetry-header";
import { Footer } from "./footer";
import type { ReactNode } from "react";


interface PageTemplateProps {
  children: ReactNode;
  activeTab?: string;
}

export default function PageTemplate({ children, activeTab }: PageTemplateProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TelemetryHeader activeTab={activeTab} />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
