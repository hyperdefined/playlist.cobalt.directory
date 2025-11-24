import { Client } from "youtubei";
import { Soundcloud } from "soundcloud.ts";
import type { RequestHandler } from "@sveltejs/kit";

const youtube = new Client();
const soundcloud = new Soundcloud();

const errorMessages = {
  noLink: "you forgot about the link!",
  invalidLink:
    "that doesn't look like a valid link, are you sure it's the right one?",
  catchedError:
    "something went wrong, please try again later and if this still keeps happening, report this on codeberg. ",
} as const;

type VideoListResult = string[] | Response;

function errorResponse(message: string, status = 400): Response {
  return new Response(message, { status });
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function extractYoutubePlaylistId(urlStr: string): string | null {
  try {
    const url = new URL(urlStr);
    const list = url.searchParams.get("list");
    return list || null;
  } catch {
    return null;
  }
}

function isSoundcloudPlaylist(urlStr: string): boolean {
  return /soundcloud\.com\/[a-z0-9-_]+\/sets\/[a-z0-9-_]+/i.test(urlStr);
}

async function getYouTubeVideos(playlistId: string): Promise<VideoListResult> {
  const playlist = await youtube.getPlaylist(playlistId);
  if (!playlist) {
    return errorResponse(errorMessages.invalidLink, 400);
  }

  await playlist.videos.next(0);

  const urls = playlist.videos.items.map((vid) => `https://youtu.be/${vid.id}`);
  return urls;
}

async function getSoundcloudTracks(
  playlistUrl: string,
): Promise<VideoListResult> {
  const playlist = await soundcloud.playlists.get(playlistUrl);
  if (!playlist) {
    return errorResponse(errorMessages.invalidLink, 400);
  }

  const urls = playlist.tracks.map((track) => track.permalink_url);
  return urls;
}

export const GET: RequestHandler = async ({ url }) => {
  try {
    const playlistUrl = (url.searchParams.get("url") || "").trim();

    if (!playlistUrl) {
      return errorResponse(errorMessages.noLink, 400);
    }

    const youtubePlaylistId = extractYoutubePlaylistId(playlistUrl);
    const isSoundcloud = isSoundcloudPlaylist(playlistUrl);

    let playlistVideos: VideoListResult;

    if (youtubePlaylistId) {
      playlistVideos = await getYouTubeVideos(youtubePlaylistId);
    } else if (isSoundcloud) {
      playlistVideos = await getSoundcloudTracks(playlistUrl);
    } else {
      return errorResponse(errorMessages.invalidLink, 400);
    }

    if (playlistVideos instanceof Response) {
      // Propagate error from helper
      return playlistVideos;
    }

    return jsonResponse(playlistVideos);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error ?? "unknown");
    return errorResponse(errorMessages.catchedError + message, 500);
  }
};
