# Security

## Reporting

Use GitHub's private vulnerability reporting on this repository, under Security, or open an issue if the problem is not sensitive. Expect an answer within a week.

## What this project handles

It takes a Spotify link, asks a public Spotify endpoint for a code image, and returns a file. It stores nothing, has no database, no accounts and no sessions. There are no required environment variables, so a fresh clone cannot start with an unlocked door.

The two optional credentials in `.env.example` are for song search, they are read only on the server, and the product works with none of them set.

## What the browser sends

The track identifier you paste is sent to Spotify to fetch the code image. Nothing else leaves the machine, and nothing is written down.
