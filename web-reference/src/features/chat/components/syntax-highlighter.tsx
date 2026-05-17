// ── Lazy syntax highlighter ────────────────────────────────────────────────
// This file is dynamically imported via React.lazy from ChatMessage.tsx.
// Even though it eagerly imports react-syntax-highlighter, being a separate
// entry point means it becomes its own chunk (~600 KB) that only loads when
// a code block is first rendered.

import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"

// Register only the languages commonly seen in LLM chat output
import python from "react-syntax-highlighter/dist/esm/languages/prism/python"
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript"
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript"
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx"
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx"
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash"
import json from "react-syntax-highlighter/dist/esm/languages/prism/json"
import css from "react-syntax-highlighter/dist/esm/languages/prism/css"
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql"
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml"
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown"
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust"
import go from "react-syntax-highlighter/dist/esm/languages/prism/go"
import java from "react-syntax-highlighter/dist/esm/languages/prism/java"

SyntaxHighlighter.registerLanguage("python", python)
SyntaxHighlighter.registerLanguage("javascript", javascript)
SyntaxHighlighter.registerLanguage("js", javascript)
SyntaxHighlighter.registerLanguage("typescript", typescript)
SyntaxHighlighter.registerLanguage("ts", typescript)
SyntaxHighlighter.registerLanguage("jsx", jsx)
SyntaxHighlighter.registerLanguage("tsx", tsx)
SyntaxHighlighter.registerLanguage("bash", bash)
SyntaxHighlighter.registerLanguage("sh", bash)
SyntaxHighlighter.registerLanguage("shell", bash)
SyntaxHighlighter.registerLanguage("json", json)
SyntaxHighlighter.registerLanguage("css", css)
SyntaxHighlighter.registerLanguage("sql", sql)
SyntaxHighlighter.registerLanguage("yaml", yaml)
SyntaxHighlighter.registerLanguage("yml", yaml)
SyntaxHighlighter.registerLanguage("markdown", markdown)
SyntaxHighlighter.registerLanguage("md", markdown)
SyntaxHighlighter.registerLanguage("rust", rust)
SyntaxHighlighter.registerLanguage("rs", rust)
SyntaxHighlighter.registerLanguage("go", go)
SyntaxHighlighter.registerLanguage("java", java)

interface SyncHighlighterProps {
  language: string
  value: string
}

export function SyncHighlighter({ language, value }: SyncHighlighterProps) {
  return (
    <SyntaxHighlighter
      language={language || "text"}
      style={oneDark}
      customStyle={{
        margin: 0,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        borderBottomLeftRadius: "0.5rem",
        borderBottomRightRadius: "0.5rem",
        fontSize: "13px",
        lineHeight: 1.5,
      }}
      codeTagProps={{ className: "font-mono" }}
    >
      {value}
    </SyntaxHighlighter>
  )
}
