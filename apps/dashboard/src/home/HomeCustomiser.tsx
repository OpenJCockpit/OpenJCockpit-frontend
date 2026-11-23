import { useId, useMemo, useState, type DragEvent } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import type { WidgetDefinition } from '@openjcockpit/hub-contract';
import { Button, ModalShell } from '@openjcockpit/ui';
import { GLYPH, allowDrop, type Drag } from './customiserShared';
import { HomeTile } from './HomeTile';
import { WidgetLibrary } from './WidgetLibrary';
import { insertItem, moveItemTo, removeItem, type LayoutItem } from './homeLayout';
import { useTileResize } from './useTileResize';
import styles from './HomeCustomiser.module.scss';
import gridStyles from './HomeGrid.module.scss';

interface Props {
  initial: LayoutItem[];
  /** The layout "Reset" returns to. */
  defaultItems: LayoutItem[];
  widgets: readonly WidgetDefinition[];
  /** `isDefault` is true when the user reset and changed nothing after, so Home keeps following the defaults. */
  onDone: (layout: LayoutItem[], isDefault: boolean) => void;
  onCancel: () => void;
}

/**
 * Full-screen editor for the Home layout. Works on a draft: Done saves it, Cancel drops it.
 * Tiles reorder by dragging, drop onto the library to be removed, and library entries drop
 * onto the grid to be added; the buttons do the same for keyboard users.
 */
export function HomeCustomiser({ initial, defaultItems, widgets, onDone, onCancel }: Props) {
  const { t } = useTranslation('dashboard');
  const titleId = useId();
  const [layout, setLayout] = useState(initial);
  const [isDefault, setIsDefault] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [overLibrary, setOverLibrary] = useState(false);

  const widgetsById = useMemo(() => new Map(widgets.map((w) => [w.id, w])), [widgets]);
  const onHome = useMemo(() => new Set(layout.map((item) => item.id)), [layout]);

  function change(next: LayoutItem[]) {
    setLayout(next);
    setIsDefault(false);
  }

  function changeWith(update: (current: LayoutItem[]) => LayoutItem[]) {
    setLayout(update);
    setIsDefault(false);
  }

  const resize = useTileResize({ layout, widgetsById, change, changeWith });

  function endDrag() {
    setDrag(null);
    setOverId(null);
    setOverLibrary(false);
  }

  function dropOnTile(targetId: string) {
    if (drag?.kind === 'tile') change(moveItemTo(layout, drag.id, targetId));
    else if (drag?.kind === 'library') change(insertItem(layout, drag.widget, targetId));
    endDrag();
  }

  function dropOnGrid() {
    if (drag?.kind === 'library') change(insertItem(layout, drag.widget));
    endDrag();
  }

  function dropOnLibrary() {
    if (drag?.kind === 'tile') change(removeItem(layout, drag.id));
    endDrag();
  }

  function startDrag(event: DragEvent<HTMLElement>, next: Drag) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', next.id);
    setDrag(next);
  }

  return (
    <ModalShell
      labelledBy={titleId}
      onDismiss={onCancel}
      className={styles.surface}
      overlayClassName={styles.overlay}
    >
      <header className={styles.header}>
        <div>
          <h1 id={titleId}>{t('home.customiseTitle')}</h1>
          <p>{t('home.customiseHint')}</p>
        </div>
        <div className={styles.actions}>
          <Button
            onClick={() => {
              setLayout(defaultItems);
              setIsDefault(true);
            }}
            data-testid="home-reset"
          >
            {GLYPH.reset} {t('home.reset')}
          </Button>
          <Button onClick={onCancel} data-testid="home-cancel">
            {t('home.cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={() => onDone(layout, isDefault)}
            data-testid="home-done"
          >
            {GLYPH.check} {t('home.done')}
          </Button>
        </div>
      </header>

      <div className={styles.body}>
        <section
          className={styles.canvas}
          onDragOver={allowDrop}
          onDrop={(e) => {
            e.preventDefault();
            dropOnGrid();
          }}
        >
          <div className={gridStyles.grid} data-testid="home-grid">
            {layout.map((item, index) => {
              const widget = widgetsById.get(item.id);
              if (!widget) return null;
              return (
                <HomeTile
                  key={item.id}
                  item={item}
                  index={index}
                  layout={layout}
                  widget={widget}
                  title={String(t(widget.titleKey as never))}
                  dragging={drag?.id === item.id}
                  dropTarget={Boolean(drag && drag.id !== item.id && overId === item.id)}
                  resize={resize}
                  onChange={change}
                  onDragEnter={() => drag && setOverId(item.id)}
                  onDrop={() => dropOnTile(item.id)}
                  onStartDrag={(e) => startDrag(e, { kind: 'tile', id: item.id })}
                  onEndDrag={endDrag}
                />
              );
            })}
          </div>
        </section>

        <WidgetLibrary
          widgets={widgets}
          placed={onHome}
          dragKind={drag?.kind}
          overLibrary={overLibrary}
          onOverLibrary={setOverLibrary}
          onDropToRemove={dropOnLibrary}
          onStartDrag={(e, widget) => startDrag(e, { kind: 'library', id: widget.id, widget })}
          onEndDrag={endDrag}
          onAdd={(widget) => change(insertItem(layout, widget))}
        />
      </div>
    </ModalShell>
  );
}
