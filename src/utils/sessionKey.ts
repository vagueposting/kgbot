export function makeSessionKey(channelID: string, playerID: string): string {
  return `${channelID}:${playerID}`;
}
