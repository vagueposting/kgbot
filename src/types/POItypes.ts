import { Approaches } from "./approaches";
import { SkillTags } from "./skilltags";

export interface POIResponse {
  base: string;
  roll_dc?: number;
  approach?: Approaches[];
  skill_tag?: SkillTags[];
  success?: string;
  failure?: string;
}

export interface POIRow {
  id: number;
  code: string;
  data: string;
}

interface POIJsonPayload {
  name: string;
  aliases: string[];
  responses: Record<string, POIResponse>;
}

export class POI {
  id?: number;
  code: string;
  name: string;
  aliases: string[];
  responses: Record<string, POIResponse> = {};

  constructor(
    name: string,
    code: string,
    aliases: string[] = [],
    actionsOrResponses: string[] | Record<string, POIResponse> = [],
  ) {
    this.name = name;
    this.code = code;
    this.aliases = aliases;

    if (Array.isArray(actionsOrResponses)) {
      for (const action of actionsOrResponses) {
        this.responses[action] = { base: "" };
      }
    } else {
      this.responses = actionsOrResponses;
    }
  }

  modifyResponse(action: string, newData: POIResponse): void {
    this.responses[action] = {
      ...this.responses[action],
      ...newData,
    };
  }

  toJSON(): string {
    const payload: POIJsonPayload = {
      name: this.name,
      aliases: this.aliases,
      responses: this.responses,
    };
    return JSON.stringify(payload);
  }

  static fromRow(row: POIRow): POI {
    const parsed = JSON.parse(row.data) as POIJsonPayload;

    const poi = new POI(
      parsed.name,
      row.code,
      parsed.aliases,
      parsed.responses,
    );
    poi.id = row.id;

    return poi;
  }
}
