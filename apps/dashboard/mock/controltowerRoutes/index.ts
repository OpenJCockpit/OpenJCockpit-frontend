// Route registration is a side effect of importing each module, so the import order is the match order.
import './repositories';
import './templates';
import './interviews';
import './specs';
import './settings';

export { controltowerRoutes, type Route } from './router';
