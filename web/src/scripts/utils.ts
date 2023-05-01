import type { GoogleFile, GoogleFileRes, GoogleSignInPayload } from "../types";

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
export async function downloadImage(id: string) {
    const token = window.localStorage.getItem("token");
    let req = await fetch(`${FILE_API}/${id}?alt=media`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (req.status !== 200) {
        if (req.status === 401) {
            await getToken();
            return await downloadImage(id);
        }
        throw new Error("Unable to fetch dirs");
    }
    const data = await req.blob();
    return data;
}

export async function getFiles(
    parent: string,
    mimeType: string,
    pageSize: number = 100
): Promise<GoogleFileRes | undefined> {
    try {
        const token = window.localStorage.getItem("token");
        let req = await fetch(constructAPI(parent, mimeType, pageSize), {
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

export function createAnchorElement(id: string, name: string) {
    const a = document.createElement("a");
    a.dataset.id = id;
    a.href = "javascript:void(0)";
    a.onclick = () => {
        history.pushState({ dir: name, id }, "", id);
        window.dispatchEvent(new Event("locationchange"));
    };
    return a;
}

export function createDir(
    file: GoogleFile,
    imgs: GoogleFile[]
): HTMLDivElement {
    const div = document.createElement("div");
    const cover = document.createElement("div");
    const title = document.createElement("p");
    const anchor = createAnchorElement(file.id, file.name);
    title.innerText = file.name;
    cover.classList.add("cover");
    addAttributes(div, [["class", "dir"]]);
    for (let img of imgs) {
        const m = createImg(img);
        cover.append(m);
    }
    anchor.append(cover);
    div.append(anchor, title);
    return div;
}

export function createImg(
    file: GoogleFile,
    className: string = ""
): HTMLImageElement {
    const img = document.createElement("img");
    img.dataset.id = file.id;
    addAttributes(img, [
        ["src", file.thumbnailLink!],
        ["class", className],
        ["referrerpolicy", "no-referrer"],
    ]);
    return img;
}

export async function crateMaincontent(
    dirsData: GoogleFileRes,
    imgsData: GoogleFileRes
) {
    console.log(dirsData, imgsData);
    const dirsEle = document.querySelector(".dirs");
    const imgsEle = document.querySelector(".imgs");
    for (let dir of dirsData.files) {
        const data = await getFiles(dir.id, IMG_MIME_TYPE, 3);
        const folder = createDir(dir, data!.files);
        dirsEle?.append(folder);
    }
    for (let img of imgsData.files) {
        const pic = createImg(img, "img");
        imgsEle?.append(pic);
    }
    imgsEle?.addEventListener("click", async (e) => {
        const dataset = e.target.dataset;
        const preview = document.querySelector(".preview");
        if (dataset.url) {
            const img = document.createElement("img");
            img.classList.toggle("preview-img");
            img.src = dataset.url;
            preview!.innerHTML = "";
            preview?.append(img);
            return;
        }
        const blob = await downloadImage(dataset.id);
        const url = URL.createObjectURL(blob);
        const img = document.createElement("img");
        img.classList.toggle("preview-img");
        dataset.url = url;
        img.src = url;
        preview!.innerHTML = "";
        preview?.append(img);
    });
}
