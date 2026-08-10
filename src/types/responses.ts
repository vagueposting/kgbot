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
