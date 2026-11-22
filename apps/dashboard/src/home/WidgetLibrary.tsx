import { useState, type DragEvent } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import { useAppRegistry, type WidgetDefinition } from '@openjcockpit/hub-contract';
import { Button, Icon, IconBox, cx, formInputClass } from '@openjcockpit/ui';
import { GLYPH, allowDrop, type Drag } from './customiserShared';
import styles from './HomeCustomiser.module.scss';

interface Props {
  widgets: readonly WidgetDefinition[];
  /** Ids of the widgets already on the draft layout. */
  placed: ReadonlySet<string>;
  dragKind: Drag['kind'] | undefined;
  overLibrary: boolean;
  onOverLibrary: (over: boolean) => void;
  /** A tile was dropped on the library: remove it from the layout. */
  onDropToRemove: () => void;
  onStartDrag: (event: DragEvent<HTMLElement>, widget: WidgetDefinition) => void;
  onEndDrag: () => void;
  onAdd: (widget: WidgetDefinition) => void;
}

/** The searchable, filterable list of widgets that can be added to Home. Also the drop zone that removes a tile. */
export function WidgetLibrary({
  widgets,
  placed,
  dragKind,
  overLibrary,
  onOverLibrary,
  onDropToRemove,
  onStartDrag,
  onEndDrag,
  onAdd,
}: Props) {
  const { t } = useTranslation('dashboard');
  const { allApps } = useAppRegistry();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const text = (key: string) => String(t(key as never));
  const appLabel = (id: string) => {
    const app = allApps.find((a) => a.id === id);
    return app ? text(app.labelKey) : id;
  };
  const categoryOf = (w: WidgetDefinition) =>
    w.categoryKey ? text(w.categoryKey) : appLabel(w.sourceAppId);
  const sizeOf = (w: WidgetDefinition) => {
    const cols = w.cols ?? 2;
    if (cols <= 1) return t('home.sizeCompact');
    if (cols <= 2) return t('home.sizeStandard');
    if (cols <= 4) return t('home.sizeWide');
    return t('home.sizeFull');
  };

  const categoryCounts = new Map<string, number>();
  for (const w of widgets) {
    categoryCounts.set(categoryOf(w), (categoryCounts.get(categoryOf(w)) ?? 0) + 1);
  }

  const needle = query.trim().toLowerCase();
  const visible = widgets.filter((w) => {
    if (category && categoryOf(w) !== category) return false;
    if (!needle) return true;
    return [text(w.titleKey), w.descriptionKey ? text(w.descriptionKey) : '', categoryOf(w)].some(
      (value) => value.toLowerCase().includes(needle),
    );
  });

  return (
    <aside
      className={cx(styles.library, dragKind === 'tile' && overLibrary && styles.libraryDrop)}
      aria-label={t('home.libraryTitle')}
      data-testid="home-library"
      onDragOver={allowDrop}
      onDragEnter={() => onOverLibrary(true)}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onOverLibrary(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDropToRemove();
      }}
    >
      <div className={styles.libraryHead}>
        <h2>{t('home.libraryTitle')}</h2>
        <p>{dragKind === 'tile' ? t('home.dropToRemove') : t('home.librarySubtitle')}</p>
        <input
          type="search"
          className={formInputClass}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('home.search')}
          aria-label={t('home.search')}
          data-testid="library-search"
        />
        <div className={styles.chips}>
          <Button
            size="sm"
            aria-pressed={category === null}
            className={cx(styles.chip, category === null && styles.chipActive)}
            onClick={() => setCategory(null)}
          >
            {t('home.all')} <span>{widgets.length}</span>
          </Button>
          {[...categoryCounts].map(([label, count]) => (
            <Button
              key={label}
              size="sm"
              aria-pressed={category === label}
              className={cx(styles.chip, category === label && styles.chipActive)}
              onClick={() => setCategory(category === label ? null : label)}
            >
              {label} <span>{count}</span>
            </Button>
          ))}
        </div>
      </div>

      <ul className={styles.list}>
        {visible.length === 0 && <li className={styles.empty}>{t('home.noMatches')}</li>}
        {visible.map((widget) => {
          const onHome = placed.has(widget.id);
          return (
            <li
              key={widget.id}
              className={styles.entry}
              draggable={!onHome}
              onDragStart={(e) => !onHome && onStartDrag(e, widget)}
              onDragEnd={onEndDrag}
              data-testid={`library-${widget.id}`}
            >
              <IconBox label={<Icon name="grid" />} compact />
              <div className={styles.entryText}>
                <strong>{text(widget.titleKey)}</strong>
                {widget.descriptionKey && <span>{text(widget.descriptionKey)}</span>}
                <small>
                  {categoryOf(widget)} · {sizeOf(widget)}
                </small>
              </div>
              {onHome ? (
                <span className={styles.badge}>
                  {GLYPH.check} {t('home.onHome')}
                </span>
              ) : (
                <Button
                  size="sm"
                  onClick={() => onAdd(widget)}
                  data-testid={`widget-add-${widget.id}`}
                >
                  {GLYPH.plus} {t('home.add')}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
