import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypeScript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "output/**",
      "next-env.d.ts",
    ],
  },
];

export default config;
