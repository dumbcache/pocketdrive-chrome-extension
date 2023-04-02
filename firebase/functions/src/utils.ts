import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Request, Response } from "express";

import type {
    GOauthTokenReponse,
    FSToken,
    ImgMeta,
    CreateResourceResponse,
    UserData,
} from "../types";

dotenv.config();
const app = initializeApp();
const firestore = getFirestore(app);

export const getGOatuthToken = async (
    refreshToken: string,
    id: string
): Promise<string> => {
    const request = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: JSON.stringify({
            client_secret: process.env.CLIENT_SECRET,
            grant_type: process.env.GRANT_TYPE,
            refresh_token: refreshToken,
            client_id: process.env.CLIENT_ID,
            redirect_uri: process.env.REDIRECT_URI,
        }),
    });
    let data = (await request.json()) as GOauthTokenReponse;
    let query = firestore.doc(`tokens/${id}`);
    query.update({
        accessToken: data.access_token,
        expiresIn: Math.floor(Date.now() / 1000 + data.expires_in),
    });
    return data.access_token;
};

export const getFSToken = async (user: string) => {
    let query = firestore.doc(`users/${user}`);
    let { id } = (await query.get()).data() as UserData;
    query = firestore.doc(`tokens/${id}`);
    let tokenData = (await query.get()).data() as FSToken;
    let accessToken =
        Math.floor(Date.now() / 1000) < tokenData.expiresIn
            ? tokenData.accessToken
            : await getGOatuthToken(tokenData.refreshToken, id);
    return { accessToken };
};

export const createJWT = async (user: string, secret: string) => {
    const token = jwt.sign({ name: user }, secret, {
        expiresIn: 60 * 60 * 24 * 30,
        issuer: process.env.ISSUER,
    });
    let query = firestore.doc(`users/${user}`);
    query.update({ jwt: token });
    let { root } = (await query.get()).data() as UserData;
    return { token, root };
};
export const removeJWT = (user: string) => {
    let query = firestore.doc(`users/${user}`);
    query.update({ jwt: "" });
    return { status: 200 };
};

export const validateJWT = async (
    user: string,
    token: string
): Promise<{ status: number; cause?: string }> => {
    const query = firestore.doc(`users/${user}`);
    const userData = (await query.get()).data() as UserData;
    if (!userData) {
        return { status: 401, cause: "invalid user" };
    }
    if (userData.jwt !== token) {
        return { status: 401, cause: "invalid token" };
    }
    try {
        jwt.verify(token, userData.secret);
        return { status: 200 };
    } catch {
        return { status: 401, cause: "invalid token" };
    }
};

export const authenticateUser = async (
    user: string,
    pass: string
): Promise<{ auth: Boolean; secret?: string }> => {
    let query = firestore.doc(`users/${user}`);
    const userData = (await query.get()).data() as UserData;
    const passHash = crypto.createHash("sha256").update(pass).digest("hex");
    if (userData?.pass === passHash) {
        return { auth: true, secret: userData.secret };
    } else {
        return { auth: false };
    }
};

export const patchImgMetaData = async (
    id: string,
    imgMeta: ImgMeta,
    accessToken: string
) => {
    console.log(JSON.stringify(imgMeta));
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
    // console.log("creatingImgMetaData", status, statusText);
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
    // console.log("UploadingImg", status, statusText);
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
        throw new Error(
            `error while fetchingImgExternal ${imgReq.status} ${imgReq.statusText}`,
            {
                cause: await imgReq.text(),
            }
        );
    }
    let imgBlob = await imgReq.blob();
    let buffer = await imgBlob.arrayBuffer();
    let imgData = Buffer.from(buffer);
    console.log(imgBlob.size, imgBlob.type);

    let imgMeta: ImgMeta = {
        name: `${Date.now()}`,
        mimeType: imgBlob.type,
        parents,
    };
    return { imgData, imgMeta };
};
