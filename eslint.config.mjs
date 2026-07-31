import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * eslint-config-next ships flat configs directly from v15 on, so there is no
 * FlatCompat shim here.
 */
const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "assets/**",
      "next-env.d.ts",
      // Bundled CLI and library output. It is generated, it is gitignored, and
      // linting a bundle reports dead code that only exists because of tree
      // shaking.
      "dist/**",
      "*.tsbuildinfo",
      "planning/**",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // The geometry and exporter code is deliberately explicit about types.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // The page is statically prerendered, so the query string exists only in
    // the browser. Reading it during render would make the first client render
    // differ from the server's HTML, which is a hydration error, so a shared
    // configuration can only be applied after mount. That is what an effect is
    // for, and the rule cannot tell this case from a cascading render.
    //
    // Scoped to the one component that reads the URL. Everything else stays
    // under the rule.
    files: ["src/components/Configurator.tsx"],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
];

export default config;
