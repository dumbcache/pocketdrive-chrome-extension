import {
    DIR_MIME_TYPE,
    IMG_MIME_TYPE,
    crateMaincontent,
    getFiles,
    isLoggedin,
    toggleSignButton,
} from "./scripts/utils";
import "./css/app.css";

document.addEventListener("DOMContentLoaded", async () => {
    const loginStatus = isLoggedin();
    toggleSignButton(loginStatus);
    if (loginStatus === true) {
        const root = window.localStorage.getItem("root");
        try {
            const [dirs, imgs] = await Promise.all([
                getFiles(root!, DIR_MIME_TYPE),
                getFiles(root!, IMG_MIME_TYPE),
            ]);
            crateMaincontent(dirs!, imgs!);
        } catch (error) {
            console.warn(error);
        }
    }
});

window.addEventListener("locationchange", () => {
    console.log(location);
});

window.addEventListener("popstate", () => {
    window.dispatchEvent(new Event("locationchange"));
});
