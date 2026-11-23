import { Approaches, SkillTags } from "./skillsAndApproaches";
import { getDb } from "../db/setup";
import { GuildMember, Guild } from "discord.js";

interface UserRow {
  userName: string;
  userID: string;
  firstJoined: string;
  leftOn: string;
  onServer: 0 | 1;
  data: string;
  prunedOn: string;
}

interface PlayerJsonPayload {
  playerData: PlayerData;
  characterData: CharacterData;
}

type PlayerData = {
  name: string;
  id: string;
  firstJoined: string;
  onServer: boolean;
};

type PlayerSettings = keyof PlayerData;
type PlayerSettingValues = {
  [K in PlayerSettings]: PlayerData[K];
};

type CharacterData = {
  name: string;
  sheetLink: string;
  tupperNames: string[];
  status: LifeStatus;
  parameters: CharacterStats | null;
  /* TODO: create an item class
  and switch it to an array of items*/
  inventory: any[];
};
type CharacterStats = {
  approaches: Record<Approaches, number>;
  skills: SkillData[];
  talent: {
    name: string;
    description: string;
  };
};
type SkillData = {
  name: string;
  description: string;
  modifier: number;
  type: [SkillTags] | [SkillTags, SkillTags];
};
type LifeStatus = "ALIVE" | "DEAD" | "MIA";
const characterTemplate: CharacterData = {
  name: "",
  sheetLink: "",
  tupperNames: [],
  status: "ALIVE",
  parameters: null,
  inventory: [],
};

// TODO: make operations for stats and inventory

type CharacterSettings = Exclude<
  keyof CharacterData,
  "parameters" | "inventory"
>;

type TupperNamesMutation =
  | { operation: "add"; targetName: string }
  | { operation: "remove"; targetName: string };

// Map each setting to what `modifyCharacterData` accepts
type CharacterSettingValues = {
  [K in CharacterSettings]: K extends "tupperNames"
    ? TupperNamesMutation
    : CharacterData[K];
};

export class Player {
  playerData: PlayerData;
  characterData: CharacterData;

  constructor(member: GuildMember) {
    const { user } = member;
    this.playerData = {
      name: user.username,
      id: user.id,
      firstJoined: "",
      onServer: true,
    };

    const db = getDb();
    const existingPlayer = db
      .prepare(
        /*sql*/ `SELECT * FROM users
      WHERE userID = ?
      LIMIT 1`,
      )
      .get(user.id) as UserRow;

    if (existingPlayer) {
      this.playerData = {
        name: existingPlayer.userName ?? user.username,
        id: existingPlayer.userID,
        firstJoined: existingPlayer.firstJoined,
        onServer: true,
      };

      const row = db
        .prepare(
          /*sql*/ `SELECT data FROM users
       WHERE userID = ?
       LIMIT 1`,
        )
        .get(user.id) as { data: string } | undefined;

      if (row?.data) {
        const parsed = JSON.parse(row.data);
        this.characterData = parsed.characterData ?? parsed;
      } else {
        this.characterData = characterTemplate;
      }
    } else {
      this.playerData = {
        ...this.playerData,
        firstJoined: String(member.joinedTimestamp ?? Date.now()),
      };

      this.characterData = characterTemplate;
    }

    this.saveOnJoin();
  }

  // INFO EDITING

  modifyPlayerData<T extends PlayerSettings>(
    playerField: T,
    modifiedData: PlayerSettingValues[T],
  ): boolean {
    switch (playerField) {
      default:
        const nextValue = modifiedData as PlayerData[T];
        const oldData = this.playerData[playerField];
        const didItChange = oldData !== nextValue;

        this.playerData[playerField] = nextValue;

        if (didItChange) this.writeToData();
        return didItChange;
    }
  }

  modifyCharacterData<T extends CharacterSettings>(
    characterField: T,
    modifiedData: CharacterSettingValues[T],
  ): boolean {
    switch (characterField) {
      case "tupperNames":
        const { tupperNames } = this.characterData;
        const { targetName, operation } = modifiedData as {
          targetName: string;
          operation: "add" | "remove";
        };

        if (operation === "add") {
          tupperNames.push(targetName);
          this.writeToData();
          return true;
        } else if (operation === "remove") {
          const removeIndex = tupperNames.findIndex((n) => n === targetName);

          if (removeIndex !== -1) {
            tupperNames.splice(removeIndex, 1);
            this.writeToData();
            return true;
          }

          return false;
        }

        break;
      default:
        const nextValue = modifiedData as CharacterData[T];
        const oldData = this.characterData[characterField];
        const didItChange = oldData !== nextValue;

        this.characterData[characterField] = nextValue;

        if (didItChange) this.writeToData();
        return didItChange;
    }

    return false;
  }

  // DATA MANAGEMENT
  /**
   * Used to stringify the Player Class.
   * @returns a payload string for re-initializing.
   */
  toJSON(): string {
    const payload = {
      playerData: this.playerData,
      characterData: this.characterData,
    };

    return JSON.stringify(payload);
  }

  /**
   * Update the database to reflect changes to the Player entity.
   */
  writeToData(): void {
    const payload = this.toJSON();
    const db = getDb();
    db.prepare(/*sql*/ `UPDATE users SET data = ? WHERE userID = ?`).run(
      payload,
      this.playerData.id,
    );
  }

  /**
   * Private method for registering new Player entities.
   */
  private saveOnJoin(): void {
    const db = getDb();
    db.prepare(
      /*sql*/ `
    INSERT INTO users (
      userName,
      userID,
      firstJoined,
      leftOn,
      onServer,
      data,
      prunedOn
    )
    VALUES (?, ?, ?, NULL, 1, ?, NULL)
    ON CONFLICT(userID) DO UPDATE SET
      userName = excluded.userName,
      leftOn = NULL,
      onServer = 1,
      prunedOn = NULL
  `,
    ).run(
      this.playerData.name,
      this.playerData.id,
      this.playerData.firstJoined,
      JSON.stringify({ characterData: this.characterData }),
    );
  }

  /**
   * Retrieves a Player entity from the users database
   * @param row user database columns
   * @param guild the Discord server the bot is running on
   * @returns a Player entity that can be interacted with
   */
  static async fromRow(row: UserRow, guild: Guild): Promise<Player> {
    const parsed = JSON.parse(row.data) as PlayerJsonPayload;
    const targetId = parsed.playerData?.id ?? row.userID;

    const member = await guild.members.fetch(targetId).catch(() => null);

    const player = member
      ? new Player(member)
      : (Object.create(Player.prototype) as Player);

    player.playerData = {
      ...parsed.playerData,
      onServer: Boolean(row.onServer),
    };
    player.characterData = parsed.characterData;

    return player;
  }
}
