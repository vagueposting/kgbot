import { getDb } from "../db/setup";
import { getParentId } from "../utils/getParentId";
import { parseMethodScript } from "../utils/parseMethod";
import { parseResponseScript } from "../utils/parseResponse";
import { Approaches } from "./approaches";
import { SkillTags } from "./skilltags";
import { CommandInteraction, Guild } from "discord.js";

export interface POIRow {
  id: number;
  code: string;
  channel: string;
  data: string;
}

export interface POIJsonPayload {
  name: string;
  channel: string;
  guildId: string;
  aliases: string[];
  responses: Record<string, POIResponse>;
  methodScripts?: Record<string, string>;
  actionAliases?: Record<string, string>;
  group: string;
  exempt: boolean;
  metrics: POIMetrics;
}

export interface TruePOIConstructor {
  name: string;
  code: string;
  channel: string;
  guild: Guild | null;
  aliases: string[];
  actionsOrResponses: string[] | Record<string, POIResponse>;
  group: string;
  shouldBeExempt: boolean;
  metrics?: POIMetrics; /* This is only 
    required when I'm retrieving existing POI data. */
}

interface POIMetrics {
  created: number;
  lastInteracted: {
    dateTime: number | null;
    player: string | null;
  };
  timesInteracted: number;
}

export type ValidStates = string | number | boolean;
export type POIState = Record<string, ValidStates>;
export type POIMethod = (currentState: POIState) => POIState;

export type ResponseRolls = {
  roll_dc?: number;
  approach?: Approaches[];
  skill_tag?: SkillTags[];
  success?: string;
  failure?: string;
};

export interface ParsedActions {
  canonicalActions: string[];
  aliasMap: Record<string, string>;
}

function interpolateTemplate(template: string, state: POIState): string {
  return template.replace(/\$\{state\.(\w+)\}/g, (_, key) => {
    return state[key] !== undefined ? String(state[key]) : "";
  });
}

export function parseActionGroups(input: string): ParsedActions {
  const canonicalActions: string[] = [];
  const aliasMap: Record<string, string> = {};

  if (!input.trim()) return { canonicalActions, aliasMap };

  const groupRegex = /\(([^)]+)\)|([^,]+)/g;

  let match: RegExpExecArray | null;

  while ((match = groupRegex.exec(input)) !== null) {
    if (match[1]) {
      const synonyms = match[1]
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);

      if (synonyms.length > 0) {
        const canonical = synonyms[0];
        canonicalActions.push(canonical);

        for (const synonym of synonyms) {
          aliasMap[synonym] = canonical;
        }
      }
    } else if (match[2]) {
      // Standalone action: "sit down"
      const item = match[2].trim().toLowerCase();
      if (item) {
        canonicalActions.push(item);
        aliasMap[item] = item;
      }
    }
  }

  return { canonicalActions, aliasMap };
}

export class POIResponse {
  base: string;
  checks: ResponseRolls[];
  methodCalls: string[];
  script?: string;

  constructor(base: string) {
    this.base = base;
    this.checks = [];
    this.methodCalls = [];
  }

  addCheck(checkData: ResponseRolls) {
    this.checks.push(checkData);
  }

  renderBase(state: POIState): string {
    return interpolateTemplate(this.base, state);
  }

  renderCheckOutcome(
    checkIndex: number,
    isSuccess: boolean,
    state: POIState,
  ): string {
    const check = this.checks[checkIndex];

    if (!check) throw new Error(`Check index ${checkIndex} out of bounds.`);

    const rawText = isSuccess ? (check.success ?? "") : (check.failure ?? "");

    return interpolateTemplate(rawText, state);
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
  methods: Record<string, POIMethod> = {};
  methodScripts: Record<string, string> = {};
  responses: Record<string, POIResponse> = {};
  actionAliases: Record<string, string> = {};
  metrics: POIMetrics;
  group: string;
  active: {
    current: boolean;
    exempt: boolean;
  };

  private constructor(
    name: string,
    code: string,
    channel: string,
    guildId: string,
    aliases: string[] = [],
    actionsOrResponses: string[] | Record<string, POIResponse> = [],
    group: string,
    shouldBeExempt: boolean,
    metrics?: POIMetrics,
  ) {
    this.name = name;
    this.code = code;
    this.channel = channel;
    this.guildId = guildId;
    this.aliases = aliases;
    this.metrics = metrics
      ? metrics
      : {
          // Creates a blank metrics state
          // if no metrics value is passed
          created: Math.floor(Date.now() / 1000),
          lastInteracted: {
            dateTime: null,
            player: null,
          },
          timesInteracted: 0,
        };
    this.group = group;
    this.active = {
      current: true,
      exempt: shouldBeExempt,
    };

    if (Array.isArray(actionsOrResponses)) {
      for (const action of actionsOrResponses) {
        const trimmed = action.trim();
        if (trimmed) {
          this.responses[trimmed] = new POIResponse("");
        }
      }
    } else if (actionsOrResponses) {
      this.responses = actionsOrResponses;
    }
  }

  static async create(obj: TruePOIConstructor): Promise<POI> {
    const {
      name,
      code,
      channel,
      guild,
      aliases,
      actionsOrResponses,
      metrics,
      group,
      shouldBeExempt,
    } = obj;

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
      group,
      shouldBeExempt,
    );

    const parentID = await getParentId(channel, guild);

    if (parentID === "INVALID") {
      throw new Error(`Cannot add POI in ${channel}`);
    }

    return poi;
  }

