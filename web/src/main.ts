import {
    crateMaincontent,
    getToken,
    isLoggedin,
    toggleSignButton,
    updateCoverPics,
} from "./scripts/utils";
import "./css/app.css";

document.addEventListener("DOMContentLoaded", async () => {
    const loginStatus = isLoggedin();
    toggleSignButton(loginStatus);
    if (loginStatus === true) {
        window.dispatchEvent(new Event("locationchange"));
    }
});

let worker: Worker;
if (window.Worker) {
    worker = new Worker(new URL("workers/worker.ts", import.meta.url), {
        type: "module",
    });
    worker.onmessage = ({ data }) => {
        if (data.context === "FETCH_FILES") {
            crateMaincontent(data.files, worker);
            return;
        }
        if (data.context === "FETCH_FILES_COVER") {
            updateCoverPics(data.parent, data.files);
            return;
        }
        if (data.context === "FETCH_FILES_FAILED") {
            if (data.status === 401) {
                getToken();
                return;
            }
        }
    };
    worker.onerror = (e) => console.warn(e);
}

window.addEventListener("locationchange", async () => {
    try {
        const { pathname } = window.location;
        const root =
            pathname === "/"
                ? window.localStorage.getItem("root")!
                : pathname.substring(1);
        const token = window.localStorage.getItem("token");
        console.log("fetching");
        worker.postMessage({ context: "FETCH_FILES", parent: root, token });
    } catch (error) {
        console.warn(error);
    }
});

window.addEventListener("popstate", () => {
    window.dispatchEvent(new Event("locationchange"));
});

window.addEventListener("offline", () => {
    alert("offline");
});
