import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeHighlight from "rehype-highlight"
import "highlight.js/styles/github-dark.css"

export default function MarkdownMessage({
  content,
  isStreaming,
}: {
  content: string
  isStreaming?: boolean
}) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          p: ({ children }) => (
            <p className="mb-3 last:mb-0">{children}</p>
          ),
          h1: ({ children }) => (
            <h1 className="text-xl font-semibold mt-4 mb-2">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold mt-3 mb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold mt-2 mb-1">{children}</h3>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="marker:text-muted-foreground">{children}</li>
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = className?.includes("hljs") || className?.includes("language-")
            if (!isBlock) {
              return (
                <code
                  className="rounded bg-muted px-1.5 py-0.5 text-sm font-mono text-foreground"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            const lang = className?.match(/language-(\w+)/)?.[1]
            return (
              <div className="relative my-3 rounded-lg border bg-muted/50 overflow-hidden">
                {lang && (
                  <div className="flex items-center justify-between px-3 py-1.5 bg-muted border-b text-[10px] text-muted-foreground font-mono uppercase">
                    <span>{lang}</span>
                  </div>
                )}
                <pre className="p-3 overflow-x-auto text-sm leading-relaxed m-0">
                  <code className={className} {...props}>
                    {children}
                  </code>
                </pre>
              </div>
            )
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-muted-foreground/30 pl-4 italic text-muted-foreground my-3">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-lg border">
              <table className="w-full text-sm border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted border-b">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left font-medium text-foreground">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-muted">{children}</td>
          ),
          hr: () => <hr className="my-4 border-border" />,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
      {isStreaming && (
        <span className="inline-block w-0.5 h-4 bg-foreground/70 ml-0.5 align-text-bottom animate-pulse" />
      )}
    </div>
  )
}
