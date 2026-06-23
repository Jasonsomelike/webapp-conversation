const COMPLETE_THINK_BLOCK = /<think\b[^>]*>[\s\S]*?<\/think>/gi
const UNCLOSED_THINK_BLOCK = /<think\b[^>]*>[\s\S]*$/gi
const THINK_TAG = /<\/?think\b[^>]*>/gi
const HTML_TAG = /<[^>]+>/g
const MARKDOWN_DECORATION = /(?:^|\s)(?:#{1,6}|>|[-*+]\s|\d+\.\s)|[`*_~\[\]()]/g

export const stripReasoningContent = (value: string) =>
  value
    .replace(COMPLETE_THINK_BLOCK, ' ')
    .replace(UNCLOSED_THINK_BLOCK, ' ')
    .replace(THINK_TAG, ' ')

export const toConversationPreview = (value: string, maxLength = 160) => {
  const cleaned = stripReasoningContent(value)
    .replace(HTML_TAG, ' ')
    .replace(MARKDOWN_DECORATION, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return cleaned.slice(0, maxLength)
}
