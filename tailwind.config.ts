import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Helvetica Neue',
          'Arial',
          'sans-serif'
        ],
        serif: [
          'Georgia',
          'Cambria',
          'Times New Roman',
          'Times',
          'serif'
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace'
        ]
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        todo: {
          DEFAULT: 'hsl(var(--todo-bg))'
        },
        complete: {
          DEFAULT: 'hsl(var(--complete-bg))'
        },
        taskIcon: {
          DEFAULT: 'hsl(var(--task-icon-bg))',
          foreground: 'hsl(var(--task-icon-foreground))'
        },
        sidebarIcon: {
          DEFAULT: 'hsl(var(--sidebar-icon-bg))',
          active: 'hsl(var(--sidebar-icon-active))'
        },
        productBoard: {
          DEFAULT: 'hsl(var(--product-bg))',
          column: 'hsl(var(--product-column-bg))',
          accent: 'hsl(var(--product-accent))'
        },
        priority: {
          high: 'hsl(var(--priority-high))',
          medium: 'hsl(var(--priority-medium))',
          low: 'hsl(var(--priority-low))'
        },
        brand: {
          teal: 'hsl(var(--brand-teal))',
          orange: 'hsl(var(--brand-orange))',
          green: 'hsl(var(--brand-green))',
          coral: 'hsl(var(--brand-coral))'
        },
        tab: {
          active: 'hsl(var(--tab-active))',
          inactive: 'hsl(var(--tab-inactive))'
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
        '3xl': '1.5rem'
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0'
          },
          to: {
            height: 'var(--radix-accordion-content-height)'
          }
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)'
          },
          to: {
            height: '0'
          }
        },
        'fade-in': {
          from: {
            opacity: '0',
            transform: 'translateY(4px)'
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        'slide-in': {
          from: {
            opacity: '0',
            transform: 'translateX(-8px)'
          },
          to: {
            opacity: '1',
            transform: 'translateX(0)'
          }
        },
        'border-shine': {
          '0%': {
            backgroundPosition: '200% 0'
          },
          '100%': {
            backgroundPosition: '-200% 0'
          }
        },
        'sparkle': {
          '0%': {
            opacity: '0',
            transform: 'scale(0) rotate(0deg)'
          },
          '50%': {
            opacity: '1',
            transform: 'scale(1) rotate(180deg)'
          },
          '100%': {
            opacity: '0',
            transform: 'scale(0) rotate(360deg)'
          }
        },
        'sparkle-glow': {
          '0%': {
            opacity: '0',
            transform: 'translate(-50%, -50%) scale(0.5)'
          },
          '50%': {
            opacity: '1',
            transform: 'translate(-50%, -50%) scale(1)'
          },
          '100%': {
            opacity: '0',
            transform: 'translate(-50%, -50%) scale(1.5)'
          }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
        'border-shine': 'border-shine 6s linear infinite',
        'sparkle': 'sparkle 1s ease-out forwards',
        'sparkle-glow': 'sparkle-glow 3s ease-out forwards'
      },
      boxShadow: {
        '2xs': 'var(--shadow-2xs)',
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)'
      }
    }
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
