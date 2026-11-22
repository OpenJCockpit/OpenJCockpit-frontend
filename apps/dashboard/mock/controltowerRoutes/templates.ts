import { MockError, findBy, nextId, remove, upsert } from '../store';
import { add, id0 } from './router';
import { specTemplates, templates } from './state';

add('GET', '/templates', () => templates);
add('POST', '/templates', ({ body }) => {
  const created = { ...body, id: nextId('tpl') };
  templates.push(created);
  return created;
});
add('PUT', '/templates/:id', ({ p, body }) => {
  const current = findBy(templates, 'id', id0(p), 'Template');
  if (current.builtIn)
    throw new MockError(409, 'BUILT_IN_TEMPLATE', 'Built-in templates cannot be changed');
  return upsert(templates, 'id', id0(p), { ...body, id: id0(p), builtIn: false });
});
add('DELETE', '/templates/:id', ({ p }) => {
  const current = findBy(templates, 'id', id0(p), 'Template');
  if (current.builtIn)
    throw new MockError(409, 'BUILT_IN_TEMPLATE', 'Built-in templates cannot be deleted');
  remove(templates, 'id', id0(p), 'Template');
  return null;
});
add('GET', '/spec-templates', () => specTemplates);
add('POST', '/spec-templates', ({ body }) => {
  const created = { ...body, id: nextId('spec-tpl'), defaultTemplate: false };
  specTemplates.push(created);
  return created;
});
