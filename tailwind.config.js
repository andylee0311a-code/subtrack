export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // 這行最重要，代表掃描 src 下的所有元件
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}