/**
 * ============================================================================
 * THE ONLY FILE YOU EDIT.
 * ============================================================================
 *
 * Everything the video, the banner and the social card say about a project
 * lives here. Nothing else in `src/` is project specific, and nothing else in
 * `src/` should be edited to launch a project. If you find yourself wanting to
 * change a scene, the answer is almost always a different value in this file.
 *
 * The full contract, with the rules for writing a good tagline and for
 * capturing a demo, is in `TEMPLATE.md` one directory up. Read that first.
 *
 * The shape below is checked against `content-types.ts`. Run `npm run typecheck`
 * after editing; a missing field is a compile error, not a broken render.
 *
 * What is shipped here is a PLACEHOLDER for a fictional CLI called `trailhead`.
 * It renders correctly as-is, which is how you can verify the toolchain before
 * you have written a single line of your own. Replace all of it.
 */

import { fromAnsi } from "./ansi";
import type { Content } from "./content-types";

/**
 * Captured stdout, escape codes and all.
 *
 * HOW TO PRODUCE THIS FOR A REAL PROJECT
 *
 *   1. Run the command in a real terminal, forcing colour even though the
 *      output is being captured:
 *
 *        script -q /dev/null your-cli --your-flags > /tmp/capture.txt
 *
 *      (`script` gives the program a TTY, so tools that disable colour when
 *      piped keep it. On Linux the argument order is
 *      `script -q -c "your-cli --your-flags" /tmp/capture.txt`.)
 *
 *   2. Paste the file's contents between the backticks below, replacing every
 *      raw ESC byte (0x1b) with the six characters `\u001b`. Nothing else
 *      needs escaping except backticks and `${`.
 *
 *   3. Trim it. Twenty rows is a comfortable maximum; more than that and the
 *      buffer starts scrolling and the payoff arrives too late. Cut the
 *      warm-up, keep the result.
 *
 * The parser understands 16-colour, 256-colour and truecolor SGR codes, bold
 * and faint, tabs, and carriage returns (a progress bar collapses to its final
 * state). Cursor movement and window-title sequences are dropped. See
 * `ansi.ts`.
 *
 * Keep every line under about 100 columns. The type size is derived from the
 * widest line, so one runaway line shrinks the whole terminal.
 */
const CAPTURED_OUTPUT = `
\u001b[38;2;217;119;87m◆\u001b[0m \u001b[1m\u001b[38;5;253mtrailhead\u001b[0m                                    \u001b[38;5;242m12 branches · 3 stale · 1 ahead\u001b[0m

\u001b[1m\u001b[38;5;179m── Stale \u001b[0m\u001b[38;5;238m─────────────────────────────────────────────────────────────────────\u001b[0m

\u001b[38;5;238m  1\u001b[0m \u001b[38;5;139m●\u001b[0m \u001b[1m\u001b[38;5;253mfix/checkout-500\u001b[0m  \u001b[38;5;238m 9d ago\u001b[0m \u001b[38;5;248mFix the 500 on the checkout callback\u001b[0m   \u001b[38;5;74ma3f91c0\u001b[0m
\u001b[38;5;242m      ~/repos/shop-web  ·  ⎇ fix/checkout-500  ·  4 commits  ·  unmerged\u001b[0m
\u001b[38;5;238m      git switch fix/checkout-500\u001b[0m

\u001b[38;5;238m  2\u001b[0m \u001b[38;5;110m●\u001b[0m \u001b[1m\u001b[38;5;253mfeat/idempotency\u001b[0m  \u001b[38;5;238m12d ago\u001b[0m \u001b[38;5;248mAdd idempotency keys to charges\u001b[0m        \u001b[38;5;74m7be40c1\u001b[0m
\u001b[38;5;242m      ~/repos/payments-api  ·  ⎇ feat/idempotency  ·  11 commits  ·  unmerged\u001b[0m
\u001b[38;5;238m      git switch feat/idempotency\u001b[0m

\u001b[38;5;238m  3\u001b[0m \u001b[38;5;176m●\u001b[0m \u001b[1m\u001b[38;5;253mspike/edge-cache\u001b[0m  \u001b[38;5;238m21d ago\u001b[0m \u001b[38;5;248mTry the edge cache in front of API\u001b[0m     \u001b[38;5;74mc081ff5\u001b[0m
\u001b[38;5;242m      ~/repos/edge-proxy  ·  ⎇ spike/edge-cache  ·  2 commits  ·  unmerged\u001b[0m
\u001b[38;5;238m      git switch spike/edge-cache\u001b[0m

\u001b[38;5;238m  stale = no commits in 7 days   ·   --prune to delete   ·   --merged\u001b[0m
`;

