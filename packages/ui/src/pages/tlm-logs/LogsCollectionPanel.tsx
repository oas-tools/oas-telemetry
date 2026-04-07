import React, { useMemo } from "react"
import { logsService } from "@/services/logService"
import CollectionPanel from "@/components/CollectionPanel"

interface Props {
  onLogsReset?: () => void
}

const LogsCollectionPanel: React.FC<Props> = ({ onLogsReset }) => {
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
    <CollectionPanel
      service={adaptedService}
      resourceType="logs"
      onDownload={() => {
        logsService.download()
        return Promise.resolve()
      }}
      onImport={(file, options) => logsService.import(file, options)}
      onReset={onLogsReset}
    />
  )
}

export default LogsCollectionPanel
