/**
 * AI citation block, concise factual summary for ChatGPT/Perplexity extraction.
 * @param {{ children: import('react').ReactNode }} props
 */
export default function AiQuickAnswer({ children }) {
  return (
    <div className="ai-quick-answer not-prose" role="note" aria-label="Quick answer">
      {children}
    </div>
  );
}
