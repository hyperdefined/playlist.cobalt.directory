import { Client } from "youtubei";
import { Soundcloud } from "soundcloud.ts";

const youtube = new Client();
const soundcloud = new Soundcloud();

const errorMessages = {
    noLink: "you forgot about the link!",
    invalidLink: "that doesn't look like a valid link, are you sure it's the right one?",
    catchedError: "something went wrong, please try again later and if this " +
        "still keeps happening, report this on codeberg. "
}

async function getYouTubeVideos(playlistId: string): Promise<Array<string> | Response> {
    const playlist = await youtube.getPlaylist(playlistId);
    if (playlist) {
        await playlist.videos.next(0);
        return playlist.videos.items.map(vid => `https://youtu.be/${vid.id}`);
    } else {
        return new Response(errorMessages.invalidLink, { status: 400 });
    }
}

async function getSoundcloudTracks(playlistUrl: string): Promise<Array<string> | Response> {
    const playlist = await soundcloud.playlists.get(playlistUrl);
    if (playlist) {
        return playlist.tracks.map(track => track.permalink_url)
    } else {
        return new Response(errorMessages.invalidLink, { status: 400 });
    }
}

export async function GET({ url }) {
    try {
        const playlistUrl = await url.searchParams.get("url") || "";
        if (playlistUrl == "") {
            return new Response(errorMessages.noLink, { status: 400 })
        }

        const youtubeMatch = playlistUrl?.match(/PL[A-Za-z0-9_-]+/);
        const soundcloudMatch = playlistUrl?.match(/soundcloud\.com\/[a-z0-9-_]+\/sets\/[a-z0-9-_]+/);
        let playlistVideos;

        if (youtubeMatch) {
            playlistVideos = await getYouTubeVideos(youtubeMatch[0]);
        } else if (soundcloudMatch) {
            playlistVideos = await getSoundcloudTracks(playlistUrl);
        } else {
            return new Response(errorMessages.invalidLink, { status: 400 });
        }

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
