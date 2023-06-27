import * as functions from "firebase-functions";
import express from "express";
import cors from "cors";

import {
    createImgMetadata,
    fetchImgExternal,
    patchImgMetaData,
    uploadImg,
} from "./utils.js";

/*************** End Points ****************/
const expressApp = express();
expressApp.use(cors());
expressApp.use(express.json());

expressApp.route("/saveimg").post(async (req, res) => {
    try {
        let token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            res.status(401).send({ cause: "invalid token" });
            return;
        }
        let { imgData, imgMeta } = await fetchImgExternal(req, res);
        let { location } = (await createImgMetadata(imgMeta, token)) as {
            location: string;
        };
        let { id } = await uploadImg(location, imgData, imgMeta.mimeType!);
        let { origin } = req.body;
        patchImgMetaData(id, { description: decodeURI(origin) }, token);
        res.status(200).send();
    } catch (error) {
        console.error(error);
        res.setHeader("Content-type", "application/json");
        res.status(500).send({ cause: "unable to save img at the moment" });
    }
});
export const pocketdrive = functions.https.onRequest(expressApp);
