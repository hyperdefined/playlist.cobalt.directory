<script>
    import { onMount } from 'svelte';

    onMount(() => {
        const cobaltapi = "https://cobalt-api.kwiatekmiki.com";
        const playlistinput = document.querySelector("#playlistid");
        const downloadbutton = document.querySelector("#download");
        const clearinput = document.querySelector("#clear");

        clearinput.addEventListener('click', function() {
            playlistinput.value = "";
        })

        downloadbutton.addEventListener('click', function() {
            startDownloading()
        })

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
        })

        async function downloadfrom(videolink = "") {
            console.log(`downloading ${videolink}`);
            const response = await fetch(cobaltapi, {
                method: "POST",
                headers: {
                    "User-Agent": "cobalt-playlist-downloader/1.0",
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "url": videolink,
                    // TODO: let the user change settings
                    "filenameStyle": "basic",
                    "downloadMode": "audio", // v10
                    // "isAudioOnly": true, // v7
                })
            })

            const responsejson = await response.json();

            if (responsejson.status === "error") {
                const error = responsejson?.error.code;
                console.log(`can't download ${videolink}: ${error}`);
                return;
            }

            if (responsejson.url) {
                window.location = responsejson.url;
            } else {
                console.log(`can't download ${videolink}, cobalt didn't return a url`);
            }
        }

        async function startDownloading() {
            downloadbutton.disabled = true;
            downloadbutton.innerText = "...";
            const playlisturl = playlistid.value;
            const response = await fetch("/getvideos?url=" + playlisturl);
            let videolinks = {};
            const responsetext = await response.text();
            try {
                videolinks = JSON.parse(responsetext);
            } catch {
                alert(responsetext);

                downloadbutton.innerText = "!!"
                setTimeout(() => {
                    downloadbutton.innerText = ">>"
                    downloadbutton.disabled = false;
                }, 1000)
                return;
            }

            downloadbutton.innerText = "..?";

            videolinks.forEach(function(videolink, index) {
                setTimeout(() => {
                    downloadfrom(videolink);
                    downloadbutton.innerText = ">>>";
                }, index * 5000)
            })

            downloadbutton.innerText = ">>"
            downloadbutton.disabled = false;
        }

        downloadbutton.focus();
    })
</script>

<header></header>
<div id="con">
    <h1>cobalt playlist downloader</h1>
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
    </div>
</div>
<footer>
    <a href="https://codeberg.org/kwiat/playlist">
        source code
    </a>
</footer>

