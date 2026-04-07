import React, { useMemo } from "react"
import { logsService } from "@/services/logService"
import CollectionControlPanel from "@/components/CollectionControlPanel"

interface Props {
  onLogsReset?: () => void
}

const LogsCollectionPanel: React.FC<Props> = ({ onLogsReset }) => {
  // Adapt logsService to the CollectionService interface - memoized to prevent unnecessary re-renders
  const adaptedService = useMemo(
    () => ({
      getStatus: () => logsService.getStatus(),
      startCollection: () => logsService.startCollection(),
      stopCollection: () => logsService.stopCollection(),
      resetCollection: () => logsService.resetLogs(),
      setRetentionTime: (seconds: number) => logsService.setRetentionTime(seconds),
      getRetentionTime: () => logsService.getRetentionTime(),
    }),
    []
  )

  return (
    <CollectionControlPanel
      service={adaptedService}
      resourceType="logs"
      onReset={onLogsReset}
    />
  )
}

export default LogsCollectionPanel
