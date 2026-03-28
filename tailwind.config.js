/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', "sans-serif"]
      },
      colors: {
        primary: {
          DEFAULT: "#2D60FF",
          light: "#6A89FF",
          dark: "#1A40BD"
        },
        success: {
          DEFAULT: "#10B981",
          light: "#34D399"
        },
        warning: {
          DEFAULT: "#F59E0B",
          light: "#FBBF24"
        },
        danger: {
          DEFAULT: "#EF4444",
          light: "#F87171"
        },
        info: {
          DEFAULT: "#8B5CF6",
          light: "#A78BFA"
        },
        gray: {
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827"
        },
        "text-primary": "#1E232C",
        "text-secondary": "#8B929A",
        "text-tertiary": "#A5ABB3",
        "bg-primary": "#F7F9FC",
        "bg-card": "#FFFFFF",
        "border-light": "#F1F2F4"
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        "card-hover": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
      },
      borderRadius: {
        none: "0px",
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
        "3xl": "32px",
        "4xl": "40px",
        full: "9999px"
      }
    }
  },
  plugins: []
};
