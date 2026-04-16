import React, { useMemo } from "react";
import Editor from "@monaco-editor/react";

type ChallengeFields = {
  title?: string;
  description?: string;
};

type ReadmeMonacoPanelProps = {
  challenge: ChallengeFields | null;
};

function buildWorkspaceReadme(challenge: ChallengeFields | null): string {
  const title = challenge?.title?.trim() || "Current challenge";
  const description =
    challenge?.description?.trim() ||
    "_No problem statement was returned for this challenge._";

  return `# ${title}

## Problem

${description}

---

## How to use this workspace

- Your **solution** lives in the editor on the right (start from \`solution.lua\` or open new tabs with **+**).
- This **README** is read-only reference while you work.
- Click **Submit** to send the **active tab** source to the server for the loaded challenge.

### Lua quick start

\`\`\`lua
-- Example: print to stdout (shown in Output after submit)
print("Hello from Lua")
\`\`\`
`;
}

function ReadmeMonacoPanel({ challenge }: ReadmeMonacoPanelProps) {
  const markdown = useMemo(
    () => buildWorkspaceReadme(challenge),
    [challenge]
  );

  return (
    <div className="readme-editor-inner">
      <div className="readme-editor-tabstrip" aria-hidden>
        <span className="readme-editor-tab">README.md</span>
      </div>
      <div className="readme-monaco-wrap">
        <Editor
          height="100%"
          language="markdown"
          theme="vs-dark"
          value={markdown}
          options={{
            readOnly: true,
            domReadOnly: true,
            fontSize: 14,
            minimap: { enabled: false },
            wordWrap: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            lineNumbers: "on",
            glyphMargin: false,
            folding: true,
          }}
        />
      </div>
    </div>
  );
}

export default ReadmeMonacoPanel;
