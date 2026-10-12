/** @type {import('tailwindcss').Config} */

/**
 * The pages use Tailwind's `slate-*` and `emerald-*` utilities in ~150 places,
 * but those scales are cool blue-grey and blue-green - they fought the logo
 * palette in index.css once it was retuned.
 *
 * Rather than rewrite every class name, the two scales are redefined here to
 * logo-tinted equivalents, so existing markup inherits the identity for free.
 * `slate` becomes a green-tinted grey and `emerald` centres on the logo green
 * (in light mode `emerald-600` is exactly `--primary`).
 *
 * Semantic scales (rose, amber) are deliberately left alone: they mean
 * error/warning, and they are the status colours, not brand colours.
 */

/* The two scales now resolve through CSS custom properties declared in
 * index.css (`--tw-w-*` neutral grey, `--tw-f-*` logo green), instead of literal hex.
 *
 * That is what lets dark mode reach the ~150 `slate-*`/`emerald-*` utility
 * classes already in the markup: index.css reverses each ramp under
 * `[data-theme="dark"]` and every one of those classes follows, with no class
 * name rewritten - the same trick this file already used to retint Tailwind's
 * stock scales.
 *
 * The `<alpha-value>` placeholder is required: it keeps Tailwind's opacity
 * modifiers (`bg-slate-900/5`, `border-emerald-800/50`) working, which a bare
 * `var(--x)` would break.
 */
const channels = (name) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((step) => [
      step,
      `rgb(var(--tw-${name}-${step}) / <alpha-value>)`,
    ])
  );

const warmGrey = channels("w");
const forest = channels("f");

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  corePlugins: {
    // Disabled to avoid resetting base element styles used across the
    // rest of the app (index.css already defines its own base styles).
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        slate: warmGrey,
        gray: warmGrey,
        emerald: forest,
        green: forest,

        // Named tokens, pointing at the custom properties in index.css so
        // they follow the theme like everything else.
        clay: "var(--clay)",
        sand: "var(--sand)",
        stone: "var(--stone)",
        paper: "var(--paper)",
        surface: "var(--surface)",
      },
    },
  },
  plugins: [],
};
