import { getToken, isLoggedin, isUserOnline } from "./scripts/utils";
import { generateCovers, crateMaincontent } from "./scripts/helpers";
import "./css/app.css";
import { initMainEvents } from "./scripts/events";

let worker: Worker, childWorker: Worker;
document.addEventListener("DOMContentLoaded", async () => {
    if (isLoggedin()) {
        isUserOnline(true);
        initMainEvents(childWorker);
        window.dispatchEvent(new Event("locationchange"));
    } else {
        isUserOnline(false);
    }
});

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
            crateMaincontent(data.files, worker);
            return;
        }
        if (data.context === "FETCH_COVERS") {
            generateCovers(data.parent, data.files);
            return;
        }
        if (data.context === "REFRESH_FILES") {
            crateMaincontent(data.files, worker, true);
            return;
        }
        if (data.context === "REFRESH_COVERS") {
            generateCovers(data.parent, data.files);
            return;
        }
        if (data.context === "FETCH_FILES_FAILED") {
            console.log(data);
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
        const back = document.querySelector(
            ".back-button"
        ) as HTMLButtonElement;
        pathname === "/"
            ? (back.style.display = "none")
            : (back.style.display = "initial");
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

window.addEventListener("refresh", () => {
    const { pathname } = window.location;
    const root =
        pathname === "/"
            ? window.localStorage.getItem("root")!
            : pathname.substring(1);
    const token = window.localStorage.getItem("token");
    worker.postMessage({ context: "REFRESH_FILES", parent: root, token });
});

window.addEventListener("offline", () => {
    console.log("offline");
});

window.addEventListener("popstate", () => {
    window.dispatchEvent(new Event("locationchange"));
});
