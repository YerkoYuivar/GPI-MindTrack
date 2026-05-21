export type AppSlice = {
  ready: boolean;
  setReady: (v: boolean) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (t: 'light' | 'dark' | 'system') => void;
};

export const createAppSlice = (set: any): AppSlice => ({
  ready: false,
  setReady: (v) => set({ ready: v }),
  theme: 'system',
  setTheme: (t) => set({ theme: t }),
});
