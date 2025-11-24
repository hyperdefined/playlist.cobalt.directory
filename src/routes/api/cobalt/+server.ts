import { env } from "$env/dynamic/private";
import { json } from "@sveltejs/kit";

const COBALT_API_KEY = env.COBALT_API_KEY;
const COBALT_API = env.COBALT_API;

export async function POST({ request, fetch }) {
  if (!COBALT_API_KEY) {
    console.error("COBALT_API_KEY is not set!!");
    return json(
      {
        status: "error",
        error: {
          code: "missing_api_key",
          message:
            "COBALT_API_KEY is missing, unable to make any requests to cobalt.",
        },
      },
      { status: 500 },
    );
  }

  if (!COBALT_API) {
    console.error("COBALT_API is not set!!");
    return json(
      {
        status: "error",
        error: {
          code: "missing_api",
          message:
            "COBALT_API is missing, unable to make any requests to cobalt.",
        },
      },
      { status: 500 },
    );
  }

  const payload = await request.json();

  const cobaltRes = await fetch(COBALT_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `api-key ${COBALT_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const headers = new Headers();

  const contentType =
    cobaltRes.headers.get("content-type") ?? "application/octet-stream";
  const contentDisposition = cobaltRes.headers.get("content-disposition");
  const estimated = cobaltRes.headers.get("estimated-content-length");
  const length = cobaltRes.headers.get("content-length");

  headers.set("Content-Type", contentType);
  if (contentDisposition)
    headers.set("Content-Disposition", contentDisposition);

  if (estimated) headers.set("x-estimated-content-length", estimated);
  if (length) headers.set("Content-Length", length);

  headers.set(
    "Access-Control-Expose-Headers",
    "x-estimated-content-length, content-length, content-disposition",
  );

  return new Response(cobaltRes.body, {
    status: cobaltRes.status,
    headers,
  });
}
