import HomeLens from "@/components/HomeLens";
import { getIndicatorDefinitions, getIndicatorSeries, getNeighborhoods } from "@/lib/data";
import { buildIndicatorSummary } from "@/lib/indicators";

export default async function HomePage() {
  const definitions = await getIndicatorDefinitions();
  const series = await getIndicatorSeries();
  const summaries = definitions.map((def) => buildIndicatorSummary(def, series[def.id] ?? []));
  const neighborhoods = await getNeighborhoods();

  return (
    <div>
      <HomeLens indicators={definitions} summaries={summaries} neighborhoods={neighborhoods} />
    </div>
  );
}
