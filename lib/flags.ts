export const IS_PROD = import.meta.env.PROD;

export const ENABLE_DEMO_MODE = !IS_PROD;
export const ENABLE_EXTRAS = !IS_PROD;

const DEMO_STORAGE_KEY = 'is_demo_mode';

export const isDemoModeEnabled = () => {
  if (!ENABLE_DEMO_MODE) return false;
  return localStorage.getItem(DEMO_STORAGE_KEY) === 'true';
};

export const setDemoModeEnabled = (active: boolean) => {
  if (!ENABLE_DEMO_MODE) {
    localStorage.removeItem(DEMO_STORAGE_KEY);
    return;
  }
  if (active) localStorage.setItem(DEMO_STORAGE_KEY, 'true');
  else localStorage.removeItem(DEMO_STORAGE_KEY);
};

export const getRuntimeModeLabel = () => (isDemoModeEnabled() ? 'DÉMO' : 'PRODUCTION');
