import { getRequestConfig } from 'next-intl/server';
import { DEFAULT_LOCALE } from '@yildirim/shared';

// Arabic-only at launch; when more locales ship, resolve from the request here.
export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
