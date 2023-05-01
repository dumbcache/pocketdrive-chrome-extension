import {
    crateMaincontent,
    isLoggedin,
    toggleSignButton,
} from "./scripts/utils";
import "./css/app.css";

let worker: Worker;
if (window.Worker) {
    worker = new Worker("src/workers/worker.ts");
    worker.addEventListener("message", ({ data }) => {
        if (data.context === "FETCH_FILES") {
            crateMaincontent(data.files);
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    const loginStatus = isLoggedin();
    toggleSignButton(loginStatus);
    if (loginStatus === true) {
        window.dispatchEvent(new Event("locationchange"));
    }
});

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
