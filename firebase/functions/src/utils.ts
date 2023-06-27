import * as dotenv from "dotenv";
import { Request, Response } from "express";
import fetch from "node-fetch";
import sharp from "sharp";

import type { ImgMeta, CreateResourceResponse } from "../types.js";

dotenv.config();

export const colorPalette = {
    ChocolateIceCream: "#ac725e",
    OldBrickRed: "#d06b64",
    Cardinal: "#f83a22",
    WildStraberries: "#fa573c",
    MarsOrange: "#ff7537",
    YellowCab: "#ffad46",
    Spearmint: "#42d692",
    VernFern: "#16a765",
    Asparagus: "#7bd148",
    SlimeGreen: "#b3dc6c",
    DesertSand: "#fbe983",
    Macaroni: "#fad165",
    SeaFoam: "#92e1c0",
    Pool: "#9fe1e7",
    Denim: "#9fc6e7",
    RainySky: "#4986e7",
    BlueVelvet: "#9a9cff",
    PurpleDino: "#b99aff",
    Mouse: "#8f8f8f",
    MountainGrey: "#cabdbf",
    Earthworm: "#cca6ac",
    BubbleGum: "#f691b2",
    PurpleRain: "#cd74e6",
    ToyEggplant: "#a47ae2",
};

export const createRootDir = async (accessToken: string) => {
    const url = "https://www.googleapis.com/drive/v3/files/";
    let req = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            name: "krabs_#app",
            mimeType: "application/vnd.google-apps.folder",
            folderColorRgb: colorPalette.Cardinal,
        }),
    });
    let { status, statusText } = req;
    let data = (await req.json()) as CreateResourceResponse;
    if (status !== 200)
        console.log(
            `error while creating root dir ${status} ${statusText}`,
            data
        );
    return data;
};
export const patchImgMetaData = async (
    id: string,
    imgMeta: ImgMeta,
    accessToken: string
) => {
    const url = "https://www.googleapis.com/drive/v3/files/" + id;
    let req = await fetch(url, {
        method: "Patch",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(imgMeta),
    });
    let { status, statusText } = req;
    let data = await req.json();
    if (status !== 200)
        console.log(
            `error while patchingImgMetaData ${status} ${statusText}`,
            data
        );
};

export const createImgMetadata = async (
    imgMeta: ImgMeta,
    accessToken: string
) => {
    const url =
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable";
    let req = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(imgMeta),
    });
    let { status, statusText } = req;
    if (status !== 200)
        throw new Error(
            `error while creatingImgMetaData ${status} ${statusText}`,
            {
                cause: await req.json(),
            }
        );
    return { location: req.headers.get("Location") };
};

export const uploadImg = async (
    location: string,
    imgData: Buffer,
    mimeType: string
) => {
    let req = await fetch(location, {
        method: "PUT",
        headers: {
            "Content-Type": mimeType,
        },
        body: imgData,
    });
    let { status, statusText } = req;
    let { id } = (await req.json()) as CreateResourceResponse;
    if (status !== 200)
        throw new Error(`error while uploadingImg ${status} ${statusText}`, {
            cause: await req.json(),
        });
    return { status, id };
};

export const fetchImgExternal = async (req: Request, res: Response) => {
    let { origin, src, parents } = req.body;
    let imgReq = await fetch(src, { headers: { Referer: origin } });
    if (imgReq.status !== 200) {
        if (imgReq.status === 403) {
            imgReq = await fetch(src);
            if (imgReq.status !== 200) {
                throw new Error(
                    `error while fetchingImgExternal ${imgReq.status} ${imgReq.statusText}`,
                    {
                        cause: await imgReq.text(),
                    }
                );
            }
        } else {
            throw new Error(
                `error while fetchingImgExternal ${imgReq.status} ${imgReq.statusText}`,
                {
                    cause: await imgReq.text(),
                }
            );
        }
    }
    let imgBlob = await imgReq.blob();
    let buffer = await imgBlob.arrayBuffer();
    let imgData = Buffer.from(buffer);
    let type = imgBlob.type;
    console.log("-------", imgBlob.size, imgBlob.type, "-------");

    if (type !== "image/webp" && type !== "image/avif") {
        imgData = await convertToWebp(imgData, type);
        type = "image/webp";
    }

    let imgMeta: ImgMeta = {
        name: `${Date.now()}`,
        mimeType: type,
        parents: [parents],
    };
    return { imgData, imgMeta };
};

async function convertToWebp(imgData: Buffer, type: string) {
    const imgProcess = sharp(imgData, { animated: type === "image/gif" });
    const buffer = await imgProcess.webp({ quality: 80 }).toBuffer();
    return buffer;
}
