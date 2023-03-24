import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import * as dotenv from "dotenv";
import fetch from "node-fetch";
import express, { Request, RequestHandler, Response } from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import type {
    GOauthTokenReponse,
    FSToken,
    ImgMeta,
    CreateResourceResponse,
    DirListResponse,
    UserData,
} from "../types";

dotenv.config();
const app = initializeApp();
const firestore = getFirestore(app);

const getGOatuthToken = async (
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

const getFSToken = async (user: string) => {
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

const createJWT = async (user: string, secret: string) => {
    const token = jwt.sign({ name: user }, secret, {
        expiresIn: 60 * 60 * 24 * 30,
        issuer: process.env.ISSUER,
    });
    let query = firestore.doc(`users/${user}`);
    query.update({ jwt: token });
    let { root } = (await query.get()).data() as UserData;
    return { token, root };
};
const removeJWT = (user: string) => {
    let query = firestore.doc(`users/${user}`);
    query.update({ jwt: "" });
    return { status: 200 };
};

const validateJWT = async (
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

const authenticateUser = async (
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

const patchImgMetaData = async (
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

const createImgMetadata = async (imgMeta: ImgMeta, accessToken: string) => {
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

const uploadImg = async (
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

const fetchImgExternal = async (req: Request, res: Response) => {
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
/*************** End Points ****************/
const expressApp = express();
expressApp.use(cors());
expressApp.use(express.json());
const validateUserMW: RequestHandler = async (req, res, next) => {
    console.log("----------------------------");
    // if (
    //     req.get("origin") !==
    //     "chrome-extension://dkgfcadnfmifojphldpmchkjglfpjlgk"
    // ) {
    //     res.status(401).send({ cause: "invalid origin" });
    //     return;
    // }
    console.log(req.path);
    if (req.path === "/login") {
        next();
        return;
    }
    let token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        res.status(401).send({ cause: "invalid token" });
        return;
    }
    const { user } = req.params;
    const { status, cause } = await validateJWT(user, token);
    if (status !== 200) {
        res.status(status).send({ cause });
        return;
    }
    next();
};

expressApp.route("/login").post(validateUserMW, async (req, res) => {
    try {
        let { user, pass } = req.body;
        if (!user || !pass) {
            console.log("creds missing");
            res.status(401).send({ cause: "wrong credentials" });
            return;
        }
        const { auth, secret } = await authenticateUser(user, pass);
        if (!auth) {
            console.log("user Authentication status", auth);
            res.status(401).send({ cause: "wrong credentials" });
            return;
        }
        let data = await createJWT(user, secret!);
        res.status(200).send({ ...data, user });
    } catch (error) {
        console.log(error);
        res.status(500).send({ cause: "unable to verify user at the moment" });
    }
});
expressApp.route("/:user/logout").get(validateUserMW, async (req, res) => {
    try {
        let { user } = req.params;
        let { status } = removeJWT(user);
        res.status(status).send({});
    } catch (error) {
        console.log(error);
        res.status(500).send({ cause: "unable to logout user at the moment" });
    }
});

expressApp.get("/:user/dirs/:parents", validateUserMW, async (req, res) => {
    try {
        const { user } = req.params;
        const { accessToken } = await getFSToken(user);
        const { parents } = req.params;
        const url = "https://www.googleapis.com/drive/v3/files";
        const dirReq = await fetch(
            `${url}?q='${parents}' in parents and mimeType='application/vnd.google-apps.folder'&fields=files(name,id)`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );
        const { files } = (await dirReq.json()) as DirListResponse;
        res.status(200).send(files);
    } catch ({ message }) {
        res.status(500).send({ cause: message });
    }
});
expressApp.post("/:user/dirs", validateUserMW, async (req, res) => {
    const { user } = req.params;
    const { accessToken } = await getFSToken(user);
    const url = "https://www.googleapis.com/drive/v3/files";
    const { dirName, parents } = req.body as {
        dirName: string;
        parents: string;
    };
    const dirReq = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "applications/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            name: dirName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parents],
        }),
    });
    if (dirReq.status !== 200) {
        res.status(dirReq.status).send({ cause: await dirReq.json() });
        return;
    }
    const { id, name } = (await dirReq.json()) as CreateResourceResponse;
    res.status(200).send({ id, name });
});

expressApp.route("/:user/pics").post(validateUserMW, async (req, res) => {
    try {
        let { user } = req.params;
        let { accessToken } = await getFSToken(user);
        let { imgData, imgMeta } = await fetchImgExternal(req, res);
        let { location } = (await createImgMetadata(imgMeta, accessToken)) as {
            location: string;
        };
        let { status, id } = await uploadImg(
            location,
            imgData,
            imgMeta.mimeType!
        );
        let { origin, src } = req.body;
        console.log(id);
        patchImgMetaData(id, { appProperties: { origin, src } }, accessToken);
        res.status(status).send();
    } catch ({ message, cause }) {
        console.error(message, cause);
        res.setHeader("Content-type", "application/json");
        res.status(500).send({ cause });
    }
});
export const krabs = functions.https.onRequest(expressApp);
