import type { ReactNode } from 'react';
import { AppHeader, AppShell } from '../AppShell/AppShell';
import { IconBox } from '../IconBox/IconBox';
import { pageClass, pageHeaderClass } from '../Page/Page';

interface HubPageProps {
  /** The hub's icon, as the element for `IconBox` (usually `<Icon name="…" />`). */
  icon: ReactNode;
  title: ReactNode;
  /** A line under the title: a description or a status chip. */
  subtitle?: ReactNode;
  /** The host's shared header; when absent a header with a back button is rendered. */
  header?: ReactNode;
  onBack: () => void;
  backTitle?: string;
  /** Page tabs, shown under the title. */
  tabs?: ReactNode;
  children: ReactNode;
}

/** The chrome every hub page shares: host header (or a back header), title row, optional tabs, content. */
export function HubPage({
  icon,
  title,
  subtitle,
  header,
  onBack,
  backTitle,
  tabs,
  children,
}: HubPageProps) {
  return (
    <AppShell>
      {header ?? <AppHeader onBack={onBack} backTitle={backTitle} />}
      <main className={pageClass}>
        <div className={pageHeaderClass}>
          <div>
            <h1>
              <IconBox label={icon} compact /> {title}
            </h1>
            {subtitle}
          </div>
        </div>
        {tabs}
        {children}
      </main>
    </AppShell>
  );
}
