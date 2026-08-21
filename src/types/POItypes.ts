import { fail } from "node:assert";
import { Approaches } from "./approaches";
import { SkillTags } from "./skilltags";

export interface POIRow {
  id: number;
  code: string;
  data: string;
}

interface POIJsonPayload {
  name: string;
  channel: string;
  aliases: string[];
  responses: Record<string, POIResponse>;
}

type ValidStates = string | number | boolean;
type POIState = Record<string, ValidStates>;
type POIMethod = (
  currentState: POIState,
  first: ValidStates,
  ...others: ValidStates[]
) => POIState;

export class POIResponse {
  base: string;
  roll_dc?: number;
  approach?: Approaches[];
  skill_tag?: SkillTags[];
  success?: string;
  failure?: string;
  methods: Record<string, POIMethod> = {};

  constructor(
    base: string,
    roll_dc = 0,
    approach: Approaches[] = [],
    skill_tag: SkillTags[] = [],
    success = "This response doesn't have a success mode.",
    failure = "This response doesn't have a failure mode.",
  ) {
    this.base = base;
    this.roll_dc = roll_dc;
    this.approach = approach;
    this.skill_tag = skill_tag;
    this.success = success;
    this.failure = failure;
  }

  addMethod(name: string, method: POIMethod) {
    this.methods[name] = method;
  }
}

/* TODO: Rewrite POI to include:
  - channel = string
  - state = Record<string, ValidState>
  - the new POIResponse class under responses
*/
export class POI {
  id?: number;
  code: string;
  name: string;
  aliases: string[];
  channel: string;
  state: POIState = {};
  responses: Record<string, POIResponse> = {};

  constructor(
    name: string,
    code: string,
    channel: string,
    aliases: string[] = [],
    actionsOrResponses: string[] | Record<string, POIResponse> = [],
  ) {
    this.name = name;
    this.code = code;
    this.channel = channel;
    this.aliases = aliases;
  }

  execResponseMethod(
    responseKey: string,
    methodName: string,
    firstArg: ValidStates,
    ...otherArgs: ValidStates[]
  ) {
    const response = this.responses[responseKey];

    if (!response) throw new Error(`Response ${responseKey} not found.`);

    const method = response.methods[methodName];

    if (!method) throw new Error(`Method ${methodName} not found.`);

    this.state = method(this.state, firstArg, ...otherArgs);
  }

  toJSON(): string {
    const payload: POIJsonPayload = {
      name: this.name,
      channel: this.channel,
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
      parsed.channel,
      parsed.aliases ?? [],
      parsed.responses ?? {},
    );
    poi.id = row.id;

    return poi;
  }
}
