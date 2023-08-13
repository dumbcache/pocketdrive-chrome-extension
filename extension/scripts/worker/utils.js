import {
    fetchDirs,
    uploadImg,
    createImgMetadata,
    fetchRootDir,
} from "./drive.js";

export const ENDPOINT = `http://127.0.0.1:5001/dumbcache4658/us-central1/pocketdrive`;
export const REDIRECT_URI =
    "https://ognfmpeihgfiajcogjioankoafklngpe.chromiumapp.org/redirect";
export const OAUTH = `https://accounts.google.com/o/oauth2/v2/auth?client_id=206697063226-p09kl0nq355h6q5440qlbikob3h8553u.apps.googleusercontent.com&prompt=select_account&response_type=token&scope=openid email https://www.googleapis.com/auth/drive.file&redirect_uri=${REDIRECT_URI}`;

export function checkRuntimeError() {
    chrome.runtime.lastError;
    // && console.log(chrome.runtime.lastError);
}

function isSystemLink(link) {
    return (
        link.startsWith("chrome://") ||
        link.startsWith("chrome-extension://") ||
        link.startsWith("chrome-search://")
    );
}

export function isSystemPage(tab) {
    return tab.active && isSystemLink(tab.url);
}

export function isLoggedIn() {
    return chrome.storage.local.get("token");
}

export const initContextMenus = async () => {
    chrome.contextMenus.removeAll(checkRuntimeError);

    const { token } = await isLoggedIn();
    if (!token) {
        chrome.contextMenus.create(
            {
                id: "login",
                title: "Login",
                contexts: ["action"],
            },
            checkRuntimeError
        );
        return;
    } else {
        chrome.contextMenus.create(
            {
                id: "save",
                title: "Save",
                contexts: ["image"],
            },
            checkRuntimeError
        );
        chrome.contextMenus.create(
            {
                id: "refresh",
                title: "Refresh",
                contexts: ["action"],
            },
            checkRuntimeError
        );
        chrome.contextMenus.create(
            {
                id: "images",
                title: "Images",
                contexts: ["action"],
            },
            checkRuntimeError
        );
        chrome.contextMenus.create(
            {
                id: "token",
                title: "GetToken",
                contexts: ["action"],
            },
            checkRuntimeError
        );
        chrome.contextMenus.create(
            {
                id: "logout",
                title: "Logout",
                contexts: ["action"],
            },
            checkRuntimeError
        );
    }
};

export const init = async () => {
    try {
        const { token } = await chrome.storage.local.get("token");
        await fetchRootDir(token);
        await refreshDirs();
        chrome.storage.local.set({ childDirs: {} }, checkRuntimeError);
        // chrome.storage.local.set({ recents: [] }, checkRuntimeError);
    } catch (error) {
        console.warn(error);
        console.log("cause:", error.cause);
    }
};

export const refreshDirs = async () => {
    try {
        let { root } = await chrome.storage.local.get("root");
        let { data } = await fetchDirs(root);
        chrome.storage.local.set({ dirs: data }, checkRuntimeError);
    } catch (error) {
        console.warn("Unable to Refresh dirs:", error);
        let { dirs } = await chrome.storage.local.get();
        dirs = dirs ? [...dirs] : [];
        chrome.storage.local.set({ dirs }, checkRuntimeError);
    }
};

export const updateRecents = async (id, dirName) => {
    let { recents } = await chrome.storage.local.get("recents");
    if (!recents) {
        chrome.storage.local.set(
            { recents: [{ id, name: dirName }] },
            checkRuntimeError
        );
        return;
    }
    recents = recents.filter((item) => item.id !== id);
    recents.unshift({ id, name: dirName });
    chrome.storage.local.set({ recents }, checkRuntimeError);
};

export const addtoLocalDirs = async (data, parents) => {
    const { root } = await chrome.storage.local.get("root");
    if (root === parents) {
        let { dirs = [] } = await chrome.storage.local.get("dirs");
        dirs.unshift(data);
        chrome.storage.local.set({ dirs }, checkRuntimeError);
        return;
    }
    let { childDirs } = await chrome.storage.local.get("childDirs");
    childDirs[parents]
        ? childDirs[parents].unshift(data)
        : (childDirs[parents] = [data]);
    chrome.storage.local.set({ childDirs }, checkRuntimeError);
};

export const saveimg = async (data) => {
    let { origin, parents, blob } = data;
    const { token } = await chrome.storage.local.get("token");
    let imgMeta = {
        name: `${Date.now()}`,
        mimeType: "image/webp",
        parents: [parents],
        description: decodeURI(origin),
    };
    let { location } = await createImgMetadata(imgMeta, token);
    let { status } = await uploadImg(
        location,
        new Uint8Array(blob).buffer,
        imgMeta.mimeType
    );
    if (status !== 200) {
        chrome.storage.local.remove("img", checkRuntimeError);
        console.log("error while uploading img local", status);
        if (status === 401) {
            login();
        }
    }
    return { status };
};

export const saveimgExternal = async (parents, img) => {
    let url = `${ENDPOINT}/saveimg`;
    const { token } = await chrome.storage.local.get("token");
    let body = { ...img, parents };
    let req = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });
    let { status } = req;
    if (status !== 200) {
        if (status === 401) {
            login();
        }
        chrome.storage.local.remove("img", checkRuntimeError);
        console.log("error while uploading img external", status);
    }
    return { status };
};
