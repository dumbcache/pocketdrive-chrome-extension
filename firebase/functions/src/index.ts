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
    const { status, payload, cause } = await validateToken(token);
    if (status !== 200) {
        res.status(status).send({ cause });
        return;
    }
    res.locals.user = payload?.user;
    console.log(res.locals.user);
    next();
};

const html = `<a href="${WebOAuth}" style="font-family:ubuntu;text-decoration:none;background-color:#ddd;padding:1rem;border-radius:5%;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">Sign in using Google<a>`;
const loginSuccessHTML = `<p style="font-family:ubuntu;text-decoration:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">registered successfully. now you can log into chrome extension<p>`;
const loginFailedHTML = `<div  style="font-family:ubuntu;text-decoration:none;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)"><p>registration failed. try again</p<a href="${WebOAuth}">Sign in using Google</a><div>`;

expressApp.get("/loginpage", async (req, res) => {
    const { status } = req.query;
    if (status) {
        status === "success"
            ? res.send(loginSuccessHTML)
            : res.send(loginFailedHTML);
        return;
    }
    res.send(html);
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
        const { code, state } = req.query;
        if (state !== OAUTH_STATE) throw new Error("invalid oauth state");
        const payload =
            typeof code === "string" && (await GoauthExchangeCode(code));
        if (!payload) throw new Error("invalid code");
        res.redirect(
            "/dumbcache4658/us-central1/krabsv2/loginpage?status=success"
        );
    } catch (error) {
        console.log(error);
        res.redirect(
            "/dumbcache4658/us-central1/krabsv2/loginpage?status=failed"
        );
    }
});

expressApp.route("/auth").get(async (req, res) => {
    try {
        let token = req.headers.authorization?.split(" ")[1];
        if (!token) return;
        let { status, cause, payload } = await validateToken(token);
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
        const data = await generateToken(email!, 60 * 60 * 24 * 30);
        res.status(200).send(data);
    } catch (error) {
        res.status(500).send({ cause: "unable to login user at the moment" });
    }
});
expressApp.route("/logout").get(validateUserMW, async (req, res) => {
    try {
        let { user } = res.locals.user;
        let { status } = removeJWT(user);
        res.status(status).send({});
    } catch (error) {
        console.log(error);
        res.status(500).send({ cause: "unable to logout user at the moment" });
    }
});

expressApp.get("/dirs/:parents", validateUserMW, async (req, res) => {
    try {
        let { user } = res.locals.user;
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
    } catch (error) {
        console.log(error);
        res.status(500).send({ cause: "unable to fetch dirs at the moment" });
    }
});
expressApp.post("/dirs", validateUserMW, async (req, res) => {
    try {
        let { user } = res.locals.user;
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
        let { user } = res.locals.user;
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
    } catch (error) {
        console.error(error);
        res.setHeader("Content-type", "application/json");
        res.status(500).send({ cause: "unable to save img at the moment" });
    }
});
export const krabs = functions.https.onRequest(expressApp);
