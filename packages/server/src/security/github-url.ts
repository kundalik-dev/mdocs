export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
}

export function validateGitHubUrl(url: string): ParsedGitHubUrl | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    if (parsed.hostname !== 'github.com') return null;

    const parts = parsed.pathname
      .replace(/^\//, '')
      .replace(/\.git$/, '')
      .split('/');

    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

    return { owner: parts[0], repo: parts[1] };
  } catch {
    return null;
  }
}
