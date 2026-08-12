import { Approaches } from "./approaches";
import { SkillTags } from "./skilltags";

export interface POIResponse {
  base: string;
  roll_dc?: number;
  approach?: Approaches[];
  skill_tag?: SkillTags[]; // Make an enum of valid skill tags when you get there.
  success?: string;
  failure?: string;
}

interface POIrow {
  id: number;
  name: string;
  data: string;
}

export class POI {
  name: string;
  aliases: string[];
  responses: Record<string, POIResponse> = {};

  constructor(name: string, aliases: string[], actions: string[]) {
    this.name = name;
    this.aliases = aliases;

    for (const action of actions) {
      this.responses[action] = {
        base: "",
      };
    }
  }

  modifyResponse(action: string, newData: POIResponse): void {
    this.responses[action] = {
      ...this.responses[action],
      ...newData,
    };
  }

  toJSON() {
    return JSON.stringify({
      name: this.name,
      aliases: this.aliases,
      responses: this.responses,
    });
  }

  static fromRow(row: POIrow) {
    const parsed = JSON.parse(row.data);
    return new POI(parsed.name, parsed.aliases, parsed.actions);
  }
}
