import * as functions from "firebase-functions";
import fetch from "node-fetch";
import express, { RequestHandler } from "express";
import cors from "cors";

import type {
    CreateResourceResponse,
    DirListResponse,
    GOauthCodeResponse,
} from "../types.js";
import {
    GoauthExchangeCode,
    authenticateUser,
    createImgMetadata,
    createJWT,
    fetchImgExternal,
    getFSToken,
    patchImgMetaData,
    removeJWT,
    uploadImg,
    validateJWT,
    /////////////////////////
    WebOAuth,
    validateToken,
    ExtOAuth,
    verifyIdToken,
} from "./utils.js";

/*************** End Points ****************/
const expressApp = express();
expressApp.use(cors());
expressApp.use(express.json());

const validateUserMW: RequestHandler = async (req, res, next) => {
    console.log(req.path);
    if (req.path === "/login") {
        if (
            req.get("origin") !== process.env.ORIGIN &&
            req.get("origin") !== process.env.ORIGINDEV
        ) {
            res.status(401).send({ cause: "invalid origin" });
            return;
        }
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
            name: dirName.trim(),
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

////////////////////////////////////////////////////////////////////

/******* Krabsv2 ********8*/
const app = express();
app.use(cors());
app.use(express.json());

app.get("/login/:app", async (req, res) => {
    const { app } = req.params;
    if (app === "web") {
        res.send({ url: WebOAuth });
        return;
    }
    if (app === "ext") {
        res.send({ url: ExtOAuth });
        return;
    }
});
app.post("/login", async (req, res) => {
    const { id_token } = req.body;
    const { status } = await verifyIdToken(id_token);
    if (status !== 200) {
        res.status(401).send({ cause: "invalid token signature" });
        return;
    }
    res.status(200).send({});
});

app.get("/redirect", async (req, res) => {
    try {
        // const { code, redirect_uri } = req.query;
        console.log(req.query);
        // if (typeof code === "string")
        //     console.log(await GoauthExchangeCode(code));
        res.status(200).send();
    } catch (error) {}
});

app.route("/auth").get(async (req, res) => {
    try {
        let token = req.headers.authorization?.split(" ")[1];
        if (!token) return;
        let { status, cause, tokenData } = await validateToken(token);
        if (status !== 200) {
            throw new Error("unauthorized error", { cause });
            return;
        }
        const { accessToken } = await getFSToken(tokenData.user);
        res.send(accessToken);
    } catch (error) {
        res.status(401).send({ cause: error.cause });
        return;
    }
});

export const krabsv2 = functions.https.onRequest(app);
