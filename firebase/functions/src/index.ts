import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

import * as dotenv from "dotenv";
import fetch from "node-fetch";
import express, { Request, Response } from "express";
import cors from "cors";

import type {
    GOauthTokenReponse,
    FSToken,
    ImgMeta,
    CreateImgResponse,
    DirListResponse,
} from "../types";

const router = express();
router.use(cors());
router.use(express.json());

dotenv.config();
const app = initializeApp();
const firestore = getFirestore(app);

const getGOatuthToken = async (refreshToken: string): Promise<string> => {
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
    let query = firestore.doc(`tokens/${process.env.USERID}`);
    query.update({
        accessToken: data.access_token,
        expiresIn: Math.floor(Date.now() / 1000 + data.expires_in),
    });
    return data.access_token;
};

const getFSToken = async () => {
    let query = firestore.doc(`tokens/${process.env.USERID}`);
    let tokenData = (await query.get()).data() as FSToken;
    let accessToken =
        Math.floor(Date.now() / 1000) < tokenData.expiresIn
            ? tokenData.accessToken
            : await getGOatuthToken(tokenData.refreshToken);
    return { accessToken };
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
    let { id } = (await req.json()) as CreateImgResponse;
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
export const authenticate = functions.https.onRequest(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    res.send(await getFSToken());
});

router.route("/dirs").post(async (req, res) => {
    try {
        let { accessToken } = await getFSToken();
        let { parents } = req.body;
        let url = "https://www.googleapis.com/drive/v3/files";
        let dirReq = await fetch(
            `${url}?q='${parents}' in parents and mimeType='application/vnd.google-apps.folder'&fields=files(name,id)`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );
        let { files } = (await dirReq.json()) as DirListResponse;
        res.status(200).send({ dirs: files });
    } catch ({ message }) {
        res.status(500).send({ cause: message });
    }
});

router.route("/pics").post(async (req, res) => {
    try {
        let { accessToken } = await getFSToken();
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

export const utils = functions.https.onRequest(router);
