import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import type { WidgetDefinition } from '@openjcockpit/hub-contract';
import {
  COL_STEPS,
  GRID_COLUMNS,
  MAX_ROWS,
  resizeTo,
  sizeLimits,
  type LayoutItem,
} from './homeLayout';

interface Options {
  layout: LayoutItem[];
  widgetsById: ReadonlyMap<string, WidgetDefinition>;
  /** Replaces the draft layout and marks it as edited. */
  change: (next: LayoutItem[]) => void;
  /** Like `change`, but derives the next layout from the latest one (used while the pointer moves). */
  changeWith: (update: (current: LayoutItem[]) => LayoutItem[]) => void;
}

/** Corner-grip resizing for the tiles of the customiser, by pointer drag or arrow keys. */
export function useTileResize({ layout, widgetsById, change, changeWith }: Options) {
  const resizing = useRef<{
    id: string;
    x: number;
    y: number;
    cols: number;
    rows: number;
    colUnit: number;
    rowUnit: number;
  } | null>(null);

  /** Corner resize: the pointer's travel is turned into grid spans and snapped to the allowed sizes. */
  function startResize(event: PointerEvent<HTMLElement>, item: LayoutItem) {
    // The grip only renders inside a tile, and tiles only inside the grid.
    const tile = event.currentTarget.closest('article')!;
    const grid = tile.parentElement!;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    resizing.current = {
      id: item.id,
      x: event.clientX,
      y: event.clientY,
      cols: item.cols,
      rows: item.rows,
      colUnit: grid.getBoundingClientRect().width / GRID_COLUMNS || 1,
      rowUnit: tile.getBoundingClientRect().height / item.rows || 1,
    };
  }

  function moveResize(event: PointerEvent<HTMLElement>) {
    const start = resizing.current;
    if (!start) return;
    changeWith((current) =>
      resizeTo(
        current,
        start.id,
        start.cols + (event.clientX - start.x) / start.colUnit,
        start.rows + (event.clientY - start.y) / start.rowUnit,
        widgetsById.get(start.id),
      ),
    );
  }

  function endResize() {
    resizing.current = null;
  }

  function resizeWithKeys(event: KeyboardEvent<HTMLElement>, item: LayoutItem) {
    const widget = widgetsById.get(item.id);
    const { minCols, minRows } = sizeLimits(widget);
    const steps = COL_STEPS.filter((s) => s >= minCols);
    const step = steps.indexOf(item.cols as (typeof COL_STEPS)[number]);
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [steps[Math.max(0, step - 1)]!, item.rows],
      ArrowRight: [steps[Math.min(steps.length - 1, step + 1)]!, item.rows],
      ArrowUp: [item.cols, Math.max(minRows, item.rows - 1)],
      ArrowDown: [item.cols, Math.min(MAX_ROWS, item.rows + 1)],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    change(resizeTo(layout, item.id, move[0], move[1], widget));
  }

  return { startResize, moveResize, endResize, resizeWithKeys };
}

export type TileResize = ReturnType<typeof useTileResize>;
