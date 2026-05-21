const enabled = __DEV__;
const tag = (t: string) => `[EJ] ${t}`;
export const log = {
  debug: (t: string, ...a: any[]) => enabled && console.debug(tag(t), ...a),
  info: (t: string, ...a: any[]) => enabled && console.info(tag(t), ...a),
  warn: (t: string, ...a: any[]) => console.warn(tag(t), ...a),
  error: (t: string, ...a: any[]) => console.error(tag(t), ...a),
} as const;
