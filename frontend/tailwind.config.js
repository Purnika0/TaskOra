/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
        fontFamily: {
            display: ['Syne',    'sans-serif'],
            body:    ['DM Sans', 'sans-serif'],
        },
        colors: {
            navy:   { DEFAULT: '#1a1f35', light: '#252c47', mid: '#2e3655' },
            cream:  { DEFAULT: '#f5f0e8', dark: '#ede8df', darker: '#e0d9ce' },
            taskora: { DEFAULT: '#3b6fd4', light: '#5b8dee' },
        },
        },
    },
    plugins: [],
}
