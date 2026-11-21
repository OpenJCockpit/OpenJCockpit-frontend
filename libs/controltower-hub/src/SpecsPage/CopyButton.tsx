import { useEffect, useState } from 'react';
import { useTranslation } from '@openjcockpit/i18n';
import { Button } from '@openjcockpit/ui';

interface Props {
  text: string;
  label: string;
}

/** Copies `text` to the clipboard and says so for a moment. Does nothing where the clipboard is unavailable. */
export function CopyButton({ text, label }: Props) {
  const { t } = useTranslation('controltower');
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => setCopied(true));
      }}
    >
      {copied ? t('specs.copied') : label}
    </Button>
  );
}
