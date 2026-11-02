import { POI, ResponseRoll } from "./POItypes";

export type CheckSessionState = "ACTIVE" | "RETRIEVABLE";

export interface ActiveCheckSession {
  poiCode: string;
  playerID: string;
  channelID: string;
  locationID: string;
  actionKey: string;
  checkData: ResponseRoll;
  checkIndex: number;
  state: CheckSessionState;
  activeTimer: NodeJS.Timeout;
  retrievalTimer?: NodeJS.Timeout;
  promptMessageID?: string;
}

export const activeCheckSessions = new Map<string, ActiveCheckSession>();
