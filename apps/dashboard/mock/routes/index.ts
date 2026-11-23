// Route registration is a side effect of importing each domain module, so the import order below is
// the match order (e.g. `/api/workflows/export` must be registered before `/api/workflows/:id`).
import './projects';
import './specs';
import './workflows';
import './definitions';
import './integrations';

export { routes, type Ctx, type Route } from './router';
