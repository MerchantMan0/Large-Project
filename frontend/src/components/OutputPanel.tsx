import React from "react";

type OutputPanelProps = {
  output: string;
};

function OutputPanel({ output }: OutputPanelProps) {
  return (
    <div className="output-panel-inner output-panel-inner--tab">
      <pre className="output-panel-pre">{output}</pre>
    </div>
  );
}

export default OutputPanel;
