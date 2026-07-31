# Trademarks and what you may do with the output

Spotify is a trademark of Spotify AB. This project is not affiliated with, endorsed by, or sponsored by Spotify AB.

## What this project does with Spotify's material

It asks Spotify's own public endpoint for the code image of a link you paste, reads the 23 bars out of it, and scales them uniformly. It never redraws them, never rounds them to a grid, never changes their spacing and never changes their proportions. The parser refuses a code whose bars are not evenly spaced or not centred, so a change at the endpoint fails a test here rather than producing a tag that does not scan.

## The rules this follows

Spotify's Terms and Conditions for Spotify Codes say, in their own words, that you are granted a licence to use and display Spotify Codes for the purpose of sharing content, that you are not allowed to sell or offer Spotify Codes as such, and that you are not allowed to modify a Spotify Code in any way. They also say that you shall not use a Spotify code directly on products to be sold, because it would imply an endorsement of your product.

Three consequences, plainly:

1. **Make one for yourself or for a friend.** That is sharing a piece of content, which is what the licence is for.
2. **Do not sell printed tags.** Not on Etsy, not at a market, not as a client deliverable. That is the line the terms draw, and it is between you and Spotify, not between you and this repository.
3. **Do not imply that Spotify, an artist or a label endorses anything.** Uploading a library of tags for popular songs to a model host reads exactly like that, which is why this project uploads one demo model and no more.

## Why the mark is off by default

Spotify's design guidelines forbid modifying the logo: no recolouring, no rotation, no outlining, no adding depth. Extruding it is adding depth. The bars are what a scanner reads, so the default builds them alone, and `--mark` exists for people who have read this file and decided for themselves. The flag's help text says so too.

## The licence of what comes out

The software is MIT. The Spotify Code inside the output belongs to Spotify. This project cannot grant you rights it does not hold, so the generated model is not stamped with a Creative Commons licence and never will be. If you want a model you can license freely, use a code that points at your own content.

## If you are Spotify

Open an issue or write to the address in [SECURITY.md](SECURITY.md), and say what you want changed. Everything here is one repository with one maintainer, and anything that turns out to be over the line will be changed or removed.
