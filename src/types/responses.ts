import { Approaches } from "./approaches";

export interface POIResponse {
  base: string;
  roll_dc?: number;
  approach?: Approaches[];
  skill_tag?: string[]; // Make an enum of valid skill tags when you get there.
  success?: string;
  failure?: string;
}
