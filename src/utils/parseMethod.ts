import { POIMethod, POIState } from "../types/POItypes";

export function parseMethodScript(scriptText: string): POIMethod {
  const actionCutter =
    /(inc|dec|set|flip|true|untrue)\s+([a-zA-Z0-9_]+)(?:\s+("[^"]+"|\S+))?/gi;

  const matches = Array.from(scriptText.matchAll(actionCutter));

  return (currentState: POIState): POIState => {
    const nextState = { ...currentState };

    for (const match of matches) {
      const type = match[1].toLowerCase();
      const target = match[2];
      const rawDegree = match[3];

      const cleanDegree = rawDegree?.replace(/^"|"$/g, "");
      const numDegree = Number(cleanDegree);

      switch (type) {
        case "set":
          nextState[target] =
            rawDegree !== undefined
              ? isNaN(numDegree)
                ? cleanDegree!
                : numDegree
              : true;
          break;

        case "inc":
          nextState[target] =
            (Number(nextState[target]) || 0) +
            (isNaN(numDegree) ? 1 : numDegree);
          break;

        case "dec":
          nextState[target] =
            Number(nextState[target] || 0) - (isNaN(numDegree) ? 1 : numDegree);
          break;

        case "flip":
          nextState[target] = !nextState[target];
          break;

        case "true":
          nextState[target] = true;
          break;

        case "untrue":
          nextState[target] = false;
          break;
      }
    }

    return nextState;
  };
}
