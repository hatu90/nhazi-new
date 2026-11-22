import {defineTheme} from '@astryxdesign/core/theme';
import {neutralTheme} from '@astryxdesign/theme-neutral';

/**
 * Nhazi brand theme, derived from the house-N mark (#357d9d, a calm harbour teal-blue)
 * and its white glyph. Neutral stays the structural base; we swap the monochrome accent
 * for the brand blue and cool the greys slightly so surfaces feel related to the icon.
 */
export const nhaziTheme = defineTheme({
  name: 'nhazi',
  extends: neutralTheme,
  tokens: {
    // Brand accent (white-on-#357d9d is 4.6:1; dark mode flips to a light tint with dark text)
    '--color-accent': ['#357d9d', '#6bb8d8'],
    '--color-accent-muted': ['#dcedf4', '#1c3b4a'],
    '--color-on-accent': ['#ffffff', '#06202b'],
    '--color-text-accent': ['#2a6a86', '#8ecbe6'],
    '--color-icon-accent': ['#2a6a86', '#8ecbe6'],
    '--color-info': ['#357d9d', '#6bb8d8'],
    '--color-info-muted': ['#dcedf4', '#1c3b4a'],
    '--color-text-info': ['#2a6a86', '#8ecbe6'],
    '--color-on-info-muted': ['#174356', '#b6e0f1'],

    // Cool-tinted surfaces (white cards on a pale blue-grey page)
    '--color-background-body': ['#f0f5f8', '#0b1115'],
    '--color-background-muted': ['#f0f5f8', '#0b1115'],
    '--color-background-surface': ['#ffffff', '#131b21'],
    '--color-background-card': ['#ffffff', '#0f161b'],
    '--color-background-popover': ['#ffffff', '#131b21'],

    // Slightly cool text
    '--color-text-primary': ['#0f1c24', '#eaf2f6'],
    '--color-text-secondary': ['#475963', '#9db0ba'],
    '--color-icon-primary': ['#0f1c24', '#eaf2f6'],
    '--color-icon-secondary': ['#667a85', '#9db0ba'],
  },
});
