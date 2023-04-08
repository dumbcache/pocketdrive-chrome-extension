import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { Request, Response } from "express";
import fetch from "node-fetch";
import { OAuth2Client, TokenPayload } from "google-auth-library";

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
    `${BaseOAuth}&redirect_uri=${process.env.REDIRECT_URI_WEB}&state=${OAUTH_STATE}&response_type=code&scope=openid email profile https://www.googleapis.com/auth/drive.file`
);

export const ExtOAuth = encodeURI(
    `${BaseOAuth}&response_type=id_token&scope=openid email&redirect_uri=${process.env.REDIRECT_URI_EXT}`
);

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
    let query = firestore.doc(`tokens/${user}`);
    let tokenData = (await query.get()).data() as FSToken;
    let accessToken =
        Math.floor(Date.now() / 1000) < tokenData.exp
            ? tokenData.accessToken
            : await getGOatuthToken(tokenData.refreshToken, user);
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
        if (payload?.nonce !== process.env.NONCE)
            throw new Error("Invalid IdToken: nonce mismatch");
        return { status: 200, payload };
    } catch (error) {
        if (error instanceof Error) console.log(error.message);
        return { status: 401 };
    }
};

export const generateToken = async (email: string, expiresIn: number) => {
    let query = firestore.doc(`secrets/app`);
    const { secret } = (await query.get()).data() as { secret: string };
    const token = jwt.sign({ user: email }, secret, {
        expiresIn,
        issuer: process.env.ISSUER,
    });
    query = firestore.doc(`users/${email}`);
    let { root } = (await query.get()).data() as UserData;
    query.update({ token });
    return { token, root };
};

export const validateToken = async (
    token: string
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
        if (user.token !== token) {
            return { status: 401, cause: "invalid token" };
        }
        return { status: 200, payload };
    } catch (e) {
        console.log(e);
        return { status: 401, cause: "invalid token" };
    }
};

export const removeToken = (user: string) => {
    let query = firestore.doc(`users/${user}`);
    query.update({ jwt: "" });
    return { status: 200 };
};