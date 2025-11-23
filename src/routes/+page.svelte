<script>
    import { onMount } from 'svelte';

    onMount(() => {
        const playlistinput = document.querySelector("#playlistid");
        const downloadbutton = document.querySelector("#download");
        const clearinput = document.querySelector("#clear");
        const modeButtons = document.querySelectorAll("#mode-buttons button");
        let selectedMode = "video";

        const countLabel = document.querySelector("#download-count");
        const progressBar = document.querySelector("#progress-bar");
        const statusContainer = document.querySelector("#download-status");

        function setProgress(percent) {
            if (!progressBar) return;
            if (percent < 0) percent = 0;
            if (percent > 100) percent = 100;
            progressBar.style.width = `${percent}%`;
        }

        function showStatus() {
            if (statusContainer) statusContainer.style.display = "block";
        }

        function hideStatus() {
            if (statusContainer) statusContainer.style.display = "none";
            if (countLabel) countLabel.textContent = "";
            setProgress(0);
        }

        modeButtons.forEach(btn => {
            btn.addEventListener("click", () => {
                modeButtons.forEach(b => b.classList.remove("selected"));
                btn.classList.add("selected");

                selectedMode = btn.dataset.mode;
            });
        });

        clearinput.addEventListener('click', function () {
            playlistinput.value = "";
        });

        downloadbutton.addEventListener('click', function() {
            startDownloading();
        });

        playlistinput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                startDownloading();
            }
        });

        playlistinput.addEventListener('input', function() {
            const inputvalue = playlistinput.value;
            if (inputvalue.length > 0) {
                clearinput.style.display = "unset";
                if (
                    inputvalue.startsWith("https:") &&
                    inputvalue.length > 6
                ) {
                    downloadbutton.style.display = "unset";
                } else {
                    downloadbutton.style.display = "none";
                }
            } else {
                clearinput.style.display = "none";
                downloadbutton.style.display = "none";
            }
        });

        function safeDecode(str) {
            try {
                return decodeURIComponent(str);
            } catch {
                return str;
            }
        }

        function sleep(ms) {
            return new Promise((resolve) => setTimeout(resolve, ms));
        }

        let cancelled = false;

        async function downloadfrom(videolink = "", attempt = 1) {
            const MAX_RETRIES = 3;
            const BACKOFF_MS = 5000;

            console.log(`downloading ${videolink} (attempt ${attempt})`);

            if (cancelled) return;

            const mode = selectedMode || "video";
            const body = {
                url: videolink,
                filenameStyle: "basic"
            };

            if (mode === "audio") {
                body.downloadMode = "audio";
            }

            let response;
            try {
                response = await fetch("/api/cobalt", {
                    method: "POST",
                    headers: {
                        "Accept": "application/json",
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(body)
                });
            } catch (err) {
                console.error("network error while contacting backend:", err);
                cancelAll(`network error while contacting backend:\n${err.message}`);
                return;
            }

            if (!response.ok) {
                const text = await response.text().catch(() => "");

                if (response.status === 429) {
                    console.warn("backend/cobalt rate limit hit (HTTP 429):", text);

                    if (attempt >= MAX_RETRIES) {
                        cancelAll("cobalt rate limit exceeded multiple times. please try again later.");
                        return;
                    }

                    if (countLabel) {
                        countLabel.textContent = `Rate limit hit, waiting ${BACKOFF_MS / 1000}s…`;
                    }

                    await sleep(BACKOFF_MS);
                    if (cancelled) return;
                    return downloadfrom(videolink, attempt + 1);
                }

                console.error("backend returned status:", response.status, text);
                cancelAll(`backend returned an error: ${response.status}\n${text || "No response body"}`);
                return;
            }

            let data;
            try {
                data = await response.json();
            } catch (err) {
                console.error("failed to parse backend response:", err);
                cancelAll("backend returned invalid json");
                return;
            }

            if (data.status === "error") {
                const code = data?.error?.code || "unknown_error";
                console.log(`can't download ${videolink}: ${code}`);

                if (code === "error.api.rate_exceeded") {
                    if (attempt >= MAX_RETRIES) {
                        cancelAll("cobalt rate limit exceeded multiple times. please try again later.");
                        return;
                    }

                    if (countLabel) {
                        countLabel.textContent = `Rate limit hit, waiting ${BACKOFF_MS / 1000}s…`;
                    }

                    await sleep(BACKOFF_MS);
                    if (cancelled) return;
                    return downloadfrom(videolink, attempt + 1);
                }

                cancelAll(`cobalt failed to download video ${videolink} because:\n${code}`);
                return;
            }

            if (!data.url) {
                console.log(`can't download ${videolink}, backend/cobalt didn't return a url`);
                cancelAll("cobalt didn't return a download URL for one of the videos.");
                return;
            }

            const fileUrl = data.url;

            let fileResponse;
            try {
                fileResponse = await fetch(fileUrl);
            } catch (err) {
                console.error("error fetching file URL:", err);
                cancelAll(`Failed to download file:\n${err.message}`);
                return;
            }

            if (!fileResponse.ok) {
                console.error("file response not OK:", fileResponse.status);
                cancelAll(`File download failed: HTTP ${fileResponse.status}`);
                return;
            }

            const estHeader = fileResponse.headers.get("estimated-content-length");
            const lenHeader = fileResponse.headers.get("content-length");
            const totalBytes = estHeader
                ? parseInt(estHeader, 10)
                : lenHeader
                    ? parseInt(lenHeader, 10)
                    : null;

            if (!fileResponse.body) {
                cancelAll("Your browser does not support streaming responses.");
                return;
            }

            const reader = fileResponse.body.getReader();
            const chunks = [];
            let received = 0;

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    chunks.push(value);
                    received += value.length;

                    if (totalBytes && !isNaN(totalBytes) && totalBytes > 0) {
                        const percent = Math.round((received / totalBytes) * 100);
                        setProgress(percent);
                    }
                }
            } catch (err) {
                console.error("error reading stream:", err);
                cancelAll("Error while downloading file data.");
                return;
            }

            if (!totalBytes) {
                setProgress(100);
            }

            const blob = new Blob(chunks);

            let filename = "download";
            const cd = fileResponse.headers.get("Content-Disposition");
            if (cd && cd.includes("filename=")) {
                const match = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
                if (match && match[1]) {
                    filename = safeDecode(match[1]);
                }
            } else {
                try {
                    const u = new URL(fileUrl);
                    const last = u.pathname.split("/").pop();
                    if (last) {
                        filename = safeDecode(last.split("?")[0] || filename);
                    }
                } catch {
                    // ignore, use default
                }
            }

            const objectUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = objectUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();

            URL.revokeObjectURL(objectUrl);
            console.log(`finished downloading ${videolink} -> ${filename}`);
        }

        function cancelAll(reason) {
            cancelled = true;

            downloadbutton.disabled = false;
            downloadbutton.innerText = ">>";

            hideStatus();

            alert(reason);
        }

        async function startDownloading() {
            cancelled = false;

            downloadbutton.disabled = true;
            downloadbutton.innerText = "...";

            showStatus();
            setProgress(0);

            const playlisturl = playlistinput.value;
            const response = await fetch("/getvideos?url=" + playlisturl);

            let videolinks = {};
            const responsetext = await response.text();

            try {
                videolinks = JSON.parse(responsetext);
            } catch {
                alert(responsetext);
                downloadbutton.innerText = "!!";
                setTimeout(() => {
                    downloadbutton.innerText = ">>";
                    downloadbutton.disabled = false;
                }, 1000);
                return;
            }

            if (!Array.isArray(videolinks)) {
                alert("Server did not return a list of videos.");
                downloadbutton.disabled = false;
                downloadbutton.innerText = ">>";
                return;
            }

            for (let i = 0; i < videolinks.length; i++) {
                if (cancelled) break; // user cancelled or error triggered

                const videolink = videolinks[i];
                if (countLabel) {
                    countLabel.textContent = `Downloading ${i + 1} of ${videolinks.length}…`;
                }
                setProgress(0);
                await downloadfrom(videolink);

                if (cancelled) break;
            }

            if (!cancelled) {
                hideStatus();
                downloadbutton.innerText = ">>";
                downloadbutton.disabled = false;
            }
        }

        downloadbutton.focus();
    });
