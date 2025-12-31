/** @type {import('tailwindcss').Config} */

// const colors = {
//   background: "#F7F6F8",
//   "gray-light-line": "#E3E3E3",
//   "gray-light-text": "#A3A3A3",
//   "gray-light-order": "#B5B7BD",
//   "cian-dark": "rgba(0, 0, 0, .3)",
//   gray: "#142249",
//   "gray-light-05": "rgba(20, 34, 73, .05)",
//   "gray-background": "#0E1833",
//   "gray-dark": "#282A3A",
//   cian: "#38D2D9",
//   white: "#fff",
//   "white-light": "rgba(255, 255, 255, .3)",
//   "white-light-5": "rgba(255, 255, 255, .05)",
//   green: "#49D294",
//   red: "#E74C3C",
//   line: "rgba(255, 255, 255, .1)",
//   modalTitle: "#777986",
//   yellow: "#F6BC4D",
//   confirmBackground: "#EAEAEA",
//   borderInput: "#3B4C7E",
//   lineBorder: "#707070",
//   box: "#F2F2F2",
//   boxText: "#999999",
//   loginBackground: "#142249",
//   colorLogin: "#fff",
// };

// const setup = [
//   {
//     name: 'Cone Banx',
//     host: "conebanx.com.br",
//     named: 'vfbank',
//     client_id: "ecd982cc-f3b8-4331-a072-88f6366fa41b",
//     colors: {
//       ...colors,
//       "cian-dark": "rgba(255, 255, 255, 0.8)",
//       gray: "#696a6e",
//       // "gray": 'white',
//       cian: "#e2af0d",
//       // "yellow": '#e2af0d',
//       green: "#e2af0d",
//       loginBackground: "#696a6e",
//     },
//   },
// ];

// const client = setup.find(cl => window.location.host.includes(cl.host)) || setup[0];

module.exports = {
	content: ["./src/**/*.{js,jsx,ts,tsx}"],
	theme: {
		extend: {
			screens: {
				xs: "480px",
				"2xs": "800px",
				xm: "1128px",
				"2xm": "1280px",
				hd: "1366px",
				"2hd": "1600px",
				"3hd": "1760px",
				"full-hd": "1920px",
				"3xl": "2000",
				"3xl-hd": "2000px",
				"3-2-laptop": "2256px",
				qhd: "2560px",
				"studio-laptop": "2880px",
				"qhd-plus": "3200px",
				"4k": "3840px",
				"5k": "5120px",
			},
			margin: {
				"1p": "1%",
				"3p": "3%",
				"5p": "5%",
				"8p": "8%",
			},
			fontFamily: {
				montserrat: ["Montserrat", "sans-serif"],
				asap: ['"Asap"', "sans-serif"],
			},
			colors: {
				// ... outras cores ...
				darkgoldenrod: "#009EE2", // Descomente esta linha
				goldenrod: "#009EE2", // Descomente esta linha
				"custom-blue": "#009ee2",
				"custom-dark-blue": "#03142E",
				"custom-red": "#DC0000",
				"custom-yellow": "#ffd33d",
				'vilablue': {
					500: '#3B82F6',
					600: '#2563EB'
				  },
				  'green': {
					50: '#f0fdf4',
					100: '#dcfce7',
					500: '#10b981',
					600: '#059669'
				  },
				  'blue': {
					50: '#eff6ff',
					100: '#dbeafe',
					500: '#3b82f6',
					600: '#2563eb',
					700: '#1d4ed8',
					800: '#1e40af'
				  },
				  'yellow': {
					100: '#fef9c3',
					500: '#eab308',
					600: '#ca8a04'
				  },
				  'red': {
					100: '#fee2e2',
					500: '#ef4444',
					600: '#dc2626'
				  },
				  animation: {
					fadeIn: 'fadeIn 0.3s',
				  },
				  keyframes: {
					fadeIn: {
					  from: { opacity: 0 },
					  to: { opacity: 1 }
					}
				  }
				
				// ... outras cores ...
			},
			// colors: {
			//   "gray-light-line": "var(--gray-light-line)",
			//   "gray-light-text": "var(--gray-light-text)",
			//   "gray-light-order": "var(--gray-light-order)",
			//   "cian-dark":"var(--cian-dark)",
			//   "gray": "var(--gray)",
			//   "gray-light-05":"var(--gray-light-05)",
			//   "gray-background": "var(--gray-background)",
			//   background: "var(--background)",
			//   "gray-dark": "var(--gray-dark)",
			//   "cian": "var(--cian)",
			//   "white":"var(--white)",
			//   "white-light":"var(--white-light)",
			//   "white-light-5": "var(--white-light-5)",
			//   "green":"var(--green)",
			//   "red": "var(--red)",
			//   "line": "var(--line)",
			//   "modalTitle": "var(--modalTitle)",
			//   "yellow": "var(--yellow)",
			//   "confirmBackground": "var(--confirmBackground)",
			//   "borderInput" :"var(--borderInput)",
			//   "lineBorder": "var(--lineBorder)",
			//   box: "var(--box)",
			//   boxText: "var(--boxText)",
			//   loginBackground: "var(--loginBackground)",
			//   colorLogin: "var(--colorLogin)",
			// },
		},
	},
	plugins: [],
};
