import nlp from "compromise";

export interface TargetIntent {
  poiCode: string;
  action: string | null;
}

export function parsePlayerIntent(
  messageText: string,
  channelPOIs: Array<{
    code: string;
    namesAndAliases: string[];
    validActions: string[];
  }>,
): TargetIntent | null {
  if (!channelPOIs.length) return null;

  const wordsLexicon: Record<string, string> = {};
  const aliasToPOIMap = new Map<string, string>();
  const validVerbSet = new Set<string>();

  for (const poi of channelPOIs) {
    for (const nameOrAlias of poi.namesAndAliases) {
      const lowerAlias = nameOrAlias.toLowerCase();
      wordsLexicon[lowerAlias] = "TargetPOI";
      aliasToPOIMap.set(lowerAlias, poi.code);
    }

    for (const act of poi.validActions) {
      const lowerAct = act.toLowerCase();
      wordsLexicon[lowerAct] = "TargetAction";
      validVerbSet.add(lowerAct);
    }
  }

  const doc = nlp(messageText, wordsLexicon);

  const poiMatch = doc.match("#TargetPOI").first();
  if (!poiMatch.found) return null;

  const matchedAlias = poiMatch.text().toLowerCase();
  const poiCode = aliasToPOIMap.get(matchedAlias);

  if (!poiCode) return null;

  const termList = doc.termList();
  const poiIndex = termList.findIndex(
    (t) => t.text.toLowerCase() === matchedAlias,
  );

  const start = Math.max(0, poiIndex - 4);
  const end = Math.min(termList.length - 1, poiIndex + 4);

  let foundAction: string | null = null;

  for (let i = start; i <= end; i++) {
    if (i === poiIndex) continue;
    const term = termList[i];
    const normalText = term.normal || term.text.toLowerCase();

    if (!term.tags) return null;

    if (term.tags.has("TargetAction") || validVerbSet.has(normalText)) {
      foundAction = normalText;
      break;
    } else if (term.tags.has("Verb")) {
      foundAction = normalText;
      break;
    }
  }

  return {
    poiCode,
    action: foundAction,
  };
}
