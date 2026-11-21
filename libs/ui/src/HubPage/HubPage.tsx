import type { ReactNode } from 'react';
import { AppHeader, AppShell } from '../AppShell/AppShell';
import { Eyebrow } from '../Panel/Panel';
import { pageClass, pageHeaderClass } from '../Page/Page';

interface HubPageProps {
  /** The small label above the title naming the hub, as the workflow and spec pages do. */
  eyebrow: ReactNode;
  /** The page heading: the selected project's name, as on the workflow and spec pages. */
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
  eyebrow,
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
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1>{title}</h1>
            {subtitle}
          </div>
        </div>
        {tabs}
        {children}
      </main>
    </AppShell>
  );
}
