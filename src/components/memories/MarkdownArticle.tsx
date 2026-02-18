'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Props = {
  markdown: string;
  className?: string;
};

export function MarkdownArticle({ markdown, className }: Props) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-semibold text-earth tracking-tight mt-6 mb-4">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold text-earth tracking-tight mt-5 mb-3">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold text-earth mt-4 mb-2">{children}</h3>
          ),
          p: ({ children }) => <p className="text-base leading-7 text-bark/80 mb-4">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-6 text-bark/80 mb-4 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 text-bark/80 mb-4 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-7">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-moss/40 pl-4 italic text-bark/70 my-4">{children}</blockquote>
          ),
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-moss underline underline-offset-2">
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="bg-stone/35 text-earth px-1.5 py-0.5 rounded text-sm">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="bg-earth text-white p-4 rounded-xl overflow-x-auto text-sm mb-4">{children}</pre>
          ),
          img: ({ alt, src }) => {
            // eslint-disable-next-line @next/next/no-img-element
            return <img src={src || ''} alt={alt || 'Story image'} className="w-full rounded-2xl border border-stone/30 my-4" />;
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
