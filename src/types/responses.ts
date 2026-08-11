import { Approaches } from "./approaches";
import { SkillTags } from "./skilltags";

// TODO: I'm going to turn this stuff into a class tomorrow.
export interface POI {
  name: string;
  aliases: string[];
  actions: string[];
}

export interface POIResponse {
  base: string;
  roll_dc?: number;
  approach?: Approaches[];
  skill_tag?: SkillTags[]; // Make an enum of valid skill tags when you get there.
  success?: string;
  failure?: string;
}
