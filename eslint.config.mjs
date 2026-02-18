import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Capacitor/iOS generated artifacts.
    "apps/ios-shell/node_modules/**",
    "apps/ios-shell/ios/DerivedData/**",
    "apps/ios-shell/ios/build/**",
  ]),
]);

export default eslintConfig;
