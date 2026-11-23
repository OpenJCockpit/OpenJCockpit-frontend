import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useState } from 'react';

export interface SettingsResourceOptions<T, D = T> {
  queryKey: QueryKey;
  /** Reads the server value. */
  load: () => Promise<T>;
  /** Persists the draft and returns the value the server now holds. */
  save: (draft: D) => Promise<T>;
  /** Server value to editable form state, e.g. with secret fields blanked. Identity when omitted. */
  toDraft?: (value: T) => D;
}

export interface SettingsResource<T, D = T> {
  /** The edits if any, else the form state derived from the server value; undefined until loaded. */
  draft: D | undefined;
  setDraft: (next: D | ((current: D) => D)) => void;
  /** The draft differs from what the server holds. */
  dirty: boolean;
  loading: boolean;
  saving: boolean;
  /** The last save succeeded and nothing was edited since. */
  saved: boolean;
  /** The value the server holds, e.g. for a "secret already stored" flag the draft blanks. */
  server: T | undefined;
  /** The load failed; there is nothing to edit. */
  loadError: Error | null;
  /** The last save failed; cleared by the next edit, save or reset. */
  error: Error | null;
  /** Saves the draft; a no-op while nothing is loaded. */
  submit: () => void;
  /** Drops the edits. */
  reset: () => void;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Load, edit and save one settings object. Edits live beside the server value (`edited ?? derived`),
 * so a refetch never overwrites what the user is typing and a save replaces the cached value.
 */
export function useSettingsResource<T>(options: SettingsResourceOptions<T>): SettingsResource<T>;
export function useSettingsResource<T, D>(
  options: SettingsResourceOptions<T, D> & { toDraft: (value: T) => D },
): SettingsResource<T, D>;
export function useSettingsResource<T, D = T>({
  queryKey,
  load,
  save,
  toDraft,
}: SettingsResourceOptions<T, D>): SettingsResource<T, D> {
  const client = useQueryClient();
  const query = useQuery({ queryKey, queryFn: load });
  const [edited, setEdited] = useState<D | null>(null);
  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: (value: D) => save(value),
    onSuccess: (value) => {
      client.setQueryData(queryKey, value);
      setEdited(null);
      setSaved(true);
    },
  });

  // Without `toDraft` the overloads guarantee D is T, which the implementation signature cannot express.
  const base =
    query.data === undefined ? undefined : toDraft ? toDraft(query.data) : (query.data as D);
  const draft = edited ?? base;

  return {
    draft,
    setDraft: (next) => {
      const current = (edited ?? base) as D;
      setEdited(typeof next === 'function' ? (next as (c: D) => D)(current) : next);
      setSaved(false);
      mutation.reset();
    },
    dirty: edited !== null && !same(edited, base),
    loading: query.isPending,
    saving: mutation.isPending,
    saved,
    server: query.data,
    loadError: query.error,
    error: mutation.error,
    submit: () => {
      if (draft !== undefined) mutation.mutate(draft);
    },
    reset: () => {
      setEdited(null);
      setSaved(false);
      mutation.reset();
    },
  };
}
