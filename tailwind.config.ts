import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#10243e",
        navy: "#102f50",
        blue: "#1d5b8f",
        mist: "#eef5f9",
        line: "#d7e2ea",
        teal: "#167d7f",
        amber: "#ad6a00",
      },
      boxShadow: {
        soft: "0 16px 40px rgba(16, 47, 80, 0.08)",
      },
      borderRadius: {
        panel: "18px",
      },
    },
  },
  plugins: [],
};

export default config;
