import { ReactNode } from "react";

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const Skeleton = ({ width = "full", height = "2", className = "" }: SkeletonProps) => {
  return (
    <div
      className={[
        width && `w-${width}`,
        height && `h-${height}`,
        "animate-pulse",
        "bg-gray-200",
        "rounded",
        className,
      ].filter(Boolean).join(" ")}
    />
  );
};