/**
 * Every string that describes the project itself lives here, because each of
 * them has more than one consumer: the README, the site footer, the OG card,
 * the npm description, the print instructions and the generated `llms.txt`.
 * One constant with six readers cannot drift. Six copies will.
 */

export const PROJECT = {
  name: "soundtag",
  /** Sentence case, used as the page title and the npm description. */
  tagline:
    "Turn a song link into a printable keychain tag: a 3MF with the filament change already assigned, an STL, and an SVG for laser.",
  repo: "https://github.com/noluyorAbi/soundtag",
  npm: "https://www.npmjs.com/package/soundtag",
  license: "MIT",
  /**
   * Required in six places by the trademark note in TRADEMARKS.md. Spotify is
   * a trademark of Spotify AB, and nothing here is done with their blessing.
   */
  disclaimer:
    "Not affiliated with, endorsed by, or sponsored by Spotify AB. Spotify is a trademark of Spotify AB.",
  /**
   * The one sentence that has to be true about every generated file. The code
   * artwork is Spotify's; this project cannot grant rights it does not hold.
   */
  outputRights:
    "The software is MIT. The Spotify Code inside the output belongs to Spotify, and this project does not and cannot grant you rights to it. Make a tag for yourself or for a friend. Selling printed tags is between you and Spotify.",
  /**
   * Sent as the User-Agent when the scannable endpoint is called, so that the
   * traffic is attributable to a named open source project rather than looking
   * like an anonymous scraper.
   */
  userAgent: "soundtag/0.1.0 (+https://github.com/noluyorAbi/soundtag)",
} as const;
