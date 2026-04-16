import React from "react";

type OutputPanelProps = {
  output: string;
};

function OutputPanel({ output }: OutputPanelProps) {
  return (
    <>
      <h3>Output:</h3>

      <pre
        style={{
          background: "#111",
          color: "#0f0",
          padding: "10px",
          height: "150px",
          overflowY: "auto",
        }}
      >
        {output}
      </pre>
    </>
  );
}

export default OutputPanel;
