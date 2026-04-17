import React, { useMemo } from "react";
import Editor from "@monaco-editor/react";

type ChallengeFields = {
  title?: string;
  description?: string;
};

type ReadmeMonacoPanelProps = {
  challenge: ChallengeFields | null;
  omitTabStrip?: boolean;
};

function buildWorkspaceReadme(challenge: ChallengeFields | null): string {
  const title = challenge?.title?.trim() || "Current challenge";
  const description =
    challenge?.description?.trim() ||
    "_No problem statement was returned for this challenge._";

  return `# ${title}

## Problem

${description}

## Lua Documentation
[Lua Documentation](https://www.lua.org/manual/5.4/)
`;
}

function ReadmeMonacoPanel({
  challenge,
  omitTabStrip = false,
}: ReadmeMonacoPanelProps) {
  const markdown = useMemo(
    () => buildWorkspaceReadme(challenge),
    [challenge]
  );

  if (omitTabStrip) {
    return (
      <div className="readme-editor-inner readme-editor-inner--stretch">
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
