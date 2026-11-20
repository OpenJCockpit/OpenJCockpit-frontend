import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

/** Router state sent along when another page hands the user over to the specs page. */
export interface SpecsHandoff {
  draftsCreated: number;
  /** IDs of the drafts that were just created, so the list can mark them. */
  specIds: string[];
}

function isHandoff(state: unknown): state is SpecsHandoff {
  if (typeof state !== 'object' || state === null) return false;
  const { draftsCreated, specIds } = state as Partial<SpecsHandoff>;
  return (
    typeof draftsCreated === 'number' &&
    Array.isArray(specIds) &&
    specIds.every((id) => typeof id === 'string')
  );
}

/**
 * The drafts the user just generated, or `null`. Kept in component state and cleared from the
 * history entry, so a reload does not show the message again.
 */
export function useHandoffNotice(): SpecsHandoff | null {
  const location = useLocation();
  const navigate = useNavigate();
  const [handoff] = useState<SpecsHandoff | null>(
    isHandoff(location.state) ? location.state : null,
  );
  useEffect(() => {
    if (!isHandoff(location.state)) return;
    void navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location, navigate]);
  return handoff;
}
