import type { DragEvent } from 'react';
import type { WidgetDefinition } from '@openjcockpit/hub-contract';
import { Icon } from '@openjcockpit/ui';

export type Drag =
  { kind: 'tile'; id: string } | { kind: 'library'; id: string; widget: WidgetDefinition };

export const GLYPH = {
  earlier: <Icon name="arrow-left" />,
  later: <Icon name="arrow-right" />,
  handle: <Icon name="handle" />,
  grip: <Icon name="resize" />,
  check: <Icon name="check" />,
  plus: <Icon name="plus" />,
  reset: <Icon name="reset" />,
  remove: <Icon name="close" />,
} as const;

/** Marks an element as a valid drop target for the customiser's drags. */
export function allowDrop(event: DragEvent) {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
}
