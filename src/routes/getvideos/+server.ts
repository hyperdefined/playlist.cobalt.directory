import { Client } from "youtubei";
const youtube = new Client();
const errorMessages = {
    noLink: "you forgot about the link!",
    invalidLink: "that doesn't look like a valid link, are you sure it's the right one?",
    catchedError: "something went wrong, please try again later and if this " +
        "still keeps happening, report this on codeberg. "
}

async function getVideos(playlistUrl): Promise<Array<string> | Response> {
    const playlistMatch = playlistUrl?.match(/PL[A-Za-z0-9_-]+/)

    if (!playlistUrl) {
        return new Response(errorMessages.noLink, { status: 400 })
    } else if (!playlistMatch) {
        return new Response(errorMessages.invalidLink, { status: 400 })
    }

    const playlistId = playlistMatch[0];
    const playlist = await youtube.getPlaylist(playlistId);
    if (playlist) {
        await playlist.videos.next(0);
        return playlist.videos.items.map(vid => `https://youtu.be/${vid.id}`);
    } else {
        return new Response(errorMessages.invalidLink, { status: 400 });
    }
}

export async function GET({ url }) {
    try {
        const playlistVideos = await getVideos(url.searchParams.get("url"));
        if (playlistVideos instanceof Response) {
            return playlistVideos;
        }
        return new Response(JSON.stringify(playlistVideos), {
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(errorMessages.catchedError + error.message, { status: 500 });
    }
}
