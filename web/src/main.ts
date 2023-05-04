import {
    crateMaincontent,
    getToken,
    isLoggedin,
    toggleSignButton,
    updateCoverPics,
} from "./scripts/utils";
import { initTouchEvents } from "./scripts/events";
import "./css/app.css";

document.addEventListener("DOMContentLoaded", async () => {
    const loginStatus = isLoggedin();
    toggleSignButton(loginStatus);
    if (loginStatus === true) {
        window.dispatchEvent(new Event("locationchange"));
        initTouchEvents();
    }
});

let worker: Worker, childWorker: Worker;

if (window.Worker) {
    worker = new Worker(new URL("workers/worker.ts", import.meta.url), {
        type: "module",
    });
    childWorker = new Worker(
        new URL("workers/childWorker.ts", import.meta.url),
        {
            type: "module",
        }
    );

    /************ worker ************/
    worker.onerror = (e) => console.warn(e);
    worker.onmessage = ({ data }) => {
        if (data.context === "FETCH_FILES") {
            crateMaincontent(data.files, worker, childWorker);
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

    /************ Child worker ************/
    childWorker.onerror = (e) => console.warn(e);
    childWorker.onmessage = ({ data }) => {
        if (data.context === "FETCH_IMAGE") {
            const { id, blob } = data;
            const previewImg = document.querySelector(
                ".preview-img"
            ) as HTMLImageElement;
            const target = document.querySelector(
                `[data-id='${id}']`
            ) as HTMLDivElement;
            if (previewImg.dataset.id !== id) return;
            const url = URL.createObjectURL(blob);
            previewImg.src = url;
            target.dataset.url = url;
            return;
        }
        if (data.context === "IMAGE_FAILED") {
            if (data.status === 401) {
                getToken();
                return;
            }
        }
    };
}

window.addEventListener("locationchange", async () => {
    try {
        const { pathname } = window.location;
        const root =
            pathname === "/"
                ? window.localStorage.getItem("root")!
                : pathname.substring(1);
        const token = window.localStorage.getItem("token");
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

window.addEventListener("touchstart", (e) => {
    if ((e.target as HTMLDivElement).classList.contains("preview-img")) {
        console.log(e);
    }
});

window.addEventListener("touchend", (e) => {
    if ((e.target as HTMLDivElement).classList.contains("preview-img")) {
        console.log(e);
    }
});
