/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Require explicit class, not automatic detection
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      // TailwindCSS 4 uses @theme in CSS for most configuration
      colors: {
        // Explicit color overrides to ensure light mode
        background: 'hsl(0 0% 100%)',
        foreground: 'hsl(222 84% 5%)',
        card: 'hsl(0 0% 100%)',
        'card-foreground': 'hsl(222 84% 5%)',
      },
    },
  },
  plugins: [],
}
