import { Approaches, SkillTags } from "./skillsAndApproaches";
import { getDb } from "../db/setup";

type PlayerData = {
  name: string;
  id: string;
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

  constructor(playerName: string) {
    this.playerData = {
      name: playerName,
      id: "",
    };

    this.characterData = {
      name: "",
      sheetLink: "",
      tupperNames: [],
      status: "ALIVE",
      parameters: null,
      inventory: [],
    };
  }

  linkSheet(newLink: string) {
    if (!this.characterData) return;
    this.characterData.sheetLink = newLink;
  }

  // DATA MANAGEMENT
  toJSON(): string {
    const payload = {
      playerData: this.playerData,
      characterData: this.characterData,
    };

    return JSON.stringify(payload);
  }

  writeToData(): void {
    const payload = this.toJSON();
    const db = getDb();
    db.prepare(/*sql*/ `UPDATE users SET data = ? WHERE userID = ?`).run(
      payload,
      this.playerData.id,
    );
  }

  // INFO EDITING

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
        } else if (operation === "remove") {
          const removeIndex = tupperNames.findIndex((n) => n === targetName);

          if (removeIndex !== -1) {
            tupperNames.splice(removeIndex, 1);
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
        return didItChange;
    }

    return false;
  }
}
