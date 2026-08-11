import { POI, POIResponse } from "../../types/responses";

// function to create a point of interest
export function createPOI(
  POIname: string,
  aliases: string[],
  actions: string[],
): POI {
  return new POI(POIname, aliases, actions);
}
