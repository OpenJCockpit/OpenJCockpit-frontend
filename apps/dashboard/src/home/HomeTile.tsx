import type { DragEvent } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import type { WidgetDefinition } from '@openjcockpit/hub-contract';
import { Button, Panel, cssVars, cx } from '@openjcockpit/ui';
import { RemoteSlot } from '../federation/RemoteSlot';
import { GLYPH, allowDrop } from './customiserShared';
import { moveItem, removeItem, type LayoutItem } from './homeLayout';
import type { TileResize } from './useTileResize';
import styles from './HomeCustomiser.module.scss';
import gridStyles from './HomeGrid.module.scss';

interface Props {
  item: LayoutItem;
  index: number;
  /** The whole draft layout, so the move buttons can compute their result and their disabled state. */
  layout: LayoutItem[];
  widget: WidgetDefinition;
  title: string;
  dragging: boolean;
  dropTarget: boolean;
  resize: TileResize;
  onChange: (next: LayoutItem[]) => void;
  onDragEnter: () => void;
  onDrop: () => void;
  /** Called by the drag handle, after the tile has been set as the drag image. */
  onStartDrag: (event: DragEvent<HTMLElement>) => void;
  onEndDrag: () => void;
}

/** One tile of the draft layout: the live widget plus its remove, move, drag and resize controls. */
export function HomeTile({
  item,
  index,
  layout,
  widget,
  title,
  dragging,
  dropTarget,
  resize,
  onChange,
  onDragEnter,
  onDrop,
  onStartDrag,
  onEndDrag,
}: Props) {
  const { t } = useTranslation('dashboard');
  // The per-tile move buttons, each disabled at its end.
  const controls = [
    {
      id: 'earlier',
      label: t('home.moveEarlier'),
      off: index === 0,
      next: moveItem(layout, item.id, -1),
    },
    {
      id: 'later',
      label: t('home.moveLater'),
      off: index === layout.length - 1,
      next: moveItem(layout, item.id, 1),
    },
  ] as const;

  return (
    <Panel
      as="article"
      className={cx(
        gridStyles.tile,
        styles.tile,
        dragging && styles.dragging,
        dropTarget && styles.dropTarget,
      )}
      {...cssVars({ '--cols': item.cols, '--rows': item.rows })}
      onDragEnter={onDragEnter}
      onDragOver={allowDrop}
      onDrop={(e: DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop();
      }}
      data-testid={`widget-${widget.id}`}
      data-cols={item.cols}
      data-rows={item.rows}
    >
      <header className={gridStyles.tileHeader}>
        <h2 className={gridStyles.tileTitle}>{title}</h2>
        <Button
          size="sm"
          className={styles.remove}
          aria-label={`${t('home.remove')}: ${title}`}
          title={t('home.remove')}
          onClick={() => onChange(removeItem(layout, item.id))}
          data-testid={`widget-remove-${widget.id}`}
        >
          {' '}
          {GLYPH.remove}{' '}
        </Button>
      </header>
      <div className={cx(gridStyles.tileBody, styles.tileBody)}>
        <RemoteSlot item={widget} />
      </div>
      <div className={styles.controls}>
        <span
          className={styles.handle}
          title={t('home.dragHandle')}
          aria-hidden="true"
          draggable
          onDragStart={(e: DragEvent<HTMLElement>) => {
            // Only the handle starts a drag, but the whole tile is what is shown moving.
            e.dataTransfer.setDragImage(e.currentTarget.closest('article')!, 24, 24);
            onStartDrag(e);
          }}
          onDragEnd={onEndDrag}
          data-testid={`widget-handle-${widget.id}`}
        >
          {GLYPH.handle}
        </span>
        {controls.map(({ id, label, off, next }) => (
          <Button
            key={id}
            size="sm"
            aria-label={`${label}: ${title}`}
            title={label}
            disabled={off}
            onClick={() => onChange(next)}
            data-testid={`widget-${id}-${widget.id}`}
          >
            {GLYPH[id]}
          </Button>
        ))}
      </div>
      <button
        type="button"
        className={styles.grip}
        aria-label={`${t('home.resize')}: ${title}`}
        title={t('home.resizeHint')}
        onPointerDown={(e) => resize.startResize(e, item)}
        onPointerMove={resize.moveResize}
        onPointerUp={resize.endResize}
        onPointerCancel={resize.endResize}
        onKeyDown={(e) => resize.resizeWithKeys(e, item)}
        data-testid={`widget-resize-${widget.id}`}
      >
        {GLYPH.grip}
      </button>
    </Panel>
  );
}
