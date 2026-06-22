import ReactMarkdown from 'react-markdown'
import RemarkBreaks from 'remark-breaks'
import RemarkGfm from 'remark-gfm'

export default function SharedMarkdown({ content }: { content: string }) {
  return (
    <div className="streamdown-markdown">
      <ReactMarkdown
        remarkPlugins={[RemarkGfm, RemarkBreaks] as any}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="markdown-link">
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt || ''}
              loading="lazy"
              className="my-3 max-h-[360px] max-w-full rounded-xl object-contain"
            />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
