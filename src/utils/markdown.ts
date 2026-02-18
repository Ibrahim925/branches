export function extractMarkdownImageUrls(markdown: string): string[] {
  if (!markdown) return [];

  const matches = markdown.matchAll(
    /!\[[^\]]*]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  );

  return [...new Set(Array.from(matches, (match) => match[1]).filter(Boolean))];
}

export function extractFirstMarkdownImage(markdown: string): string | null {
  if (!markdown) return null;

  return extractMarkdownImageUrls(markdown)[0] || null;
}

export function markdownToPlainText(markdown: string): string {
  if (!markdown) return '';

  let plain = markdown;

  plain = plain.replace(/```[\s\S]*?```/g, ' ');
  plain = plain.replace(/`([^`]+)`/g, '$1');
  plain = plain.replace(/!\[[^\]]*]\(([^)]+)\)/g, ' ');
  plain = plain.replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1');
  plain = plain.replace(/^#{1,6}\s+/gm, '');
  plain = plain.replace(/^>\s?/gm, '');
  plain = plain.replace(/^[-*+]\s+/gm, '');
  plain = plain.replace(/^\d+\.\s+/gm, '');
  plain = plain.replace(/[*_~]/g, '');
  plain = plain.replace(/\s+/g, ' ').trim();

  return plain;
}

export function buildStoryExcerpt(markdown: string, maxLength = 180): string {
  const plain = markdownToPlainText(markdown);
  if (!plain) return '';
  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trimEnd()}...`;
}