</script>

<header></header>
<div id="con">
    <h1>cobalt playlist downloader</h1>
    <p>this site is very experimental! this site is a fork of <a href="https://codeberg.org/kwiat/playlist">kwiat's playlist downloader</a> with fixes and improvements.</p>
    <p>supports <strong>youtube</strong> and <strong>soundcloud</strong> playlists. uses <strong>cobalt.canine.tools</strong> as the cobalt api.</p>
    <hr>
    <p>!!! VIDEOS/AUDIOS MIGHT BE BROKEN !!!</p>
    <p>cobalt encodes the video/audio data via web. this tool downloads right from the api, which skips this part. playback of media will be broken, visit <a href="https://cobalt.tools">cobalt.tools</a> and use the remux tab to fix.</p>
    <div id="download-area">
        <div id="imput-area">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-link "><path d="M9 15l6 -6"></path><path d="M11 6l.463 -.536a5 5 0 0 1 7.071 7.072l-.534 .464"></path><path d="M13 18l-.397 .534a5.068 5.068 0 0 1 -7.127 0a4.972 4.972 0 0 1 0 -7.071l.524 -.463"></path></svg>
            <label for="playlistid">playlist link</label>
            <input type="text" id="playlistid" placeholder="paste the link here">
            <button id="clear" aria-label="download">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="tabler-icon tabler-icon-x "><path d="M18 6l-12 12"></path><path d="M6 6l12 12"></path></svg>
            </button>
            <button id="download">
                &gt;&gt;
            </button>
        </div>
        <div id="mode-buttons">
            <button data-mode="video" class="selected">video</button>
            <button data-mode="audio">audio</button>
        </div>
        <div id="download-status">
            <div id="download-count"></div>
            <div id="progress-bar-container">
                <div id="progress-bar"></div>
            </div>
        </div>
    </div>
</div>
<footer>
    <a href="https://codeberg.org/kwiat/playlist">
        original source code
    </a>
    <a href="https://github.com/hyperdefined/playlist.cobalt.directory">
        fork source code
    </a>
</footer>

