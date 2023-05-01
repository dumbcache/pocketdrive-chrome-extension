// import { getToken } from "../scripts/utils";
import { GoogleFileRes } from "../types";

const DIR_MIME_TYPE = "application/vnd.google-apps.folder";
const IMG_MIME_TYPE = "image/";
const FILE_API = "https://www.googleapis.com/drive/v3/files";

function constructAPI(
    parent: string,
    mimeType: string,
    pageSize?: number,
    pageToken?: string
) {
    const api = `${FILE_API}?q='${parent}' in parents and mimeType contains '${mimeType}'&fields=files(id,name,appProperties,parents,thumbnailLink)&pageSize=${pageSize}`;
    pageToken && api + `&pageToken=` + pageToken;
    return api;
}
async function getFiles(
    parent: string,
    mimeType: string,
    token: string,
    pageSize: number = 100
): Promise<GoogleFileRes | undefined> {
    try {
        return new Promise(async (resolve, reject) => {
            let req = await fetch(constructAPI(parent, mimeType, pageSize), {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (req.status !== 200) {
                if (req.status === 401) {
                    reject({ status: 401 });
                }
                reject({ status: req.status });
            }
            const data = (await req.json()) as GoogleFileRes;
            resolve(data);
        });
    } catch (error) {
        console.warn(error);
    }
}

onmessage = ({ data }) => {
    if (data.context === "FETCH_FILES") {
        Promise.all([
            getFiles(data.parent, DIR_MIME_TYPE, data.token),
            getFiles(data.parent, IMG_MIME_TYPE, data.token),
        ])
            .then(([dirs, imgs]) => {
                postMessage({ context: "FETCH_FILES", files: [dirs, imgs] });
            })
            .catch((e) => console.log(e));
    }
};
