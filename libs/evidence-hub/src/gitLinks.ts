/** Browsable https base of a clone URL (`https://host/org/repo.git`, `git@host:org/repo.git`); null if it has none. */
export function repoWebUrl(gitUrl?: string | null): string | null {
  const url = gitUrl?.trim();
  if (!url) return null;
  const scp = /^[\w.-]+@([\w.-]+):(.+)$/.exec(url);
  const web = scp ? `https://${scp[1]}/${scp[2]}` : url;
  if (!web.startsWith('https://') && !web.startsWith('http://')) return null;
  try {
    const parsed = new URL(web);
    return `${parsed.origin}${parsed.pathname.replace(/\.git$/, '').replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}

export function commitUrl(gitUrl: string | null | undefined, hash?: string | null): string | null {
  const base = repoWebUrl(gitUrl);
  return base && hash ? `${base}/commit/${encodeURIComponent(hash)}` : null;
}

export function branchUrl(
  gitUrl: string | null | undefined,
  branch?: string | null,
): string | null {
  const base = repoWebUrl(gitUrl);
  return base && branch
    ? `${base}/tree/${branch.split('/').map(encodeURIComponent).join('/')}`
    : null;
}

/** Link for a git event that names the run's commit or branch in its text; null otherwise. */
export function gitEventUrl(
  gitUrl: string | null | undefined,
  text: string,
  run: { commitHash?: string | null; branch?: string | null },
): string | null {
  if (run.commitHash && text.includes(run.commitHash)) return commitUrl(gitUrl, run.commitHash);
  if (run.branch && text.includes(run.branch)) return branchUrl(gitUrl, run.branch);
  return null;
}
