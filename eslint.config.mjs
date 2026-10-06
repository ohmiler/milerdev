import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  // Import boundaries that already hold today. They keep server-only code out of components
  // and keep lib from depending on the UI layer. Type-only imports are allowed.
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            "@/lib/db",
            "@/lib/auth",
            "@/lib/commerce/stripe",
            "@/lib/bunny/stream",
            "@/lib/notifications/email",
          ].map((name) => ({
            name,
            allowTypeImports: true,
            message:
              "Components must not import server-only modules. Pass data in as props or call an API route.",
          })),
          patterns: [
            {
              group: ["@/lib/db/*"],
              allowTypeImports: true,
              message: "Components must not import the database layer.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app", "@/app/*", "@/components", "@/components/*"],
              allowTypeImports: true,
              message: "src/lib must not depend on pages or components.",
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
    "playwright-report/**",
    "blob-report/**",
    "test-results/**",
    // Generated local artifacts
    "output/**",
    ".playwright-cli/**",
    // Utility scripts
    "scripts/**",
    // Local agent tooling and generated review state
    ".impeccable/**",
    ".superpowers/**",
  ]),
]);

export default eslintConfig;
