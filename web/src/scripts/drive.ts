import type { GoogleFileRes } from "../types";

export const DIR_MIME_TYPE = "application/vnd.google-apps.folder";
export const IMG_MIME_TYPE = "image/";
export const FILE_API = "https://www.googleapis.com/drive/v3/files";
export const FIELDS_REQUIRED =
    "files(id,name,appProperties,parents,thumbnailLink)";

function constructAPI(
    parent: string,
    mimeType: string,
    pageSize?: number,
    pageToken?: string
) {
    let api = `${FILE_API}?q='${parent}' in parents and mimeType contains '${mimeType}'&fields=${FIELDS_REQUIRED}&pageSize=${pageSize}`;
    pageToken && (api = api + `&pageToken=` + pageToken);
    mimeType === DIR_MIME_TYPE && (api = api + "&orderBy=name");
    return api;
}
export async function downloadImage(id: string, token: string): Promise<Blob> {
    return new Promise(async (resolve, reject) => {
        let res = await fetch(`${FILE_API}/${id}?alt=media`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (res.status !== 200) {
            if (res.status === 401) reject({ status: 401 });
            reject({ status: res.status });
        }
        const data = await res.blob();
        resolve(data);
    });
}

export async function getFiles(
    parent: string,
    token: string,
    mimeType: string,
    pageSize: number = 100
): Promise<GoogleFileRes | undefined> {
    try {
        return new Promise(async (resolve, reject) => {
            let res = await fetch(constructAPI(parent, mimeType, pageSize), {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (res.status !== 200) {
                if (res.status === 401) {
                    reject({ status: 401 });
                }
                reject({ status: res.status });
            }
            const data = (await res.json()) as GoogleFileRes;
            resolve(data);
        });
    } catch (error) {
        console.warn(error);
    }
}
