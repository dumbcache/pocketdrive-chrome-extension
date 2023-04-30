import type { GoogleFile, GoogleFileRes, GoogleSignInPayload } from "../types";

export const DIR_MIME_TYPE = "application/vnd.google-apps.folder";
export const IMG_MIME_TYPE = "image/";
export const FILE_API = "https://www.googleapis.com/drive/v3/files";

function constructAPI(
    parent: string,
    mimeType: string,
    pageSize?: string,
    pageToken?: string
) {
    const api = `${FILE_API}?q='${parent}' in parents and mimeType = '${mimeType}'&fields=files(id,name,appProperties,parents,thumbnailLink)&pageSize=${pageSize}`;
    pageToken && api + `&pageToken=` + pageToken;
    return api;
}
export function downloadImage() {}

export async function getFiles(
    parent: string,
    mimeType: string
): Promise<GoogleFileRes | undefined> {
    try {
        const token = window.localStorage.getItem("token");
        let req = await fetch(constructAPI(parent, mimeType), {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (req.status !== 200) {
            if (req.status === 401) {
                await getToken();
                return await getFiles(parent, mimeType);
            }
            throw new Error("Unable to fetch dirs");
        }
        const data = (await req.json()) as GoogleFileRes;
        return data;
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
    const req = await fetch(`${api}/logout/WEB`, {
        headers: {
            Authorization: `Bearer ${secret}`,
        },
    });
    if (req.status !== 200) {
        console.warn(req.status, await req.text());
        return;
    }
    window.localStorage.clear();
    toggleSignButton(false);
}

export function isLoggedin() {
    const secret = window.localStorage.getItem("secret");
    return Boolean(secret);
}

export const handleGoogleSignIn = async (res: GoogleSignInPayload) => {
    const creds = res?.credential;
    const api = import.meta.env.VITE_API;
    const req = await fetch(`${api}/login`, {
        method: "POST",
        headers: {
            "content-type": "application/json",
        },
        body: JSON.stringify({ id_token: creds, app: "WEB" }),
    });
    if (req.status !== 200) {
        console.warn(req.status, await req.text());
        return;
    }
    const { token, root } = await req.json();
    localStorage.setItem("secret", token);
    localStorage.setItem("root", root);
    toggleSignButton(true);

    getToken();
};

export const getToken = async () => {
    const secret = window.localStorage.getItem("secret");
    const api = import.meta.env.VITE_API;
    const req = await fetch(`${api}/auth`, {
        headers: {
            Authorization: `Bearer ${secret}`,
        },
    });
    if (req.status !== 200) {
        if (req.status === 401) {
            console.log("session timeout. Logging off");
            return;
        }
        console.warn(req.status, await req.text());
        return;
    }
    const { token } = await req.json();
    localStorage.setItem("token", token);
};

export const logoutHandler = async () => {
    const api = import.meta.env.VITE_API;
    const secret = window.localStorage.getItem("secret");
    const req = await fetch(`${api}/auth`, {
        headers: {
            Authorization: `Bearer ${secret}`,
        },
    });
    if (req.status !== 200) {
        console.warn(req.status, await req.text());
        return;
    }
    window.localStorage.clear();
};

function addAttributes(ele: HTMLElement, attributes: [string, string][]) {
    for (let [key, val] of attributes) {
        ele.setAttribute(key, val);
    }
}

export function createDir(file: GoogleFile): HTMLDivElement {
    const div = document.createElement("div");
    addAttributes(div, [["class", "dir"]]);
    return div;
}

export function createImg(file: GoogleFile): HTMLImageElement {
    const img = document.createElement("img");
    addAttributes(img, [
        ["src", file.thumbnailLink!],
        ["class", "img"],
        ["referrerpolicy", "no-referrer"],
    ]);
    return img;
}

export function crateMaincontent(dirs: GoogleFileRes, imgs: GoogleFileRes) {
    const dirsEle = document.querySelector(".dirs");
    const imgsEle = document.querySelector(".imgs");
    for (let dir of dirs) {
        getImgs(dir.id);
        const folder = createDir(dir);
        dirsEle?.append(folder);
    }
    for (let img of imgs) {
        const pic = createImg(img);
        imgsEle?.append(pic);
    }
}
