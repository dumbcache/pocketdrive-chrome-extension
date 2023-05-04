import type { GoogleFile, GoogleFileRes, GoogleSignInPayload } from "../types";
import LinkButton from "../assets/link.svg";

export const loadGSIScript = () => {
    const src = "https://accounts.google.com/gsi/client";
    const header = document.querySelector(".header") as HTMLDivElement;
    const gsiIfExists = header.querySelector(`script[src='${src}']`);
    if (gsiIfExists) header.removeChild(gsiIfExists);
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
        window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_CLIENT_ID,
            nonce: import.meta.env.VITE_NONCE_WEB,
            auto_select: false,
            callback: handleGoogleSignIn,
        });
        // window.google.accounts.id.prompt();
        window.google.accounts.id.renderButton(
            document.querySelector(".signin-button"),
            {
                type: "icon",
                shape: "circle",
            }
        );
    };
    script.onerror = (e) => console.log(e);

    header.append(script);
};

export function toggleSignButton(status: Boolean) {
    const signin = document.querySelector(
        ".signin-button"
    ) as HTMLButtonElement;
    const menu = document.querySelector(".menu") as HTMLDivElement;
    if (status === true) {
        menu.style.display = "flex";
        signin.hidden = true;
        (document.querySelector(".main-wrapper")! as HTMLDivElement).hidden =
            false;
        (
            document.querySelector(".signout-button")! as HTMLDivElement
        ).addEventListener("click", signUserOut);
    } else {
        loadGSIScript();
        menu.style.display = "none";
        signin.hidden = false;
    }
}

export async function signUserOut() {
    const api = import.meta.env.VITE_API;
    const secret = window.localStorage.getItem("secret");
    const res = await fetch(`${api}/logout/WEB`, {
        headers: {
            Authorization: `Bearer ${secret}`,
        },
    });
    if (res.status !== 200) {
        console.warn(res.status, await res.text());
        return;
    }
    window.localStorage.clear();
    window.location.reload();
}

export function isLoggedin() {
    const secret = window.localStorage.getItem("secret");
    return Boolean(secret);
}

export const handleGoogleSignIn = async (googleRes: GoogleSignInPayload) => {
    const creds = googleRes?.credential;
    const api = import.meta.env.VITE_API;
    const res = await fetch(`${api}/login`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({ id_token: creds, app: "WEB" }),
    });
    if (res.status !== 200) {
        console.warn(res.status, await res.text());
        return;
    }
    const { token, root } = await res.json();
    localStorage.setItem("secret", token);
    localStorage.setItem("root", root);
    await getToken();

    toggleSignButton(true);
    window.dispatchEvent(new Event("locationchange"));
};

export const getToken = async () => {
    const secret = window.localStorage.getItem("secret");
    const api = import.meta.env.VITE_API;
    const res = await fetch(`${api}/auth`, {
        headers: {
            Authorization: `Bearer ${secret}`,
        },
    });
    if (res.status !== 200) {
        if (res.status === 401) {
            console.log("session timeout. Logging off");
            window.localStorage.clear();
            toggleSignButton(false);
            return;
        }
        console.warn(res.status, await res.text());
        return;
    }
    const { token } = await res.json();
    localStorage.setItem("token", token);
    return true;
};

export const logoutFromServer = async () => {
    const api = import.meta.env.VITE_API;
    const secret = window.localStorage.getItem("secret");
    const res = await fetch(`${api}/auth`, {
        headers: {
            Authorization: `Bearer ${secret}`,
        },
    });
    if (res.status !== 200) {
        console.warn(res.status, await res.text());
        return;
    }
    window.localStorage.clear();
};

export function createElement<T extends HTMLElement>(
    type: string,
    attributes: [string, string][] = [],
    ...childNodes: HTMLElement[] | string[]
): T {
    const ele = document.createElement(type) as T;
    for (let [key, val] of attributes) {
        ele.setAttribute(key, val);
    }
    childNodes.length !== 0 && ele.append(...childNodes);
    return ele;
}

function anchorHandler(e: Event) {
    const { id, name } = (e.currentTarget as HTMLAnchorElement).dataset;
    history.pushState({ dir: name, id }, "", id);
    window.dispatchEvent(new Event("locationchange"));
}

