// localStorage can be unavailable or throw (private mode, cleared site data,
// some webviews). Everything stored here is a cache the app can rebuild.
export const storage = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      window.localStorage.setItem(key, value);
    } catch { /* cache only */ }
  },
  remove(key: string): void {
    try {
      window.localStorage.removeItem(key);
    } catch { /* cache only */ }
  },
};
