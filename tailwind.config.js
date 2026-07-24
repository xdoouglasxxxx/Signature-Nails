/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#121C2C',      // fundo profundo do vídeo (azul-petróleo quente)
        gold: '#B18B5E',      // bronze/caramelo dominante do vídeo
        goldlight: '#E5CDA6', // champanhe (brilhos quentes do vídeo)
        cream: '#F8F0E4',     // fundo claro aquecido
        bronze: '#7B5F45',    // tom de apoio (madeira/bronze escuro)
        // ---- tema dark do painel (Ouro Edition) ----
        ink: '#0A0F1A',       // fundo profundo do painel
        panel: '#131E2E',     // superfície dos cards
        champagne: '#C9A96E', // ouro do painel dark
        mist: '#8896A8',      // texto secundário no dark
        pearl: '#F0EDE5',     // texto principal no dark
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
