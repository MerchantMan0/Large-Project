import React from "react";
import * as Tabs from "@radix-ui/react-tabs";
import Editor from "@monaco-editor/react";

export type EditorTab = {
  id: string;
  label: string;
  source: string;
};

type EditorPanelProps = {
  tabs: EditorTab[];
  activeTabId: string;
  onActiveTabChange: (tabId: string) => void;
  onTabSourceChange: (tabId: string, source: string) => void;
  onNewTab: () => void;
  onCloseTab: (tabId: string) => void;
  onSubmit: () => void;
  loading: boolean;
};

function EditorPanel({
  tabs,
  activeTabId,
  onActiveTabChange,
  onTabSourceChange,
  onNewTab,
  onCloseTab,
  onSubmit,
  loading,
}: EditorPanelProps) {
  return (
    <div className="editor-panel-inner">
      <Tabs.Root
        className="editor-tabs-root"
        value={activeTabId}
        onValueChange={onActiveTabChange}
      >
        <div className="editor-tabs-toolbar-row">
          <Tabs.List className="editor-tabs-list" aria-label="Open editors">
            {tabs.map((t) => (
              <Tabs.Trigger
                key={t.id}
                className="editor-tab-trigger"
                value={t.id}
                type="button"
              >
                <span className="editor-tab-label">{t.label}</span>
                {tabs.length > 1 ? (
                  <span
                    className="editor-tab-close"
                    role="presentation"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onCloseTab(t.id);
                    }}
                  >
                    ×
                  </span>
                ) : null}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          <button
            type="button"
            className="editor-tab-new"
            onClick={onNewTab}
            aria-label="New editor tab"
          >
            +
          </button>
        </div>

        {tabs.map((t) => (
          <Tabs.Content
            key={t.id}
            className="editor-tab-content"
            value={t.id}
          >
            <div className="editor-monaco-wrap">
              <Editor
                height="100%"
                language="lua"
                theme="vs-dark"
                value={t.source}
                onChange={(value) => onTabSourceChange(t.id, value ?? "")}
                options={{
                  fontSize: 14,
                  lineHeight: 21,
                  fontFamily: "monospace",
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </Tabs.Content>
        ))}
      </Tabs.Root>

      <div className="editor-toolbar">
        <button type="button" onClick={onSubmit} disabled={loading}>
          {loading ? "Running..." : "Submit"}
        </button>
      </div>
    </div>
  );
}

export default EditorPanel;
