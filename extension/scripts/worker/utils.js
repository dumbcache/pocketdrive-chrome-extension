import {
    fetchDirs,
    uploadImg,
    createImgMetadata,
    fetchRootDir,
} from "./drive.js";

const HOSTNAME = new URL(chrome.runtime.getURL("")).hostname;
export const ENDPOINT = `http://127.0.0.1:5001/dumbcache4658/us-central1/pocketdrive`;
export const REDIRECT_URI = `https://${HOSTNAME}.chromiumapp.org/redirect`;
export const OAUTH = `https://accounts.google.com/o/oauth2/v2/auth?client_id=206697063226-p09kl0nq355h6q5440qlbikob3h8553u.apps.googleusercontent.com&prompt=select_account&response_type=token&scope=email https://www.googleapis.com/auth/drive.file&redirect_uri=${REDIRECT_URI}`;

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
    return tab?.active && isSystemLink(tab?.url);
}

export function isLoggedIn() {
    return chrome.storage.local.get("token");
}

export const initContextMenus = async () => {
    chrome.contextMenus.removeAll(checkRuntimeError);

    const { active } = await chrome.storage.local.get("active");
    if (!active) {
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

export const init = async (refresh = false) => {
    try {
        const token = await getToken();
        await fetchRootDir(token);
        await refreshDirs();
        chrome.storage.local.set({ childDirs: {} }, checkRuntimeError);
        if (refresh)
            chrome.storage.local.set({ recents: [] }, checkRuntimeError);
    } catch (error) {
        console.warn(error);
        console.log("cause:", error.cause);
    }
};

export const refreshDirs = async () => {
    try {
        let { active, dirs } = await chrome.storage.local.get();
        let root = await getRoot();
        let { data } = await fetchDirs(root);
        dirs[active] = data;
        chrome.storage.local.set({ dirs }, checkRuntimeError);
    } catch (error) {
        console.warn("Unable to Refresh dirs:", error);
        let { dirs } = await chrome.storage.local.get();
        dirs = dirs ? { ...dirs } : {};
        chrome.storage.local.set({ dirs }, checkRuntimeError);
    }
};

export const updateRecents = async (id, dirName) => {
    let { active, recents } = await chrome.storage.local.get();
    if (!recents[active]) {
        recents[active] = [{ id, name: dirName }];
        chrome.storage.local.set({ recents }, checkRuntimeError);
        return;
    }
    recents[active] = recents[active].filter((item) => item.id !== id);
    recents[active].unshift({ id, name: dirName });
    chrome.storage.local.set({ recents }, checkRuntimeError);
};

export const addtoLocalDirs = async (data, parents) => {
    const { active, roots, dirs, childDirs } = await chrome.storage.local.get();
    if (roots[active] === parents) {
        dirs[active].unshift(data);
        chrome.storage.local.set({ dirs }, checkRuntimeError);
        return;
    }
    childDirs[active][parents]
        ? childDirs[active][parents].unshift(data)
        : (childDirs[active][parents] = [data]);
    chrome.storage.local.set({ childDirs }, checkRuntimeError);
};

export const saveimg = async (data) => {
    let { origin, parents, blob, mimeType } = data;
    let token = await getToken();
    let imgMeta = {
        name: `${Date.now()}`,
        mimeType: mimeType || "image/webp",
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
    const token = await getToken();
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

export async function getUserInfo(accessToken) {
    const req = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    return await req.json();
}

export async function setUser(userinfo, token) {
    const { email } = userinfo;

    /**
     * @type {import("../../types.js").User}
     */
    let { users, active, tokens, dirs, childDirs, recents, roots } =
        await chrome.storage.local.get();
    users ?? (users = []);
    if (users.length === 0) {
        active ?? (active = "");
        dirs ?? (dirs = {});
        childDirs ?? (childDirs = {});
        recents ?? (recents = {});
        roots ?? (roots = {});
        tokens ?? (tokens = {});
    }

    if (users.includes(email)) {
        tokens[email] = token;
        active = email;
        chrome.storage.local.set({ tokens, active });
    } else {
        active = email;
        users.push(email);
        tokens[email] = token;
        recents[email] = [];
        dirs[email] = [];
        childDirs[email] = {};
        const { root } = await fetchRootDir(token);
        roots[email] = root;
        chrome.storage.local.set({
            active,
            users,
            tokens,
            dirs,
            childDirs,
            recents,
            roots,
        });
    }
}

export async function removeUser(newValue) {
    const { active, roots, tokens, childDirs, dirs, recents } =
        await chrome.storage.local.get();
    if (!newValue.includes(active)) {
        delete roots[active];
        delete tokens[active];
        delete dirs[active];
        delete childDirs[active];
        delete recents[active];
        await chrome.storage.local.set({
            active: newValue[0] ?? "",
            roots,
            tokens,
            dirs,
            recents,
            childDirs,
        });
    }
}

export async function getToken() {
    const { active, tokens } = await chrome.storage.local.get();
    return tokens[active];
}

export async function getRoot() {
    const { active, roots } = await chrome.storage.local.get();
    return roots[active];
}
