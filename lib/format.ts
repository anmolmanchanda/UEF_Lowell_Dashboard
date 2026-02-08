export function formatValue(value: number, format: string) {
  switch (format) {
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0
      }).format(value);
    case "percent":
      return `${value.toFixed(1)}%`;
    case "minutes":
      return `${value.toFixed(1)} min`;
    case "days":
      return `${value.toFixed(1)} days`;
    case "rate":
      return `${value.toFixed(0)}`;
    case "ratio":
      return value.toFixed(1);
    case "index":
      return value.toFixed(1);
    case "count":
      return new Intl.NumberFormat("en-US").format(value);
    default:
      return value.toString();
  }
}

export function formatDelta(value: number, format: string) {
  const sign = value > 0 ? "+" : "";
  if (format === "percent") {
    return `${sign}${value.toFixed(1)}%`;
  }
  if (format === "currency") {
    return `${sign}${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0
    }).format(value)}`;
  }
  if (format === "minutes" || format === "days" || format === "count" || format === "rate") {
    return `${sign}${value.toFixed(1)}`;
  }
  return `${sign}${value.toFixed(2)}`;
}
