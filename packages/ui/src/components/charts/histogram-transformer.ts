// Transforma los datos del histograma a formato para TimeSeriesChart
// Devuelve: { xData, seriesData, seriesConfig }
export function transformHistogramToLineSeries(series: any[]) {
  // TODO: El filtrado de rango para histogramas se hace en el frontend por ahora.
  // Cuando el backend filtre correctamente por rango, eliminar este filtro de aquí y del metrics-page.
  const s = series[0]; // simplificación: una serie
  const xData = s.endTimes.map((t: number) => t / 1_000_000); // ns → ms
  const boundaries = s.values[0].buckets.boundaries;
  const bucketCount = boundaries.length;
  // Series por bucket
  const bucketSeries = Array.from({ length: bucketCount }, (_, b: number) =>
    s.values.map((v: any) => v.buckets.counts[b] ?? null)
  );
  // Series min, max, countTotal
  const minSeries = s.values.map((v: any) => v.min ?? null);
  const maxSeries = s.values.map((v: any) => v.max ?? null);
  const countTotalSeries = s.values.map((v: any) => v.count ?? null);

  // Estructura para TimeSeriesChart
  // data: [xData, ...series]
  const data = [xData, ...bucketSeries, minSeries, maxSeries, countTotalSeries];
  // Configuración de series
  const seriesConfig = [
    ...boundaries.map((b: number, i: number) => ({
      id: `bucket_${i}`,
      label: `Bucket ${b}`,
    })),
    { id: "min", label: "Min", color: "#2e7d32" },
    { id: "max", label: "Max", color: "#c62828" },
    { id: "countTotal", label: "Count", color: "#1565c0" },
  ];
  return { xData, data, seriesConfig };
}
export function transformOtelHistogramToHeatmap(series: any[]) {
  const s = series[0]; // simplificación: una serie

  const xData = s.endTimes.map((t: number) => t / 1e9); // ns → seconds

  const boundaries = s.values[0].buckets.boundaries;
  const bucketCount = boundaries.length;

  // matrix[y][x]
  const matrix = Array.from({ length: bucketCount }, () =>
    Array(xData.length).fill(0)
  );

  for (let i = 0; i < s.values.length; i++) {
    const counts = s.values[i].buckets.counts;

    for (let b = 0; b < bucketCount; b++) {
      matrix[b][i] = counts[b] || 0;
    }
  }

  return {
    xData,
    matrix,
    boundaries,
    raw: s.values,
  };
}