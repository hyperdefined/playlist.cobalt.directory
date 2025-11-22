# cobalt playlist downloader

a lot of people have been asking for this, so i made it. paste the link, download the first file, allow multiple file downloads if you didn't do that before and keep saving files until it finishes.

due to limitations, it can only download audio for now. i might host multiple instances to bypass them, but i'll need to finally set up cookies, which i can't really do right now.

## supported services

- youtube
- soundcloud

## api

if you want you can use the `/getvideos` endpoint with the `url` parameter being the link to the playlist, e.g. https://www.youtube.com/playlist?list=PLXQAAGoKe2_tobF3ioyI86AghVLmhf8wd

example curl command:

```shell
curl https://playlist.kwiatekmiki.pl/getvideos?url=https://www.youtube.com/playlist?list=PLXQAAGoKe2_tobF3ioyI86AghVLmhf8wd
```

example response:

```json
[
  "https://youtu.be/sIHgGLAWQFU",
  "https://youtu.be/qRs4xBPC4xw",
  "https://youtu.be/5FDM0tac-xA",
  "https://youtu.be/P3YjZbQT2-c",
  "https://youtu.be/_LNf4a37RSM",
  "https://youtu.be/8EGmZlGJWkg",
  "https://youtu.be/b4_FbH7xCmw",
  "https://youtu.be/JHnKOdSOhFQ"
]
```

video links are seperated by semicolons

## how to selfhost

```shell
git clone https://codeberg.org/kwiat/playlist
pnpm run build
node build
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
