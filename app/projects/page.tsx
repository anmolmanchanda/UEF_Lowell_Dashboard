import ChartCard from "@/components/ChartCard";
import { getProjects } from "@/lib/data";

export default async function ProjectsPage() {
  const projects = await getProjects();
  const statusCounts = projects.reduce<Record<string, number>>((acc, project) => {
    acc[project.status] = (acc[project.status] ?? 0) + 1;
    return acc;
  }, {});

  const statusOption = {
    tooltip: { trigger: "item" },
    legend: { bottom: 0 },
    series: [
      {
        name: "Project Status",
        type: "pie",
        radius: ["35%", "70%"],
        data: Object.entries(statusCounts).map(([status, value]) => ({
          name: status,
          value
        }))
      }
    ]
  };

  return (
    <div>
      <section className="hero panel">
        <h2>Project & Experiment Tracker</h2>
        <p>
          Track the Frontrunner lifecycle across departments. Each initiative is tied to outcomes,
          funding, and the indicators it is expected to move.
        </p>
      </section>

      <section className="content-grid" style={{ marginTop: 18 }}>
        <ChartCard title="Lifecycle Distribution" subtitle="Explore → Commercialize" option={statusOption} />
        <div className="panel" style={{ padding: 18 }}>
          <h3 className="section-title">Portfolio Snapshot</h3>
          <p className="section-subtitle">Active initiatives across Lowell departments.</p>
          <div className="kpi-grid" style={{ marginTop: 12 }}>
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="kpi-card">
                <div style={{ fontSize: 12, color: "var(--muted)" }}>{status}</div>
                <strong>{count}</strong>
                <span className={`tag ${status.toLowerCase()}`}>{status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 24, padding: 18 }}>
        <h3 className="section-title">Active Programs</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Department</th>
              <th>Status</th>
              <th>Budget (M)</th>
              <th>Timeline</th>
              <th>Outcome Focus</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id}>
                <td>
                  <strong>{project.name}</strong>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{project.notes}</div>
                </td>
                <td>{project.department}</td>
                <td>
                  <span className={`tag ${project.status.toLowerCase()}`}>{project.status}</span>
                </td>
                <td>{project.budget.toFixed(1)}</td>
                <td>{project.timeline}</td>
                <td>{project.outcome}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
