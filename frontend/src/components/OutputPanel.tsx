import React from "react";

type OutputPanelProps = {
  output: string;
};

function OutputPanel({ output }: OutputPanelProps) {
  return (
    <div className="output-panel-inner">
      <h3 className="output-panel-title">Output</h3>
      <pre className="output-panel-pre">{output}</pre>
    </div>
  );
}

export default OutputPanel;
