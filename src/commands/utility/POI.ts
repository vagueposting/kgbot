import { POI } from "../../types/responses";

export function createPOI(
  POIname: string,
  aliases: string[],
  actions: string[],
): POI {
  return { name: POIname, aliases, actions };
}
