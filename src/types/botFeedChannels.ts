import { getDb } from "../db/setup";

export const botFeedChannels = {
  data: {
    tupperLog: "",
  } as Record<string, string>,

  cachedIds: new Set<string>(),

  updateCache(): void {
    this.cachedIds = new Set(
      Object.values(this.data).filter((id): id is string => Boolean(id)),
    );
  },

  change(feed: string, newChannelID: string): void {
    botFeedChannels.data[feed] = newChannelID;
    this.writeToData();
    this.updateCache();
  },

  writeToData(): void {
    const payload = JSON.stringify(botFeedChannels.data);
    const db = getDb();

    db.prepare(
      /*sql*/ `
      INSERT INTO settings (settingName, settingData)
      VALUES ('botFeedChannels', ?)
      ON CONFLICT(settingName) DO UPDATE SET settingData = excluded.settingData
    `,
    ).run(payload);
  },

  rehydrate(): void {
    const db = getDb();

    const row = db
      .prepare<
        [string],
        { settingData: string }
      >(/*sql*/ `SELECT settingData FROM settings WHERE settingName = ?`)
      .get("botFeedChannels");

    if (row?.settingData) {
      try {
        const parsed = JSON.parse(row.settingData);

        botFeedChannels.data = {
          ...botFeedChannels.data,
          ...parsed,
        };
      } catch (err) {
        console.error(
          "[Settings] Failed to parse settingData from SQLite:",
          err,
        );
      }
    } else {
      console.warn(
        "[Settings] No 'botFeedChannels' found in DB settings. Using defaults.",
      );
    }

    botFeedChannels.updateCache();
  },
};
