// No React import needed with modern JSX transform

interface MicroChartProps {
  data: number[]; // Array of values for the chart
  color?: string; // Tailwind color class
  height?: number; // Height in pixels
}

export function MicroChart({ data, color = "accent", height = 20 }: MicroChartProps) {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data);
  const normalizedData = data.map(value => (value / maxValue) * 100);

  return (
    <div className={`h-[${height}px] w-full`}>
      <svg className="h-full w-full" viewBox={`0 0 ${data.length * 4} 100`}>
        {/* Background line */}
        <path
          d={`M0 50 Q${data.length * 2} 50 ${data.length * 4} 50`}
          stroke="border/20"
          strokeWidth="1"
          fill="none"
          className="dark:stroke-border/40"
        />
        {/* Chart line */}
        <path
          d={`
            M0 ${100 - normalizedData[0]}
            ${normalizedData.map((value, index) =>
              `L${index * 4} ${100 - value}`
            ).join(' ')}
          `}
          stroke={`var(--color-${color})`}
          strokeWidth="2"
          fill="none"
          className="dark:stroke-[var(--color-${color})]/80"
        />
        {/* Area under the line */}
        <path
          d={`
            M0 100
            ${normalizedData.map((value, index) =>
              `L${index * 4} ${100 - value}`
            ).join(' ')}
            L${(data.length - 1) * 4} 100 Z
          `}
          fill={`var(--color-${color})`}
          fillOpacity="0.1"
          className="dark:fill-[var(--color-${color})]/20"
        />
      </svg>
    </div>
  );
}