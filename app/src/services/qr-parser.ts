export function parseQrContent(
  content: string,
): { arbeitId: number; schuelerId: number; seitenNr: number } | null {
  const match = content.match(
    /^korrektur:\/\/arbeit\/(\d+)\/schueler\/(\d+)\/seite\/(\d+)$/,
  );
  if (!match) return null;
  return {
    arbeitId: parseInt(match[1], 10),
    schuelerId: parseInt(match[2], 10),
    seitenNr: parseInt(match[3], 10),
  };
}
