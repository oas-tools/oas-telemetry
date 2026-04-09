import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
import { getFrontendBaseName } from "@/services/Backend";

interface TraceLinkIconProps {
  traceId: string;
}

// Opens the traces page filtered by traceId in a new tab
export const TraceLinkIcon: React.FC<TraceLinkIconProps> = ({ traceId }) => {
  if (!traceId) return null;
  const baseName = getFrontendBaseName();
  const url = `${baseName}/traces?traceId=${encodeURIComponent(traceId)}`;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="flex-shrink-0 h-7 w-7 p-0"
      aria-label="Show trace for this log"
      title="Show trace for this log in a new tab"
      onClick={e => {
        e.stopPropagation();
        window.open(url, "_blank");
      }}
    >
      <Activity className="h-4 w-4" />
    </Button>
  );
};
