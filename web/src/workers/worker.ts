import { DIR_MIME_TYPE, IMG_MIME_TYPE, getFiles } from "../scripts/utils";

onmessage = ({ data }) => {
    if (data.context === "FETCH_FILES") {
        Promise.all([
            getFiles(data.parent, data.token, DIR_MIME_TYPE),
            getFiles(data.parent, data.token, IMG_MIME_TYPE),
        ])
            .then(([dirs, imgs]) => {
                postMessage({ context: "FETCH_FILES", files: [dirs, imgs] });
            })
            .catch((e) => {
                postMessage({
                    context: "FETCH_FILES_FAILED",
                    status: e.status,
                });
                console.warn(e);
            });
        return;
    }
    if (data.context === "FETCH_FILES_COVER") {
        const { parent, token } = data;
        getFiles(parent, token, IMG_MIME_TYPE, 3)
            .then((data) => {
                postMessage({
                    context: "FETCH_FILES_COVER",
                    files: data?.files,
                    parent,
                });
            })
            .catch((e) => {
                postMessage({
                    context: "FETCH_FILES_FAILED",
                    status: e.status,
                });
                console.warn(e);
            });
        return;
    }
};
onmessageerror = (e) => console.warn(e);
