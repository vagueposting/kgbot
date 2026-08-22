import { getParentId } from "../utils/getParentId";
import { Approaches } from "./approaches";
import { SkillTags } from "./skilltags";
import { CommandInteraction, Guild } from "discord.js";

export interface POIRow {
  id: number;
  code: string;
  data: string;
}

interface POIJsonPayload {
  name: string;
  channel: string;
  guildId: string;
  aliases: string[];
  responses: Record<string, POIResponse>;
}

type TruePOIConstructor = {
  name: string;
  code: string;
  channel: string;
  guild: Guild | null;
  aliases: string[];
  actionsOrResponses: string[] | Record<string, POIResponse>;
};

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

export class POI {
  id?: number;
  code: string;
  name: string;
  aliases: string[];
  channel: string;
  guildId?: string;
  state: POIState = {};
  responses: Record<string, POIResponse> = {};

  private constructor(
    name: string,
    code: string,
    channel: string,
    guildId: string,
    aliases: string[] = [],
    actionsOrResponses: string[] | Record<string, POIResponse> = [],
  ) {
    this.name = name;
    this.code = code;
    this.channel = channel;
    this.guildId = guildId;
    this.aliases = aliases;

    if (!Array.isArray(actionsOrResponses)) {
      this.responses = actionsOrResponses;
    }
  }

  static async create(obj: TruePOIConstructor): Promise<POI> {
    const { name, code, channel, guild, aliases, actionsOrResponses } = obj;

    // Check if guild exists (not a DM)
    if (!guild) {
      throw new Error("POI cannot be created in DMs");
    }

    const poi = new POI(
      name,
      code,
      channel,
      guild.id,
      aliases,
      actionsOrResponses,
    );

    const parentID = await getParentId(channel, guild);

    if (parentID === "INVALID") {
      throw new Error(`Cannot add POI in ${channel}`);
    }

    return poi;
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

  toJSON(interaction: CommandInteraction): string {
    const payload: POIJsonPayload = {
      name: this.name,
      channel: this.channel,
      guildId: this.guildId!,
      aliases: this.aliases,
      responses: this.responses,
    };
    return JSON.stringify(payload);
  }

  static async fromRow(row: POIRow, guild: Guild): Promise<POI> {
    const parsed = JSON.parse(row.data) as POIJsonPayload;

    const poi = await POI.create({
      name: parsed.name,
      code: row.code,
      channel: parsed.channel,
      guild: guild,
      aliases: parsed.aliases ?? [],
      actionsOrResponses: parsed.responses ?? {},
    });

    poi.id = row.id;
    poi.guildId = parsed.guildId;
    return poi;
  }
}
