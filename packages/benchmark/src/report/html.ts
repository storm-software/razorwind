/* -------------------------------------------------------------------

                    🗲 Storm Software - Razorwind

 This code was released as part of the Razorwind project. Razorwind
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/razorwind.

 Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/razorwind
 Documentation:            https://docs.stormsoftware.com/projects/razorwind
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

import type { BenchmarkRun, DimensionName } from "../types";
import { renderResults } from "./json";

const DIMENSIONS: DimensionName[] = [
  "imports",
  "apiFidelity",
  "tokenDiscipline",
  "a11yStatic",
  "compile",
  "judgment"
];

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeEmbeddedJson(value: string): string {
  return value
    .replaceAll("&", "\\u0026")
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}

function score(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function renderReportHtml(run: BenchmarkRun): string {
  const availableDimensions = DIMENSIONS.filter(dimension =>
    run.cells.some(result =>
      result.dimensions.some(item => item.dimension === dimension)
    )
  );
  const header = availableDimensions
    .map(dimension => `<th scope="col">${escapeHtml(dimension)}</th>`)
    .join("");
  const rows = run.cells
    .map(result => {
      const byDimension = new Map(
        result.dimensions.map(item => [item.dimension, item])
      );
      const dimensionCells = availableDimensions
        .map(dimension => {
          const item = byDimension.get(dimension);

          return `<td>${item && item.applicable !== false ? score(item.score) : "—"}</td>`;
        })
        .join("");

      return `<tr><th scope="row">${escapeHtml(result.cell.id)}</th><td>${escapeHtml(result.cell.agent)}</td><td>${escapeHtml(result.cell.model)}</td><td>${escapeHtml(result.cell.context)}</td><td>${escapeHtml(result.cell.taskId)}</td><td>${result.cell.repetition}</td><td>${score(result.score)}</td><td><span class="gate ${result.gate}">${result.gate}</span></td>${dimensionCells}</tr>`;
    })
    .join("\n");
  const embedded = escapeEmbeddedJson(renderResults(run));

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Razorwind benchmark — ${escapeHtml(run.packageName)}</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
    body { margin: 2rem; } .table-wrap { overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #8888; padding: .45rem .6rem; text-align: left; white-space: nowrap; }
    thead { background: #8882; } .gate { font-weight: 700; text-transform: uppercase; }
    .pass { color: #188038; } .review { color: #b06000; } .fail { color: #c5221f; }
  </style>
</head>
<body>
  <main>
    <h1>Razorwind benchmark</h1>
    <p>${escapeHtml(run.packageName)} · ${escapeHtml(run.profile)}</p>
    <div class="table-wrap">
      <table aria-label="Benchmark results">
        <thead><tr><th scope="col">Cell</th><th scope="col">Agent</th><th scope="col">Model</th><th scope="col">Context</th><th scope="col">Task</th><th scope="col">Run</th><th scope="col">Score</th><th scope="col">Gate</th>${header}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </main>
  <script type="application/json" id="benchmark-results">${embedded}</script>
</body>
</html>
`;
}
