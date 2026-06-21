import React from "react";
import { cn } from "@/lib/utils";

// Lightweight SVG Donut Chart
export function DonutChart({
  data,
  size = 120,
  strokeWidth = 12,
  className,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  if (total === 0) {
    return (
      <svg width={size} height={size} className={className}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={strokeWidth}
        />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} className={cn("transform -rotate-90", className)}>
      {data.map((item) => {
        if (item.value === 0) return null;
        
        const percentage = item.value / total;
        const strokeDasharray = `${percentage * circumference} ${circumference}`;
        const strokeDashoffset = -currentOffset;
        currentOffset += percentage * circumference;

        return (
          <circle
            key={item.label}
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={item.color}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        );
      })}
    </svg>
  );
}

// Lightweight SVG Line/Sparkline Chart
export function Sparkline({
  data,
  width = 300,
  height = 60,
  color = "#7c3aed",
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data, 1); // Avoid div by zero
  const min = Math.min(...data, 0);
  
  const range = max - min;
  const xStep = width / (data.length > 1 ? data.length - 1 : 1);
  
  const points = data.map((val, i) => {
    const x = i * xStep;
    const y = height - ((val - min) / (range || 1)) * height;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;

  // For the gradient area under the line
  const areaPathD = `M 0,${height} L ${points.join(" L ")} L ${width},${height} Z`;

  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox={`0 0 ${width} ${height}`} 
      preserveAspectRatio="none"
      className={cn("overflow-visible", className)}
    >
      <defs>
        <linearGradient id={`sparkline-gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      <path
        d={areaPathD}
        fill={`url(#sparkline-gradient-${color.replace('#', '')})`}
      />
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-sm"
      />
      
      {/* Draw points */}
      {data.map((val, i) => {
        const x = i * xStep;
        const y = height - ((val - min) / (range || 1)) * height;
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="3"
            fill={color}
            stroke="#18181b"
            strokeWidth="2"
          />
        );
      })}
    </svg>
  );
}
