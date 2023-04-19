import * as functions from "firebase-functions";
import fetch from "node-fetch";
import express, { RequestHandler } from "express";
import cors from "cors";

import type { CreateResourceResponse, DirListResponse } from "../types.js";
import {
    GoauthExchangeCode,
    createImgMetadata,
    fetchImgExternal,
    getFSToken,
    patchImgMetaData,
    removeJWT,
    uploadImg,
    WebOAuth,
    validateToken,
    ExtOAuth,
    verifyIdToken,
    OAUTH_STATE,
    generateToken,
    userExists,
    WebOAuthConsent,
    handleNewUser,
    handleExistingUser,
} from "./utils.js";

/*************** End Points ****************/
const expressApp = express();
expressApp.use(cors());
expressApp.use(express.json());

const validateUserMW: RequestHandler = async (req, res, next) => {
    console.log(req.path);
    if (req.path === "/login") {
        if (req.get("origin") !== process.env.ORIGIN) {
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
    const { status, payload, cause } = await validateToken(token, "EXT");
    if (status !== 200) {
        res.status(status).send({ cause });
        return;
    }
    res.locals.user = payload?.user;
    next();
};

const html = (url: string) =>
    `<a href="${url}" style="font-family:ubuntu;background-color:#ddd;padding:1rem;border-radius:5%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">Sign in using Google<a>`;
const loginSuccessHTML = `<p style="font-family:ubuntu;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">registered successfully. now you can log into chrome extension<p>`;
const loginFailedHTML = (message?: string) =>
    `<div  style="font-family:ubuntu;text-align:center;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)"><p>registration failed${
        message ? message : ""
    }. try again</p><p><a href="${WebOAuth}">Sign in using Google</a></p><div>`;

expressApp.get("/loginpage", async (req, res) => {
    const { status, consent } = req.query;
    if (status) {
        if (status === "1") res.send(loginSuccessHTML);
        else if (status === "0") res.send(loginFailedHTML());
        else res.send(loginFailedHTML(", user unauthorized"));
        return;
    }
    if (consent === "1") {
        res.send(html(WebOAuthConsent));
        return;
    }
    res.send(html(WebOAuth));
});

expressApp.get("/login/:app", async (req, res) => {
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

expressApp.get("/redirect", async (req, res) => {
    try {
        const { error, code, state } = req.query;
        if (error) throw new Error("access_denied");
        if (state !== OAUTH_STATE) throw new Error("invalid oauth state");
        const payload =
            typeof code === "string" && (await GoauthExchangeCode(code));
        if (!payload || payload.error) throw new Error("invalid code");
        const { status: idStatus, payload: data } = await verifyIdToken(
            payload.id_token
        );
        if (idStatus !== 200) throw new Error("Invalid IdToken");
        const { exists } = await userExists(data!);
        const { status } = exists
            ? await handleExistingUser(payload, data!)
            : await handleNewUser(payload, data!);
        if (status !== 200) {
            res.redirect(`loginpage?status=2`);
            return;
        }
        res.redirect(`loginpage?status=1`);
    } catch (error) {
        console.log(error);
        res.redirect(`loginpage?status=0`);
    }
});

expressApp.route("/auth").get(async (req, res) => {
    try {
        let token = req.headers.authorization?.split(" ")[1];
        if (!token) return;
        let { status, cause, payload } = await validateToken(token, "WEB");
        if (status !== 200) {
            throw new Error("unauthorized error", { cause });
        }
        const { accessToken } = await getFSToken(payload!.user);
        res.send({ accessToken });
    } catch (error) {
        console.log(error);
        res.status(500).send({ cause: "unable to authenticate at the moment" });
    }
});
expressApp.post("/login", async (req, res) => {
    try {
        const { id_token } = req.body;
        const { status, payload } = await verifyIdToken(id_token);
        if (status !== 200 || !payload)
            throw new Error("invalid token signature");
        const { exists, email } = await userExists(payload);
        if (!exists) throw new Error("Unauthorized user");
        const data = await generateToken(email!, "EXT");
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send({ cause: "unable to login user at the moment" });
    }
});
expressApp.route("/logout").get(validateUserMW, async (req, res) => {
    try {
        let { user } = res.locals;
        let { status } = removeJWT(user);
        res.status(status).send({});
    } catch (error) {
        console.log(error);
        res.status(500).send({ cause: "unable to logout user at the moment" });
    }
});

expressApp.get("/dirs/:parents", validateUserMW, async (req, res) => {
    try {
        let { user } = res.locals;
        const { accessToken } = await getFSToken(user);
        const { parents } = req.params;
        const url = "https://www.googleapis.com/drive/v3/files";
        const dirReq = await fetch(
            `${url}?q='${parents}' in parents and mimeType='application/vnd.google-apps.folder'&fields=files(name,id)&orderBy=name`,
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );
        const { files } = (await dirReq.json()) as DirListResponse;
        res.status(200).send(files);
    } catch (error) {
        console.log(error);
        res.status(500).send({ cause: "unable to fetch dirs at the moment" });
    }
});
expressApp.post("/dirs", validateUserMW, async (req, res) => {
    try {
        let { user } = res.locals;
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
    } catch (error) {
        console.log(error);
        res.status(500).send({ cause: "unable to fetch dirs at the moment" });
    }
});

expressApp.route("/pics").post(validateUserMW, async (req, res) => {
    try {
        let { user } = res.locals;
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
        patchImgMetaData(id, { appProperties: { origin, src } }, accessToken);
        res.status(status).send();
    } catch (error) {
        console.error(error);
        res.setHeader("Content-type", "application/json");
        res.status(500).send({ cause: "unable to save img at the moment" });
    }
});
export const krabs = functions.https.onRequest(expressApp);
