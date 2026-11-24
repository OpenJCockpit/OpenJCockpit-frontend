import { describe, expect, it } from 'vitest';
import { branchUrl, commitUrl, gitEventUrl, repoWebUrl } from './gitLinks';

describe('gitLinks', () => {
  it('turns clone URLs into a browsable base', () => {
    expect(repoWebUrl('https://github.com/org/repo.git')).toBe('https://github.com/org/repo');
    expect(repoWebUrl('git@github.com:org/repo.git')).toBe('https://github.com/org/repo');
    expect(repoWebUrl('https://gitlab.example.com/a/b/')).toBe('https://gitlab.example.com/a/b');
  });

  it('has no base for missing, local or malformed URLs', () => {
    for (const url of [undefined, null, '', '/srv/git/repo', 'file:///repo', 'ssh://x/y']) {
      expect(repoWebUrl(url)).toBeNull();
    }
  });

  it('builds commit and branch links, and none without data', () => {
    const git = 'https://github.com/org/repo.git';
    expect(commitUrl(git, 'abc')).toBe('https://github.com/org/repo/commit/abc');
    expect(branchUrl(git, 'feature/a b')).toBe('https://github.com/org/repo/tree/feature/a%20b');
    expect(commitUrl(git, null)).toBeNull();
    expect(branchUrl(undefined, 'main')).toBeNull();
  });

  it('prefers the commit over the branch for a git event', () => {
    const run = { commitHash: 'abc', branch: 'main' };
    const git = 'https://github.com/org/repo';
    expect(gitEventUrl(git, 'Committed abc on main', run)).toContain('/commit/abc');
    expect(gitEventUrl(git, 'Pushed main', run)).toContain('/tree/main');
    expect(gitEventUrl(git, 'Cloned', run)).toBeNull();
  });
});
