# cobalt playlist downloader

this is a fork of [kwiat's cobalt playlist downloader](https://codeberg.org/kwiat/playlist).

## supported services

- youtube
- soundcloud

## api

if you want you can use the `/getlinks` endpoint with the `url` parameter being the link to the playlist, e.g. https://www.youtube.com/playlist?list=PLXQAAGoKe2_tobF3ioyI86AghVLmhf8wd

example curl command:

```shell
curl https://playlist.cobalt.directory/getlinks?url=https://www.youtube.com/playlist?list=PLXQAAGoKe2_tobF3ioyI86AghVLmhf8wd
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

if you want to self host with your own cobalt instance, you can either use docker or npm.

### docker

```yaml
services:
  cobalt_playlist:
    image: ghcr.io/hyperdefined/playlist.cobalt.directory:latest
    restart: unless-stopped
    container_name: cobalt_playlist
    environment:
      - COBALT_API_KEY=xxx
      - COBALT_API=https://cobalt-backend.canine.tools
      - PUBLIC_COBALT_API_DISPLAY=cobalt.canine.tools
    ports:
      - 127.0.0.1:3000:3000 # reverse proxy to port 3000, change the first port if it's taken
```

### npm

```shell
git clone https://github.com/hyperdefined/playlist.cobalt.directory.git
npm i
cp .env.example .env
```

afterwards, edit the env to your desire. start with `npm run dev`.

### environment variables

3 environment variables are required

| env                         | description                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `COBALT_API_KEY`            | the api key to your cobalt api                                                                               |
| `COBALT_API`                | the full URL to your cobalt api, include `https://`                                                          |
| `PUBLIC_COBALT_API_DISPLAY` | on the homepage, display this as the cobalt backend. this tells users which instance it's pulling media from |
| `MAX_ITEMS`                 | limit how long a playlist can be to download                                                                 |
