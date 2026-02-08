import fs from "node:fs";
import path from "node:path";

const dataDir = path.resolve("/Users/anmolmanchanda/UEF_Lowell_Dashboard/data");
const defs = JSON.parse(fs.readFileSync(path.join(dataDir, "indicator-definitions.json"), "utf-8"));
const series = JSON.parse(fs.readFileSync(path.join(dataDir, "indicator-values.json"), "utf-8"));
const neighborhoods = JSON.parse(fs.readFileSync(path.join(dataDir, "neighborhoods.json"), "utf-8"));

const defIds = new Set(defs.map((def) => def.id));
let ok = true;

for (const def of defs) {
  if (!series[def.id]) {
    console.error(`Missing series for ${def.id}`);
    ok = false;
  }
}

for (const id of Object.keys(series)) {
  if (!defIds.has(id)) {
    console.error(`Series has unknown indicator id ${id}`);
    ok = false;
  }
}

for (const hood of neighborhoods) {
  for (const key of Object.keys(hood.metrics)) {
    if (!defIds.has(key)) {
      console.error(`Neighborhood ${hood.id} has unknown indicator ${key}`);
      ok = false;
    }
  }
}

if (!ok) {
  process.exit(1);
}

console.log("Data validation passed.");
