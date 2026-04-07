import React, { useMemo } from "react"
import { traceService } from "@/services/traceService"
import CollectionControlPanel from "@/components/CollectionControlPanel"

interface Props {
  onTracesReset?: () => void
}

const TracesCollectionPanel: React.FC<Props> = ({ onTracesReset }) => {
  // Adapt traceService to the CollectionService interface - memoized to prevent unnecessary re-renders
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
    <CollectionControlPanel
      service={adaptedService}
      resourceType="traces"
      onReset={onTracesReset}
    />
  )
}

export default TracesCollectionPanel
