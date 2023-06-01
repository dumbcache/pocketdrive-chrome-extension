import fetch from "node-fetch";
import sharp from "sharp";

const PARENT = "";
const TOKEN = "";
const META_API = "https://www.googleapis.com/drive/v3/files/";
const MEDIA_API = "https://www.googleapis.com/upload/drive/v3/files/";
let failed = 0;
let count = 0;

export const uploadImg = async (id, imgData, mimeType) => {
    return new Promise(async (resolve, reject) => {
        let req = await fetch(MEDIA_API + id, {
            method: "PATCH",
            headers: {
                "Content-Type": mimeType,
                Authorization: `Bearer ${TOKEN}`,
            },
            body: imgData,
        });
        const { status, statusText } = req;
        if (status !== 200) {
            failed += 1;
            reject(`${status} ${statusText}`);
            return;
        }
        resolve(status);
        return;
    });
};

export const fetchImg = async (id) => {
    return new Promise(async (resolve, reject) => {
        let imgReq = await fetch(META_API + id + `?alt=media`, {
            headers: {
                Authorization: `Bearer ${TOKEN}`,
            },
        });
        const { status, statusText } = imgReq;
        if (status !== 200) {
            failed += 1;
            reject(`${status} ${statusText}`);
            return;
        }
        let imgBlob = await imgReq.blob();
        let buffer = await imgBlob.arrayBuffer();
        let imgData = Buffer.from(buffer);
        let type = imgBlob.type;

        imgData = await convertToWebp(imgData, type);
        type = "image/webp";
        resolve(uploadImg(id, imgData, type));
    });
};
export const fetchImgMeta = async (id) => {
    return new Promise(async (resolve, reject) => {
        let imgReq = await fetch(META_API + id, {
            headers: {
                Authorization: `Bearer ${TOKEN}`,
            },
        });
        const { status, statusText } = imgReq;
        if (status !== 200) {
            failed += 1;
            reject(`${status} ${statusText}`);
            return;
        }
        const { mimeType } = await imgReq.json();
        if (mimeType !== "image/webp" && mimeType !== "image/avif") {
            resolve(fetchImg(id));
            return;
        }
        resolve("skipped");
    });
};

async function convertToWebp(imgData, type) {
    const imgProcess = sharp(imgData, { animated: type === "image/gif" });
    const buffer = await imgProcess.webp({ quality: 80 }).toBuffer();
    return buffer;
}

export const fetchImgList = async (parent, name) => {
    let imgReq = await fetch(META_API + `?q='${parent}' in parents`, {
        headers: {
            Authorization: `Bearer ${TOKEN}`,
        },
    });
    if (imgReq.status !== 200) {
        console.log(
            `error while fetchingImgExternal ${imgReq.status} ${imgReq.statusText}`
        );
    }
    let proms = [];
    const { files } = await imgReq.json();
    for (let file of files) {
        if (file.mimeType === "application/vnd.google-apps.folder") {
            fetchImgList(file.id, file.name);
        } else {
            count += 1;
            proms.push(fetchImgMeta(file.id));
        }
    }
    Promise.allSettled(proms).then(() =>
        console.log(name + "---- done", "count", count, "failed", failed)
    );
};
fetchImgList(PARENT, "root");
