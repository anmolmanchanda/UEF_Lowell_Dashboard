"use client";

import ReactECharts from "echarts-for-react";

export default function EChart({ option, height = 260 }: { option: object; height?: number }) {
  return (
    <ReactECharts
      option={option}
      style={{ width: "100%", height }}
      opts={{ renderer: "canvas" }}
    />
  );
}
