# Changelog

The format is [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows semantic versioning.

## 0.1.0

First release.

- Reads a Spotify Code from a link, a URI or a bare id, and refuses one whose bars have moved
- Builds five shapes: bar, coin, card, ornament, magnet
- Exactly one filament change, asserted at build time rather than claimed
- 3MF with both parts named and assigned to filament 1 and 2, opened and round tripped through Bambu Studio's CLI
- Binary STL and a laser SVG with separate cut and engrave layers
- Batch packing of several tags onto one plate
- Filament contrast check and the exact change layer for a given layer height
- A command line tool and a typed library entry, both from the same functions the site uses
- 91 tests, no geometry, ZIP, 3MF or CSS dependency
