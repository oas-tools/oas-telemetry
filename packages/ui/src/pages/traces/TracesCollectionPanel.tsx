import React, { useMemo } from "react"
import { traceService } from "@/services/traceService"
import CollectionPanel from "@/components/CollectionPanel"

interface Props {
  onTracesReset?: () => void
}

const TracesCollectionPanel: React.FC<Props> = ({ onTracesReset }) => {
  const adaptedService = useMemo(
    () => ({
      getStatus: () => traceService.getStatus(),
      startCollection: () => traceService.startCollection(),
      stopCollection: () => traceService.stopCollection(),
      resetCollection: () => traceService.resetTraces(),
      setRetentionTime: (seconds: number) => traceService.setRetentionTime(seconds),
      getRetentionTime: () => traceService.getRetentionTime(),
    }),
    []
  )

  return (
    <CollectionPanel
      service={adaptedService}
      resourceType="traces"
      onDownload={() => {
        traceService.download()
        return Promise.resolve()
      }}
      onImport={(file, options) => traceService.import(file, options)}
      onReset={onTracesReset}
    />
  )
}

export default TracesCollectionPanel
