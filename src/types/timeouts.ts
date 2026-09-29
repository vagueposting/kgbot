import { getDb } from "../db/setup";
import { Timestamp } from "./timestamp";

export const timeouts = {
  data: {
    rollForPOI: new Timestamp(0, 0, 20, 0).compute(),
    retrievePOI: new Timestamp(0, 18, 0, 0).compute(),
  } as Record<string, number>,

  get(key: string): number | undefined {
    return this.data[key];
  },

  change(
    timeout: string,
    newTime: { d: number; h: number; m: number; s: number },
  ): void {
    const { d, h, m, s } = newTime;
    this.data[timeout] = new Timestamp(d, h, m, s).compute();
  },

  writeToData(): void {
    const payload = JSON.stringify(timeouts.data);
    const db = getDb();

    db.prepare(
      /*sql*/ `UPDATE settings SET settingData = ? WHERE name = 'timeouts'`,
    ).run(payload);
  },

  rehydrate(): void {
    const db = getDb();

    const row = db
      .prepare<
        [string],
        { settingData: string }
      >(/*sql*/ `SELECT settingData FROM settings WHERE name = 'timeouts'`)
      .get("timeouts");

    if (!row || !row.settingData) return;

    try {
      const parsed = JSON.parse(row.settingData);

      timeouts.data = {
        ...timeouts.data,
        ...parsed,
      };
    } catch (error) {
      console.error(
        "[Settings] Failed to parse settingData from SQLITE:",
        error,
      );
    }
  },
};
