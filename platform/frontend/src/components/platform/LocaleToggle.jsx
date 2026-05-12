import { useLocale } from '../../context/LocaleContext';
import { usePlatformI18n } from './platformText';

export default function LocaleToggle() {
  const { toggleLocale } = useLocale();
  const { t } = usePlatformI18n();

  return (
    <button
      onClick={toggleLocale}
      className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white transition hover:bg-white/10"
      type="button"
    >
      {t.localeSwitch}
    </button>
  );
}