export function createDir(file: GoogleFile, worker: Worker): HTMLDivElement {
    const token = window.localStorage.getItem("token")!;
    worker.postMessage({
        context: "FETCH_FILES_COVER",
        parent: file.id,
        token,
    });
    const cover = createElement<HTMLDivElement>("div", [
        ["class", "cover"],
        ["data-parent", file.id],
    ]);
    const title = createElement("p", [], file.name);
    const anchor = createElement<HTMLAnchorElement>("a", [
        ["href", "javascript:void(0)"],
        ["data-id", file.id],
        ["data-name", file.name],
    ]);
    anchor.onclick = anchorHandler;
    anchor.append(cover);
    const div = createElement<HTMLDivElement>(
        "div",
        [["class", "dir"]],
        anchor,
        title
    );
    return div;
}

export function createImg(
    file: GoogleFile,
    className: string = ""
): HTMLDivElement {
    const frag = createElement<HTMLDivElement>("div", [["class", "img-card"]]);
    const img = createElement<HTMLImageElement>("img", [
        ["src", file.thumbnailLink!],
        ["class", className],
        ["referrerpolicy", "no-referrer"],
        ["data-id", file.id],
        ["loading", "lazy"],
        ["height", "200"],
        ["width", "200"],
    ]);
    frag.append(img);
    if (file.appProperties?.origin) {
        const linkImg = createElement("img", [["src", LinkButton]]);
        const link = createElement(
            "a",
            [
                ["target", "_blank"],
                ["class", "img-link"],
                ["href", file.appProperties.origin],
                ["rel", "noopener noreferrer nofollow"],
            ],
            linkImg
        );
        frag.append(link);
    }
    return frag;
}

export function updateCoverPics(id: string, imgs: GoogleFile[]) {
    const cover = document.querySelector(
        `[data-parent='${id}']`
    ) as HTMLDivElement;
    cover.innerHTML = "";
    if (cover) {
        for (let img of imgs) {
            const coverPic = createElement("img", [
                ["src", img.thumbnailLink!],
                ["referrerpolicy", "no-referrer"],
            ]);
            cover.append(coverPic);
        }
    }
}

export function previewCloseHandler() {
    const preview = document.querySelector(".preview") as HTMLDivElement;
    const previewClose = document.querySelector(
        ".preview-close"
    ) as HTMLDivElement;
    preview.hidden = true;
    previewClose.removeEventListener("click", previewCloseHandler);
}

export function togglePreview() {
    const preview = document.querySelector(".preview") as HTMLDivElement;
    const previewClose = document.querySelector(
        ".preview-close"
    ) as HTMLDivElement;
    preview.hidden = false;
    previewClose.addEventListener("click", previewCloseHandler);
}

export async function crateMaincontent(
    files: [dirs: GoogleFileRes, imgs: GoogleFileRes],
    worker: Worker,
    childWorker: Worker
) {
    const [dirs, imgs] = files;
    const dirsEle = document.querySelector(".dirs") as HTMLDivElement;
    const imgsEle = document.querySelector(".imgs") as HTMLDivElement;
    dirsEle.innerHTML = "";
    imgsEle.innerHTML = "";
    for (let dir of dirs!.files) {
        const folder = createDir(dir, worker);
        dirsEle?.append(folder);
    }
    for (let img of imgs!.files) {
        const pic = createImg(img, "img");
        imgsEle?.append(pic);
    }
    imgsEle?.addEventListener("click", async (e) => {
        const target = e.target as HTMLImageElement;
        if (!target.classList.contains("img")) return;
        const dataset = target.dataset;
        const previewImg = document.querySelector(
            ".preview-img"
        ) as HTMLImageElement;
        if (previewImg.dataset.id === dataset.id) {
            togglePreview();
            return;
        }
        previewImg.src = target.src;
        previewImg.dataset.id = target.dataset.id;
        togglePreview();
        if (dataset.url) {
            previewImg.src = dataset.url;
        } else {
            const token = window.localStorage.getItem("token")!;
            childWorker.postMessage({
                context: "FETCH_IMAGE",
                id: dataset.id,
                token,
            });
        }
    });
}
