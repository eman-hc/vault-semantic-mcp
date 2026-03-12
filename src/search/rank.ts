/**
 * Folder boost for search ranking.
 * memory, entities, decisions = highest; projects, sessions = medium; inbox = low.
 */
const FOLDER_BOOST: Record<string, number> = {
  memory: 1.5,
  entities: 1.5,
  decisions: 1.5,
  projects: 1.2,
  sessions: 1.1,
  templates: 1.0,
  inbox: 0.9,
};

export function getFolderBoost(folder: string): number {
  return FOLDER_BOOST[folder.toLowerCase()] ?? 1.0;
}
