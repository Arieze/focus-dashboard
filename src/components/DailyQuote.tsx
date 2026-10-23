import { memo } from "react";
import quotes from "../../citaitons/citations.json";

export default memo(function DailyQuote({ date }: { date: string }) {
  // Paris calendar dates are counted in UTC to avoid daylight-saving offsets.
  // 137 and 365 are coprime: every quote appears once in each 365-day cycle.
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
  const quote = quotes[((day * 137) % quotes.length + quotes.length) % quotes.length];
  return (
    <figure className="daily-quote" aria-label="Citation du jour">
      <span className="daily-quote-label">Citation du jour</span>
      <blockquote>« {quote.text} »</blockquote>
      <figcaption title="Attribution issue du recueil fourni ; traduction française.">
        — <cite>{quote.author}</cite>
      </figcaption>
    </figure>
  );
});
