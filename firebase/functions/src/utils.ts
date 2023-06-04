import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Request, Response } from "express";
import fetch from "node-fetch";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import sharp from "sharp";

import GoogleInfo from "./discovery.json" assert { type: "json" };
import type {
    GOauthTokenReponse,
    FSToken,
    ImgMeta,
    CreateResourceResponse,
    UserData,
    User,
    GOpenidTokenResponse,
    Token,
    HandleUser,
} from "../types.js";

dotenv.config();
const app = initializeApp();
const firestore = getFirestore(app);

export const BaseOAuth = `${GoogleInfo.authorization_endpoint}?client_id=${process.env.CLIENT_ID}&nonce=${process.env.NONCE}&prompt=select_account`;

export const OAUTH_STATE = crypto
    .createHash("sha256")
    .update(process.env.STATE!)
    .digest("hex");

export const WebOAuth = encodeURI(
    `${BaseOAuth}&redirect_uri=${process.env.REDIRECT_URI_WEB}&state=${OAUTH_STATE}&access_type=offline&response_type=code&scope=openid email https://www.googleapis.com/auth/drive.file`
);
export const WebOAuthConsent = encodeURI(
    `${BaseOAuth} consent&redirect_uri=${process.env.REDIRECT_URI_WEB}&state=${OAUTH_STATE}&access_type=offline&response_type=code&scope=openid email https://www.googleapis.com/auth/drive.file`
);

export const ExtOAuth = encodeURI(
    `${BaseOAuth}&response_type=id_token&scope=openid email&redirect_uri=${process.env.REDIRECT_URI_EXT}`
);

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

export const saveTokenData = (data: GOpenidTokenResponse) => {};

export const GoauthExchangeCode = async (
    code: string
): Promise<GOpenidTokenResponse> => {
    const request = await fetch(GoogleInfo.token_endpoint, {
        method: "POST",
        body: JSON.stringify({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            grant_type: "authorization_code",
            redirect_uri: process.env.REDIRECT_URI_WEB,
            code,
        }),
    });
    let payload = (await request.json()) as GOpenidTokenResponse;
    return payload;
};
export const getGOatuthToken = async (
    refreshToken: string,
    user: string
): Promise<string> => {
    const request = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        body: JSON.stringify({
            client_id: process.env.CLIENT_ID,
            client_secret: process.env.CLIENT_SECRET,
            grant_type: process.env.GRANT_TYPE,
            refresh_token: refreshToken,
            redirect_uri: process.env.REDIRECT_URI,
        }),
    });
    let data = (await request.json()) as GOauthTokenReponse;
    let query = firestore.doc(`tokens/${user}`);
    query.update({
        accessToken: data.access_token,
        exp: Math.floor(Date.now() / 1000 + data.expires_in),
    });
    return data.access_token;
};

export const getFSToken = async (user: string) => {
    const query = firestore.doc(`tokens/${user}`);
    const tokenData = (await query.get()).data() as FSToken;
    const accessToken =
        Math.floor(Date.now() / 1000) < tokenData.exp
            ? tokenData.accessToken
            : await getGOatuthToken(tokenData.refreshToken, user);
    return { accessToken };
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
    imgMeta.appProperties!.src = "";
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
////////////////////////////////////////////////////////

export const userExists = async (payload: TokenPayload) => {
    const { email, sub } = payload;
    let query = firestore.doc(`users/${email}`);
    let data = (await query.get()).data();
    const exists = data && data.sub === sub;
    return { exists, email };
};
export const verifyIdToken = async (token: string) => {
    try {
        const client = new OAuth2Client(process.env.CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (
            payload?.nonce !== process.env.NONCE &&
            payload?.nonce !== process.env.NONCE_WEB
        )
            throw new Error("Invalid IdToken: nonce mismatch");
        return { status: 200, payload };
    } catch (error) {
        if (error instanceof Error) console.log(error.message);
        return { status: 401 };
    }
};

export const generateToken = async (email: string, app: "WEB" | "EXT") => {
    let query = firestore.doc(`secrets/app`);
    const { secret } = (await query.get()).data() as { secret: string };
    const expiresIn = app === "EXT" ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
    const token = jwt.sign({ user: email }, secret, {
        expiresIn,
        issuer: process.env.ISSUER,
    });
    query = firestore.doc(`users/${email}`);
    let { root } = (await query.get()).data() as UserData;
    app === "EXT" ? query.update({ extoken: token }) : query.update({ token });
    return { token, root };
};

export const validateToken = async (
    token: string,
    app: "WEB" | "EXT"
): Promise<{
    status: number;
    payload?: Token;
    cause?: string;
}> => {
    const query = firestore.doc(`secrets/app`);
    const { secret } = (await query.get()).data() as { secret: string };

    try {
        const payload = jwt.verify(token, secret) as Token;
        const query = firestore.doc(`users/${payload.user}`);
        const user = (await query.get()).data() as User;
        switch (app) {
            case "WEB":
                if (user.token !== token) {
                    return { status: 401, cause: "invalid token" };
                }
                break;
            case "EXT":
                if (user.extoken !== token) {
                    return { status: 401, cause: "invalid token" };
                }
                break;
        }
        return { status: 200, payload };
    } catch (e) {
        console.log(e);
        return { status: 401, cause: "invalid token" };
    }
};

export const removeToken = (user: string, app: "WEB" | "EXT") => {
    let query = firestore.doc(`users/${user}`);
    app === "EXT" ? query.update({ extoken: "" }) : query.update({ token: "" });
    return { status: 200 };
};

export const handleNewUser = async (
    data: GOpenidTokenResponse,
    payload: TokenPayload
): Promise<HandleUser> => {
    const { email } = payload;
    let query = firestore.doc(`secrets/authorized`);
    const { users } = (await query.get()).data() as { users: any[] };
    if (!users.includes(email)) {
        await fetch(
            `${GoogleInfo.revocation_endpoint}?token=${data.refresh_token}`,
            { method: "POST" }
        );
        return { status: 401 };
    }
    const rootDir = await createRootDir(data.access_token);
    query = firestore.doc(`tokens/${email}`);
    await query.set({
        accessToken: data.access_token,
        exp: Math.floor(Date.now() / 1000 + data.expires_in),
        refreshToken: data.refresh_token,
    });
    query = firestore.doc(`users/${email}`);
    await query.set({ root: rootDir.id, sub: payload.sub });
    const user = await generateToken(email!, "WEB");
    return { status: 200, user };
};

export const handleExistingUser = async (
    data: GOpenidTokenResponse,
    payload: TokenPayload
): Promise<HandleUser> => {
    const query = firestore.doc(`tokens/${payload.email}`);
    query.update({
        accessToken: data.access_token,
        exp: Math.floor(Date.now() / 1000 + data.expires_in),
    });
    if (data.refresh_token) query.update({ refreshToken: data.refresh_token });
    const user = await generateToken(payload.email!, "WEB");
    return { status: 200, user };
};
