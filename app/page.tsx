import ChartCard from "@/components/ChartCard";
import KpiCard from "@/components/KpiCard";
import {
  getCatalog,
  getIndicatorDefinitions,
  getIndicatorSeries,
  getInternalAggregates,
  getRequestsSummary
} from "@/lib/data";
import { buildIndicatorSummary, buildPillarScores } from "@/lib/indicators";
import { formatValue } from "@/lib/format";

export default async function HomePage() {
  const definitions = await getIndicatorDefinitions();
  const series = await getIndicatorSeries();
  const summaries = definitions.map((def) => buildIndicatorSummary(def, series[def.id] ?? []));
  const pillarScores = buildPillarScores(definitions, series);
  const requestSummary = await getRequestsSummary();
  const catalog = await getCatalog();
  const internalAggregates = await getInternalAggregates();

  const timeAxis = series[definitions[0].id]?.map((point) => point.date) ?? [];
  const topMoves = [...summaries]
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);

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

  const requestOption = {
    tooltip: { trigger: "axis" },
    grid: { left: 12, right: 12, top: 20, bottom: 30, containLabel: true },
    xAxis: { type: "category", data: requestSummary.map((item) => item.category), axisLabel: { rotate: 20 } },
    yAxis: { type: "value" },
    series: [
      {
        type: "bar",
        data: requestSummary.map((item) => item.volume),
        itemStyle: { color: "#008d8f" }
      }
    ]
  };

  return (
    <div>
      <section className="hero panel">
        <div className="hero-grid">
          <div>
            <h2>Citywide Overview</h2>
            <p>
              A consolidated view of Lowell’s transformation signals — tracking housing pressure,
              mobility performance, climate risk, economic momentum, equity gaps, and service outcomes.
            </p>
          </div>
          <div className="hero-metrics">
            <div>
              <div className="stat-label">Internal Ops Pulse</div>
              <div className="stat-value">{internalAggregates.summary.service_level}</div>
            </div>
            <div>
              <div className="stat-label">311 Volume</div>
              <div className="stat-value">
                {internalAggregates.summary["311_total"].toLocaleString()}
              </div>
            </div>
            <div>
              <div className="stat-label">Median Resolution</div>
              <div className="stat-value">
                {internalAggregates.summary.median_resolution_days.toFixed(1)} days
              </div>
            </div>
            <div>
              <div className="stat-label">Permit Cycle Time</div>
              <div className="stat-value">
                {internalAggregates.summary.permit_cycle_median_days} days
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="kpi-grid">
        {summaries.map((summary) => (
          <KpiCard key={summary.id} summary={summary} />
        ))}
      </section>

      <section className="insight-grid">
        {topMoves.map((item) => (
          <div key={item.id} className="insight-card">
            <div className="stat-label">Fastest Shift</div>
            <div className="insight-title">{item.label}</div>
            <div className="insight-value">
              {formatValue(item.latest, item.format)} · {item.trend}
            </div>
            <div className="insight-sub">{item.description}</div>
          </div>
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

      <section className="content-grid" style={{ marginTop: 18 }}>
        <ChartCard
          title="311 Request Volume"
          subtitle="Operational service demand this quarter"
          option={requestOption}
        />
        <div className="panel" style={{ padding: 18 }}>
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

      <section className="panel" style={{ marginTop: 24, padding: 18 }}>
        <h3 className="section-title">Data Provenance</h3>
        <p className="section-subtitle">
          Current refresh cadence and source coverage for Lowell’s indicator framework.
        </p>
        <div className="data-grid">
          {catalog.map((entry) => (
            <div key={entry.id} className="data-card">
              <div className="stat-label">{entry.source}</div>
              <div className="insight-title">{entry.name}</div>
              <div className="insight-sub">Refresh: {entry.refreshCadence}</div>
              <div className="insight-sub">Last updated: {entry.lastUpdated}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
