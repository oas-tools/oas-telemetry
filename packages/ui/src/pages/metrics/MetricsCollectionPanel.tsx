import React, { useMemo } from "react"
import { metricsService } from "@/services/metricsService"
import CollectionPanel from "@/components/CollectionPanel"

interface Props {
  onMetricsReset?: () => void
}

const MetricsCollectionPanel: React.FC<Props> = ({ onMetricsReset }) => {
  const adaptedService = useMemo(
    () => ({
      getStatus: () => metricsService.getStatus(),
      startCollection: () => metricsService.startCollection(),
      stopCollection: () => metricsService.stopCollection(),
      resetCollection: () => metricsService.resetMetrics(),
      setRetentionTime: (seconds: number) => metricsService.setRetentionTime(seconds),
      getRetentionTime: () => metricsService.getRetentionTime(),
    }),
    []
  )

  return (
    <CollectionPanel
      service={adaptedService}
      resourceType="metrics"
      onDownload={() => {
        metricsService.download()
        return Promise.resolve()
      }}
      onImport={(file, options) => metricsService.import(file, options)}
      onReset={onMetricsReset}
    />
  )
}

export default MetricsCollectionPanel
