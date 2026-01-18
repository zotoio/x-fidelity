/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // X-Fidelity/Docusaurus theme colors
        primary: {
          DEFAULT: 'var(--xfi-color-primary)',
          dark: 'var(--xfi-color-primary-dark)',
          light: 'var(--xfi-color-primary-light)',
        },
        background: {
          DEFAULT: 'var(--xfi-background)',
          secondary: 'var(--xfi-background-secondary)',
          elevated: 'var(--xfi-background-elevated)',
          lighter: 'var(--xfi-background-lighter)',
        },
        foreground: {
          DEFAULT: 'var(--xfi-foreground)',
          muted: 'var(--xfi-foreground-muted)',
        },
        border: 'var(--xfi-border)',
        accent: 'var(--xfi-accent)',
      },
      fontFamily: {
        sans: ['var(--xfi-font-family)', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['var(--xfi-font-family-mono)', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
