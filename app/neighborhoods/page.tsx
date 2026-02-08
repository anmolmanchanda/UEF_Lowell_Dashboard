import NeighborhoodExplorer from "@/components/NeighborhoodExplorer";
import { getIndicatorDefinitions, getNeighborhoods } from "@/lib/data";

export default function NeighborhoodsPage() {
  const indicators = getIndicatorDefinitions();
  const neighborhoods = getNeighborhoods();

  return (
    <div>
      <section className="hero panel">
        <h2>Neighborhood Explorer</h2>
        <p>
          Drill into Lowell’s neighborhood patterns using indicator slices, localized service signals,
          and spatial overlays. This view is optimized for internal planning and rapid response.
        </p>
      </section>

      <div style={{ marginTop: 18 }}>
        <NeighborhoodExplorer indicators={indicators} neighborhoods={neighborhoods} />
      </div>
    </div>
  );
}
