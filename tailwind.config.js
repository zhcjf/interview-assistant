/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#4F6EF7',
          hover: '#3A56D4',
        },
        success: '#52C41A',
        warning: '#FAAD14',
        danger: '#FF4D4F',
        info: '#1890FF',
        content: '#F5F7FA',
        card: '#FFFFFF',
        border: '#E8ECF1',
        text: {
          primary: '#1A2332',
          secondary: '#5A6A7E',
          tertiary: '#8C9AB0',
        },
        sidebar: {
          bg: '#1E2634',
          hover: '#253042',
          active: '#2D3748',
          text: '#B0BEC5',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.10)',
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}
