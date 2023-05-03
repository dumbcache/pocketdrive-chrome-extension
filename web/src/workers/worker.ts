import { DIR_MIME_TYPE, IMG_MIME_TYPE, getFiles } from "../scripts/utils";

async function fetchAndCacheFiles(data: any, krabsCache: Cache) {
    return new Promise((resolve, reject) => {
        Promise.all([
            getFiles(data.parent, data.token, DIR_MIME_TYPE),
            getFiles(data.parent, data.token, IMG_MIME_TYPE),
        ])
            .then(async ([dirs, imgs]) => {
                krabsCache.put(
                    `/${data.parent}?type=dirs`,
                    new Response(JSON.stringify(dirs!))
                );
                krabsCache.put(
                    `/${data.parent}?type=imgs`,
                    new Response(JSON.stringify(imgs!))
                );
                resolve([dirs, imgs]);
            })
            .catch((e) => {
                reject(e.status);
            });
    });
}

onmessage = async ({ data }) => {
    if (data.context === "FETCH_FILES") {
        const krabsCache = await caches.open("krabs");
        const [dirRes, imgsRes] = await krabsCache.matchAll(`/${data.parent}`, {
            ignoreSearch: true,
        });
        if (dirRes && imgsRes) {
            const dirs = await dirRes.json();
            const imgs = await imgsRes.json();
            postMessage({ context: "FETCH_FILES", files: [dirs, imgs] });
            // fetchAndCacheFiles(data, krabsCache);
            return;
        } else {
            fetchAndCacheFiles(data, krabsCache)
                .then((files) => {
                    postMessage({ context: "FETCH_FILES", files });
                })
                .catch((e) => {
                    postMessage({
                        context: "FETCH_FILES_FAILED",
                        status: e.status,
                    });
                    console.warn(e);
                });
            return;
        }
    }
    if (data.context === "FETCH_FILES_COVER") {
        const { parent, token } = data;
        getFiles(parent, token, IMG_MIME_TYPE, 3)
            .then(async (data) => {
                postMessage({
                    context: "FETCH_FILES_COVER",
                    files: data?.files,
                    parent,
                });
            })
            .catch((e) => {
                postMessage({
                    context: "FETCH_FILES_FAILED",
                    status: e.status,
                });
                console.warn(e);
            });
        return;
    }
};
onmessageerror = (e) => console.warn(e);
