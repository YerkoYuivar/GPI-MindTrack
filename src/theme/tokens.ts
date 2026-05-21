export const radius = { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, '2xl': 24 } as const;
export const spacing = { 0: 0, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, '2xl': 32 } as const;
export const elevation = { none: 0, sm: 2, md: 4, lg: 8 } as const;
export const z = { base: 0, dropdown: 10, modal: 100 } as const;
export type Tokens = { radius: typeof radius; spacing: typeof spacing; elevation: typeof elevation; z: typeof z };
export const tokens: Tokens = { radius, spacing, elevation, z };
