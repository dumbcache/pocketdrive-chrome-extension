import type { GoogleFile, GoogleFileRes, GoogleSignInPayload } from "../types";
import LinkButton from "../assets/link.svg";

export const DIR_MIME_TYPE = "application/vnd.google-apps.folder";
export const IMG_MIME_TYPE = "image/";
export const FILE_API = "https://www.googleapis.com/drive/v3/files";

function constructAPI(
    parent: string,
    mimeType: string,
    pageSize?: number,
    pageToken?: string
) {
    const api = `${FILE_API}?q='${parent}' in parents and mimeType contains '${mimeType}'&fields=files(id,name,appProperties,parents,thumbnailLink)&pageSize=${pageSize}`;
    pageToken && api + `&pageToken=` + pageToken;
    return api;
}
export async function downloadImage(id: string): Promise<Blob> {
    const token = window.localStorage.getItem("token");
    let res = await fetch(`${FILE_API}/${id}?alt=media`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (res.status !== 200) {
        if (res.status === 401) {
            if (await getToken()) return await downloadImage(id);
        }
        throw new Error("Unable to fetch dirs");
    }
    const data = await res.blob();
    return data;
}

export async function getFiles(
    parent: string,
    token: string,
    mimeType: string,
    pageSize: number = 100
): Promise<GoogleFileRes | undefined> {
    try {
        return new Promise(async (resolve, reject) => {
            let res = await fetch(constructAPI(parent, mimeType, pageSize), {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (res.status !== 200) {
                if (res.status === 401) {
                    console.log(token);
                    reject({ status: 401 });
                }
                reject({ status: res.status });
            }
            const data = (await res.json()) as GoogleFileRes;
            resolve(data);
        });
    } catch (error) {
        console.warn(error);
    }
}

export const loadGSIScript = () => {
    const src = "https://accounts.google.com/gsi/client";
    const profile = document.querySelector(".profile") as HTMLDivElement;
    const gsiIfExists = profile.querySelector(`script[src='${src}']`);
    if (gsiIfExists) profile.removeChild(gsiIfExists);
    const script = document.createElement("script");
    script.src = src;
    script.onload = (e) => {
        google.accounts.id.initialize({
            client_id: import.meta.env.VITE_CLIENT_ID,
            nonce: import.meta.env.VITE_NONCE_WEB,
            auto_select: false,
            callback: handleGoogleSignIn,
        });
        // google.accounts.id.prompt();
        google.accounts.id.renderButton(
            document.querySelector(".signin-button"),
            {
                type: "icon",
                shape: "circle",
            }
        );
    };
    script.onerror = (e) => console.log(e);

    profile.append(script);
};

export function toggleSignButton(status: Boolean) {
    const signout = document.querySelector(
        ".signout-button"
    ) as HTMLButtonElement;
    const signin = document.querySelector(
        ".signin-button"
    ) as HTMLButtonElement;
    if (status === true) {
        signout.hidden = false;
        signin.hidden = true;
        signout.addEventListener("click", signUserOut);
    } else {
        loadGSIScript();
        signin.hidden = false;
        signout.hidden = true;
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
    toggleSignButton(false);
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
    toggleSignButton(true);

    await getToken();
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

export const logoutHandler = async () => {
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

function addAttributes(ele: HTMLElement, attributes: [string, string][]) {
    for (let [key, val] of attributes) {
        ele.setAttribute(key, val);
    }
}

function anchorHandler(e: Event) {
    const { id, name } = e.currentTarget!.dataset;
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
    ]);
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
    frag.append(img, link);
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

export function previewCloseHandler(e) {
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
    worker: Worker
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
            const blob = await downloadImage(dataset.id!);
            const url = URL.createObjectURL(blob);
            if (previewImg.dataset.id !== dataset.id) return;
            previewImg.src = url;
            dataset.url = url;
        }
    });
}
