/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        'xs': ['0.855rem', { lineHeight: '1.18rem' }],
        'sm': ['0.985rem', { lineHeight: '1.38rem' }],
        'base': ['1.12rem', { lineHeight: '1.6rem' }],
        'lg': ['1.25rem', { lineHeight: '1.8rem' }],
        'xl': ['1.38rem', { lineHeight: '1.85rem' }],
        '2xl': ['1.65rem', { lineHeight: '2.15rem' }],
        '3xl': ['2.0625rem', { lineHeight: '2.45rem' }],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        slate: {
          950: '#050B1A',
          900: '#071126',
          850: '#091530',
          800: '#0B1730',
          750: '#101F3D',
          700: '#14264A',
          600: '#1C3360',
          500: '#536E9B',
          400: '#7E95BC',
          300: '#B0C2DD',
          200: '#DDE6F4',
          100: '#F4F7FB',
          50:  '#F8FAFC',
        },
        blue: {
          50:  '#EFF5FF',
          100: '#DBE8FE',
          200: '#BFD7FE',
          300: '#93BFFD',
          400: '#4A7CFF',
          500: '#245BFF',
          600: '#1B47DB',
          700: '#1536B0',
          800: '#132C8B',
          900: '#12256E',
          950: '#0A153E',
        },
        sky: {
          400: '#4A7CFF',
          500: '#245BFF',
          600: '#1B47DB',
        },
        violet: {
          DEFAULT: '#5146D8',
          400: '#6256E8',
          500: '#5146D8',
          600: '#4338CA',
        },
        plum: {
          DEFAULT: '#3B1430',
          900: '#280D21',
        },
      },
    },
  },
  plugins: [],
}