  async modifyResponse(actionKey: string, originalScript: string) {
    const responseData = parseResponseScript(originalScript);
    this.responses[actionKey] = responseData;
    this.responses[actionKey].script = originalScript;

    const payload = this.toJSON();

    const db = getDb();
    db.prepare(/*sql*/ `UPDATE poi SET data = ? WHERE code = ?`).run(
      payload,
      this.code,
    );
  }

  registerMethod(methodName: string, scriptText: string) {
    this.methods[methodName] = parseMethodScript(scriptText);

    this.methodScripts[methodName] = scriptText;

    const payload = this.toJSON();
    const db = getDb();
    db.prepare(/*sql*/ `UPDATE poi SET data = ? WHERE code = ?`).run(
      payload,
      this.code,
    );
  }

  removeMethod(methodName: string) {
    delete this.methods[methodName];
    delete this.methodScripts[methodName];

    const payload = this.toJSON();
    const db = getDb();
    db.prepare(/*sql*/ `UPDATE poi SET data = ? WHERE code = ?`).run(
      payload,
      this.code,
    );
  }

  execMethod(methodName: string, ...args: ValidStates[]) {
    const method = this.methods[methodName];
    if (!method)
      throw new Error(`Method named ${methodName} not found on POI.`);
    this.state = method(this.state);
  }

  resolveAction(inputAction: string): string {
    const cleanInput = inputAction.trim().toLowerCase();
    return this.actionAliases[cleanInput] ?? cleanInput;
  }

  evaluateResponse(actionKey: string, playerId: string) {
    const response = this.responses[actionKey];

    if (!response) throw new Error(`Response ${actionKey} not found on POI.`);

    this.metrics.timesInteracted += 1;
    this.metrics.lastInteracted = {
      dateTime: Math.floor(Date.now() / 1000),
      player: playerId,
    };

    const renderedBase = response.renderBase(this.state);

    return {
      text: renderedBase,
      checks: response.checks,
    };
  }

  toJSON(): string {
    const payload: POIJsonPayload = {
      name: this.name,
      channel: this.channel,
      guildId: this.guildId!,
      aliases: this.aliases,
      responses: this.responses,
      methodScripts: this.methodScripts,
      actionAliases: this.actionAliases,
      metrics: this.metrics,
      group: this.group,
      exempt: this.active.exempt,
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
      actionsOrResponses: {},
      group: parsed.group,
      shouldBeExempt: parsed.exempt,
      metrics: parsed.metrics,
    });

    poi.actionAliases = parsed.actionAliases ?? {};

    if (parsed.responses) {
      for (const [actionKey, rawResp] of Object.entries(parsed.responses)) {
        if (rawResp.script) {
          const responseInstance = parseResponseScript(rawResp.script);
          responseInstance.script = rawResp.script;
          poi.responses[actionKey] = responseInstance;
        } else {
          // fallback that very rarely comes up
          const responseInstance = new POIResponse(rawResp.base ?? "");
          responseInstance.checks = rawResp.checks ?? [];
          responseInstance.methodCalls = rawResp.methodCalls ?? [];
          poi.responses[actionKey] = responseInstance;
        }
      }
    }

    if (parsed.methodScripts) {
      poi.methodScripts = parsed.methodScripts;
      for (const [name, script] of Object.entries(parsed.methodScripts)) {
        poi.methods[name] = parseMethodScript(script);
      }
    }

    poi.id = row.id;
    poi.guildId = parsed.guildId;
    return poi;
  }
}
