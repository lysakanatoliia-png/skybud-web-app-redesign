/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			// CRM Theme Colors using CSS variables
  			theme: {
  				// background colors
  				'bg-primary': 'var(--color-bg)',
  				'bg-secondary': 'var(--color-surface)',
  				'bg-tertiary': 'var(--color-asphalt)',
  				'bg-card': 'var(--color-surface)',
  				'bg-hover': 'var(--color-asphalt)',
  				'bg-panel': 'var(--color-panel)',
				
				// text colors
				'text-primary': 'var(--color-text-strong)',
				'text-secondary': 'var(--color-text)',
				'text-muted': 'var(--color-text-muted)',
				'text-dim': 'var(--color-text-dim)',
				
				// accent colors
				'accent': 'var(--color-orange)',
				'accent-hover': 'var(--color-orange-2)',
				'accent-primary': 'var(--color-orange-primary)',
				'accent-secondary': 'var(--color-orange-secondary)',
				
				// border colors
				'border': 'var(--color-border)',
				'border-light': 'var(--color-border-2)',
				
				// status colors
				'success': 'var(--color-success)',
				'warning': 'var(--color-warning)',
				'error': 'var(--color-danger)',
				'info': 'var(--color-info)'
  			},
  			// legacy support
  			bg: 'var(--color-bg)',
  			element: 'var(--color-surface)',
  			sub: 'var(--color-text-muted)',
  			primary: {
  				DEFAULT: 'var(--color-orange-primary)',
  				foreground: 'var(--color-text-strong)'
  			},
  			secondary: {
  				DEFAULT: 'var(--color-asphalt)',
  				foreground: 'var(--color-text)'
  			},
  			background: 'var(--color-bg)',
  			foreground: 'var(--color-text-strong)',
  			card: {
  				DEFAULT: 'var(--color-surface)',
  				foreground: 'var(--color-text-strong)'
  			},
  			popover: {
  				DEFAULT: 'var(--color-surface)',
  				foreground: 'var(--color-text-strong)'
  			},
  			muted: {
  				DEFAULT: 'var(--color-asphalt)',
  				foreground: 'var(--color-text-muted)'
  			},
  			accent: {
  				DEFAULT: 'var(--color-orange)',
  				foreground: 'var(--color-text-strong)'
  			},
  			destructive: {
  				DEFAULT: 'var(--color-danger)',
  				foreground: 'var(--color-text-strong)'
  			},
  			border: 'var(--color-border)',
  			input: 'var(--color-asphalt)',
  			ring: 'var(--color-orange)',
  			chart: {
  				'1': 'var(--color-orange)',
  				'2': 'var(--color-orange-2)',
  				'3': 'var(--color-orange-primary)',
  				'4': 'var(--color-text)',
  				'5': 'var(--color-text-muted)'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [],
}