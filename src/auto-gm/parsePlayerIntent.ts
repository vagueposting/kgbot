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
      const lowerAlias = nameOrAlias.toLowerCase().trim();
      wordsLexicon[lowerAlias] = "TargetPOI";
      aliasToPOIMap.set(lowerAlias, poi.code);
    }

    for (const act of poi.validActions) {
      const lowerAct = act.toLowerCase().trim();
      wordsLexicon[lowerAct] = "TargetAction";
      validVerbSet.add(lowerAct);
    }
  }

  const doc = nlp(messageText, wordsLexicon);

  const poiMatch = doc.match("#TargetPOI").first();
  if (!poiMatch.found) return null;

  const matchedAlias = poiMatch.out("normal").toLowerCase().trim();
  const poiCode = aliasToPOIMap.get(matchedAlias);

  if (!poiCode) return null;

  const termList = doc.termList();
  const poiIndex = termList.findIndex((t) => {
    const termClean = (t.normal || t.text)
      .toLowerCase()
      .replace(/[^\w\s]/g, "");
    return termClean === matchedAlias;
  });

  if (poiIndex === -1) return null;

  const start = Math.max(0, poiIndex - 4);
  const end = Math.min(termList.length - 1, poiIndex + 4);

  let foundAction: string | null = null;

  for (let i = start; i <= end; i++) {
    if (i === poiIndex) continue;
    const term = termList[i];
    if (!term) continue;

    const normalText = (term.normal || term.text)
      .toLowerCase()
      .replace(/[^\w\s]/g, "");
    const hasTag = (tag: string) => (term.tags ? term.tags.has(tag) : false);

    let actionCandidate = normalText;
    if (hasTag("Verb")) {
      const verbDoc = nlp(normalText);
      verbDoc.verbs().toInfinitive();
      actionCandidate = verbDoc.text().toLowerCase().trim() || normalText;
    }

    if (
      hasTag("TargetAction") ||
      validVerbSet.has(normalText) ||
      validVerbSet.has(actionCandidate) ||
      hasTag("Verb")
    ) {
      foundAction = validVerbSet.has(actionCandidate)
        ? actionCandidate
        : validVerbSet.has(normalText)
          ? normalText
          : actionCandidate;
      break;
    }
  }

  return {
    poiCode,
    action: foundAction,
  };
}
