import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

/** Router state sent along when another page hands the user over to the specs page. */
export interface SpecsHandoff {
  draftsCreated: number;
}

function isHandoff(state: unknown): state is SpecsHandoff {
  return (
    typeof state === 'object' &&
    state !== null &&
    typeof (state as Partial<SpecsHandoff>).draftsCreated === 'number'
  );
}

/**
 * The number of drafts the user just generated, or `null`. Kept in component state and cleared from the
 * history entry, so a reload does not show the message again.
 */
export function useHandoffNotice(): number | null {
  const location = useLocation();
  const navigate = useNavigate();
  const [drafts] = useState<number | null>(
    isHandoff(location.state) ? location.state.draftsCreated : null,
  );
  useEffect(() => {
    if (!isHandoff(location.state)) return;
    void navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location, navigate]);
  return drafts;
}