export const content: Content = {
  /**
   * The project name, written exactly as it should appear: same casing, no
   * tagline glued on, no "v2". It sits next to the accent diamond on the end
   * card, the banner and the social card, and it is the window title unless
   * `windowTitle` says otherwise.
   */
  name: "trailhead",

  /**
   * THE PROMISE. One sentence, under about 60 characters, ending in a period.
   *
   * A good tagline says what the user gets, not what the software is. Test it
   * by reading it out loud after the name:
   *
   *   "trailhead. Every branch you left behind, in one list."   good
   *   "trailhead. A CLI tool for git branch management."        bad, it is a
   *                                                            category, not a
   *                                                            promise
   *
   * Avoid: "powerful", "seamless", "blazingly fast", "modern", "simple",
   * "the ultimate", and any sentence that would fit fifty other projects.
   */
  tagline: "Every branch you left behind, in one list.",

  /**
   * One line of plain prose, under about 100 characters. It is the fallback
   * first line of the cold open, and it is what a human would say if you asked
   * them what the thing does. No marketing voice.
   */
  description: "Lists every stale branch across your repos and how to get back to it.",

  /**
   * The single command that gets someone started, without a leading `$`. One
   * command only: if installation genuinely takes three steps, pick the one
   * that produces the first result and leave the rest to the README.
   */
  install: "npx trailhead",

  /**
   * Where it lives, written the way a human reads it, with no scheme and no
   * trailing slash: `github.com/user/repo`.
   */
  repoUrl: "github.com/example/trailhead",

  /**
   * The accent, one hex value. Everything accented in the frame follows it: the
   * diamond, the cursor, the prompt caret, the `$` in the install pill, and the
   * background wash.
   *
   * Leave it at the Claude coral `#d97757` unless the project already has a
   * brand colour of its own. A shared accent is what makes a shelf of these
   * assets read as one body of work.
   */
  accent: "#d97757",

  /**
   * Two to four claims, three or four words each, shown as one line on the
   * banner. They must be true and checkable: "read-only", "zero deps",
   * "offline", "no telemetry", "MIT". Not adjectives, not benefits.
   * Omit the field entirely rather than pad it.
   */
  highlights: ["read-only", "zero deps", "offline"],

  /**
   * The opening title cards, at most three lines, each under about 42
   * characters (longer lines get smaller type so they still fit).
   *
   * Structure that works: the situation, the cost, then the question the tool
   * answers. The last line is emphasised and gets the cursor, so it must be the
   * one worth reading. Omit the field to fall back to `description` then
   * `tagline`.
   */
  coldOpen: ["Twelve branches.", "Nothing merged.", "Which one was the hotfix?"],

  /** Title bar label. Defaults to `name`; set it if the binary differs. */
  windowTitle: "trailhead",

  /**
   * WHAT THE DEMO SHOWS. Exactly one of two shapes.
   *
   * kind: "terminal"  for anything that runs in a shell. One command is typed
   *                   at a prompt, then its real captured output builds in.
   *
   * kind: "screens"   for anything with a browser in it. Screenshots of the
   *                   running app, captured from a LOCAL dev server, cross
   *                   dissolving inside the same window chrome:
   *
   *                     demo: {
   *                       kind: "screens",
   *                       shots: [
   *                         { src: "screens/01-home.png", caption: "The editor" },
   *                         { src: "screens/02-run.png", caption: "One click to run" },
   *                       ],
   *                     }
   *
   * Both render through the same composition, the same cold open and the same
   * end card. Pick the one that shows the product doing its job in the fewest
   * seconds. TEMPLATE.md has the capture procedure for both.
   */
  demo: {
    kind: "terminal",
    /** Typed out on screen, so keep it short and copyable. No leading `$`. */
    command: "trailhead --stale 7d",
    /** The leading newline of the template literal is not part of the output. */
    lines: fromAnsi(CAPTURED_OUTPUT.replace(/^\n/, "")),
  },
};
