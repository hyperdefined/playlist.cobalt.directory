import { COBALT_API_KEY } from "$env/static/private";

export async function POST({ request, fetch }) {
  const payload = await request.json();

  const cobaltRes = await fetch("https://cobalt-backend.canine.tools", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
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
