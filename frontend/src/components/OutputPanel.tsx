import React from "react";

export type OutputPanelMetrics = {
  gas: number;
  memory_bytes: number;
  lines: number;
};

type OutputPanelProps = {
  output: string;
  metrics: OutputPanelMetrics | null;
};

function formatMemoryBytes(bytes: number): string {
  const n = Number(bytes);
  if (!Number.isFinite(n)) return "—";
  if (n < 1024) return `${n} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb >= 10 ? kb.toFixed(0) : kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function OutputPanel({ output, metrics }: OutputPanelProps) {
  const gasDisplay = metrics != null ? String(metrics.gas) : "—";
  const memoryDisplay =
    metrics != null ? formatMemoryBytes(metrics.memory_bytes) : "—";
  const linesDisplay = metrics != null ? String(metrics.lines) : "—";

  return (
    <div className="output-panel-inner output-panel-inner--tab">
      <div className="output-panel-board">
        <div className="output-panel-metrics-head">
          <div className="account-stats-row output-panel-metrics-row">
            <div className="account-stat-cell">
              <p className="account-stat-value">{gasDisplay}</p>
              <p className="account-stat-label">Gas</p>
            </div>
            <div className="account-stat-cell">
              <p className="account-stat-value">{memoryDisplay}</p>
              <p className="account-stat-label">Memory</p>
            </div>
            <div className="account-stat-cell">
              <p className="account-stat-value">{linesDisplay}</p>
              <p className="account-stat-label">Lines of code</p>
            </div>
          </div>
        </div>
        <pre className="output-panel-pre">{output}</pre>
      </div>
    </div>
  );
}

export default OutputPanel;
