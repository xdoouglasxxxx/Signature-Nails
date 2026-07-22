/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#121C2C',      // fundo profundo do vídeo (azul-petróleo quente)
        gold: '#B18B5E',      // bronze/caramelo dominante do vídeo
        goldlight: '#E5CDA6', // champanhe (brilhos quentes do vídeo)
        cream: '#F8F0E4',     // fundo claro aquecido
        bronze: '#7B5F45',    // tom de apoio (madeira/bronze escuro)
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
