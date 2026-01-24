import { apiRequest } from "./queryClient";

export async function importCards(
  cardsData: Array<{ armenian: string; russian: string; sentence?: string; association?: string }>,
  deckId: string,
  updateExisting: boolean = true
): Promise<{ imported: number; updated: number; skipped: number }> {
  const response = await apiRequest("POST", "/api/import", {
    cards: cardsData,
    deckId,
    updateExisting,
  });
  const result = await response.json();
  return { imported: result.created, updated: result.updated, skipped: result.skipped };
}

export function parseCSV(csv: string, separator: "," | ";" = ","): Array<{ armenian: string; russian: string; sentence?: string; association?: string }> {
  const lines = csv.trim().split("\n");
  const results: Array<{ armenian: string; russian: string; sentence?: string; association?: string }> = [];
  
  const startIndex = lines[0]?.toLowerCase().includes("armenian") ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const values = parseCSVLine(lines[i], separator);
    if (values.length >= 2 && values[0].trim() && values[1].trim()) {
      results.push({
        armenian: values[0].trim(),
        russian: values[1].trim(),
        sentence: values[2]?.trim() || undefined,
        association: values[3]?.trim() || undefined,
      });
    }
  }
  
  return results;
}

function parseCSVLine(line: string, separator: "," | ";" = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportCardsToCSV(cards: Array<{ armenian: string; russian: string; sentence?: string | null; association?: string | null; isStarred?: boolean }>): string {
  const headers = ["armenian", "russian", "sentence", "association", "isStarred"];
  const rows = cards.map((card) => [
    escapeCSV(card.armenian),
    escapeCSV(card.russian),
    escapeCSV(card.sentence || ""),
    escapeCSV(card.association || ""),
    card.isStarred ? "true" : "false",
  ]);
  
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function exportReviewsToCSV(reviews: Array<{ cardId: string; quality: number; reviewedAt: Date | string; previousInterval: number; newInterval: number }>, cards: Array<{ id: string; armenian: string }>): string {
  const headers = ["cardId", "quality", "reviewedAt", "previousInterval", "newInterval"];
  
  const rows = reviews.map((review) => {
    const card = cards.find((c) => c.id === review.cardId);
    return [
      card?.armenian || review.cardId,
      review.quality.toString(),
      typeof review.reviewedAt === 'string' ? review.reviewedAt : review.reviewedAt.toISOString(),
      review.previousInterval.toString(),
      review.newInterval.toString(),
    ];
  });
  
  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
