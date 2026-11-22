import { Approaches, SkillTags } from "./skillsAndApproaches";
import { getDb } from "../db/setup";

type PlayerData = {
  name: string;
  id: string;
};

type CharacterData = {
  name: string;
  nicknames: string[];
  sheetLink: string;
  stats: CharacterStats | null;
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
      nicknames: [],
      sheetLink: "",
      stats: null,
      inventory: [],
    };
  }

  linkSheet(newLink: string) {
    this.characterData.sheetLink = newLink;
  }

  toJSON(): string {
    // TODO: design payload
    return "";
  }

  writeToData(): void {
    const payload = this.toJSON();
    const db = getDb();
    db.prepare(/*sql*/ `UPDATE users SET data = ? WHERE userID = ?`).run(
      payload,
      this.playerData.id,
    );
  }
}
