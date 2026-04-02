import { useRef, useEffect } from "react";

export default function UplotDemoReact() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Dynamically import uPlot for React usage
    import("uplot").then(({ default: uPlot }) => {
      let xs = Array.from({ length: 30 }, (_, i) => i + 1);
      let vals = Array.from({ length: 21 }, (_, i) => i - 10);
      let data = [
        xs,
        xs.map(() => vals[Math.floor(Math.random() * vals.length)]),
        xs.map(() => vals[Math.floor(Math.random() * vals.length)]),
        xs.map(() => vals[Math.floor(Math.random() * vals.length)]),
      ];

      const opts = {
        width: 800,
        height: 300,
        title: "uPlot Demo React",
        scales: {
          x: {
            time: false,
          },
        },
        series: [
          {},
          { stroke: "red", fill: "rgba(255,0,0,0.1)" },
          { stroke: "green", fill: "rgba(0,255,0,0.1)" },
          { stroke: "blue", fill: "rgba(0,0,255,0.1)" },
        ],
      };

      // Clean up previous chart if any
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
      chartRef.current = new uPlot(opts, data, containerRef.current);
    });
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ marginTop: 32 }}>
      <div ref={containerRef} />
      <div style={{ fontSize: 12, color: '#888', marginTop: 8 }}>
        This is a uPlot chart rendered in a React component. Selection should work as in the official demo.
      </div>
    </div>
  );
}
