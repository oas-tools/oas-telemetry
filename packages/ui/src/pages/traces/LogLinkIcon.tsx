import { Logs } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
import { getFrontendBaseName } from "@/services/Backend";

interface LogLinkIconProps {
  traceId: string;
}

// Opens the logs page filtered by traceId in a new tab
export const LogLinkIcon: React.FC<LogLinkIconProps> = ({ traceId }) => {
  if (!traceId) return null;
  const baseName = getFrontendBaseName();
  const url = `${baseName}/logs?traceId=${encodeURIComponent(traceId)}`;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="flex-shrink-0 h-7 w-7 p-0"
      aria-label="Show logs for this trace"
      title="Show logs for this trace in a new tab"
      onClick={e => {
        e.stopPropagation();
        window.open(url, "_blank");
      }}
    >
      <Logs className="h-4 w-4" />
    </Button>
  );
};
