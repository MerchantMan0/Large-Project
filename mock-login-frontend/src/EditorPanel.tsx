import React from "react";
import Editor from "@monaco-editor/react";

type EditorPanelProps = {
  code: string;
  onChangeCode: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
};

function EditorPanel({
  code,
  onChangeCode,
  onSubmit,
  loading,
}: EditorPanelProps) {
  return (
    <>
      <h2>Editor</h2>

      <Editor
        height="400px"
        language="lua"
        theme="vs-dark"
        value={code}
        onChange={(value) => onChangeCode(value ?? "")}
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />

      <div style={{ marginTop: "10px" }}>
        <button type="button" onClick={onSubmit} disabled={loading}>
          {loading ? "Running..." : "Submit"}
        </button>
      </div>
    </>
  );
}

export default EditorPanel;
