import ChartCard from "@/components/ChartCard";
import KpiCard from "@/components/KpiCard";
import { getIndicatorDefinitions, getIndicatorSeries, getRequestsSummary } from "@/lib/data";
import { buildIndicatorSummary, buildPillarScores } from "@/lib/indicators";

export default function HomePage() {
  const definitions = getIndicatorDefinitions();
  const series = getIndicatorSeries();
  const summaries = definitions.map((def) => buildIndicatorSummary(def, series[def.id] ?? []));
  const pillarScores = buildPillarScores(definitions, series);
  const requestSummary = getRequestsSummary();

  const timeAxis = series[definitions[0].id]?.map((point) => point.date) ?? [];

  const momentumOption = {
    tooltip: { trigger: "axis" },
    legend: { bottom: 0 },
    grid: { left: 12, right: 12, top: 20, bottom: 40, containLabel: true },
    xAxis: { type: "category", data: timeAxis, boundaryGap: false },
    yAxis: { type: "value" },
    series: [
      {
        name: "Median Rent",
        type: "line",
        data: series.median_rent?.map((point) => point.value) ?? [],
        smooth: true
      },
      {
        name: "Unemployment",
        type: "line",
        data: series.unemployment_rate?.map((point) => point.value) ?? [],
        smooth: true
      },
      {
        name: "Heat Days",
        type: "line",
        data: series.extreme_heat_days?.map((point) => point.value) ?? [],
        smooth: true
      },
      {
        name: "311 Resolution",
        type: "line",
        data: series.response_time_311?.map((point) => point.value) ?? [],
        smooth: true
      }
    ]
  };

  const pillarOption = {
    tooltip: { trigger: "axis" },
    grid: { left: 12, right: 12, top: 20, bottom: 20, containLabel: true },
    xAxis: {
      type: "category",
      data: pillarScores.map((score) => score.pillar),
      axisLabel: { rotate: 20 }
    },
    yAxis: { type: "value", max: 100 },
    series: [
      {
        name: "Pillar Score",
        type: "bar",
        data: pillarScores.map((score) => score.score),
        itemStyle: { color: "#0b3d91" }
      }
    ]
  };

  return (
    <div>
      <section className="hero panel">
        <h2>Citywide Overview</h2>
        <p>
          A consolidated view of Lowell’s transformation signals — tracking housing pressure, mobility
          performance, climate risk, economic momentum, equity gaps, and service outcomes.
        </p>
      </section>

      <section className="kpi-grid">
        {summaries.map((summary) => (
          <KpiCard key={summary.id} summary={summary} />
        ))}
      </section>

      <section className="content-grid">
        <ChartCard
          title="Indicator Momentum"
          subtitle="Quarterly movement across flagship KPIs"
          option={momentumOption}
        />
        <ChartCard
          title="Transformation Pillar Balance"
          subtitle="Normalized score by pillar (0–100)"
          option={pillarOption}
        />
      </section>

      <section style={{ marginTop: 24 }} className="panel">
        <div style={{ padding: 18 }}>
          <h3 className="section-title">Operational Signals (311)</h3>
          <p className="section-subtitle">
            Service response trends indicate where frontline capacity is strained.
          </p>
          <table className="table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Quarter Volume</th>
                <th>Median Resolution (days)</th>
              </tr>
            </thead>
            <tbody>
              {requestSummary.map((item) => (
                <tr key={item.category}>
                  <td>{item.category}</td>
                  <td>{item.volume}</td>
                  <td>{item.medianResolutionDays}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
