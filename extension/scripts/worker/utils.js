import {
    fetchDirs,
    uploadImg,
    createImgMetadata,
    fetchRootDir,
} from "./drive.js";

export const ENDPOINT = `http://127.0.0.1:5001/dumbcache4658/us-central1/pocketdrive`;
export const REDIRECT_URI = browser.identity.getRedirectURL() + "redirect";
export const OAUTH = `https://accounts.google.com/o/oauth2/v2/auth?client_id=206697063226-p09kl0nq355h6q5440qlbikob3h8553u.apps.googleusercontent.com&prompt=select_account&response_type=token&scope=email https://www.googleapis.com/auth/drive.file&redirect_uri=${REDIRECT_URI}`;

export function checkRuntimeError() {
    browser.runtime.lastError;
    // && console.log(browser.runtime.lastError);
}

function isSystemLink(link) {
    return (
        link.startsWith("browser://") ||
        link.startsWith("browser-extension://") ||
        link.startsWith("browser-search://")
    );
}

export function isSystemPage(tab) {
    return tab?.active && isSystemLink(tab?.url);
}

export function isLoggedIn() {
    return browser.storage.local.get("token");
}

export const initContextMenus = async () => {
    browser.contextMenus.removeAll(checkRuntimeError);

    const { active } = await browser.storage.local.get("active");
    if (!active) {
        browser.contextMenus.create(
            {
                id: "login",
                title: "Login",
                contexts: ["action"],
            },
            checkRuntimeError
        );
        return;
    } else {
        browser.contextMenus.create(
            {
                id: "save",
                title: "Save",
                contexts: ["image"],
            },
            checkRuntimeError
        );
        browser.contextMenus.create(
            {
                id: "refresh",
                title: "Refresh",
                contexts: ["action"],
            },
            checkRuntimeError
        );
        browser.contextMenus.create(
            {
                id: "images",
                title: "Images",
                contexts: ["action"],
            },
            checkRuntimeError
        );
        browser.contextMenus.create(
            {
                id: "token",
                title: "GetToken",
                contexts: ["action"],
            },
            checkRuntimeError
        );
        browser.contextMenus.create(
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
        if (refresh) {
            const { active, recents, childDirs } =
                await browser.storage.local.get();
            childDirs[active] = {};
            recents[active] = [];
            browser.storage.local.set(
                { recents, childDirs },
                checkRuntimeError
            );
        }
    } catch (error) {
        console.warn(error);
        console.log("cause:", error.cause);
    }
};

export const refreshDirs = async () => {
    try {
        let { active, dirs } = await browser.storage.local.get();
        let root = await getRoot();
        let { data } = await fetchDirs(root);
        dirs[active] = data;
        browser.storage.local.set({ dirs }, checkRuntimeError);
    } catch (error) {
        console.warn("Unable to Refresh dirs:", error);
        let { dirs } = await browser.storage.local.get();
        dirs = dirs ? { ...dirs } : {};
        browser.storage.local.set({ dirs }, checkRuntimeError);
    }
};

export const updateRecents = async (id, dirName) => {
    let { active, recents } = await browser.storage.local.get();
    if (!recents[active]) {
        recents[active] = [{ id, name: dirName }];
        browser.storage.local.set({ recents }, checkRuntimeError);
        return;
    }
    recents[active] = recents[active].filter((item) => item.id !== id);
    recents[active].unshift({ id, name: dirName });
    browser.storage.local.set({ recents }, checkRuntimeError);
};

export const addtoLocalDirs = async (data, parents) => {
    const { active, roots, dirs, childDirs } =
        await browser.storage.local.get();
    if (roots[active] === parents) {
        dirs[active].unshift(data);
        browser.storage.local.set({ dirs }, checkRuntimeError);
        return;
    }
    childDirs[active][parents]
        ? childDirs[active][parents].unshift(data)
        : (childDirs[active][parents] = [data]);
    browser.storage.local.set({ childDirs }, checkRuntimeError);
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
        browser.storage.local.remove("img", checkRuntimeError);
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
        browser.storage.local.remove("img", checkRuntimeError);
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
        await browser.storage.local.get();
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
        browser.storage.local.set({ tokens, active });
    } else {
        active = email;
        users.push(email);
        tokens[email] = token;
        recents[email] = [];
        dirs[email] = [];
        childDirs[email] = {};
        const { root } = await fetchRootDir(token);
        roots[email] = root;
        await browser.storage.local.set({
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
        await browser.storage.local.get();
    console.log({ active, roots, tokens, childDirs, dirs, recents });
    if (!newValue.includes(active)) {
        delete roots[active];
        delete tokens[active];
        delete dirs[active];
        delete childDirs[active];
        delete recents[active];
        await browser.storage.local.set({
            active: newValue[0] ?? "",
            roots,
            tokens,
            dirs,
            recents,
            childDirs,
        });
    }
}

export async function getActive() {
    const { active } = await browser.storage.local.get("active");
    return active;
}
export async function getToken() {
    const { active, tokens } = await browser.storage.local.get();
    return tokens[active];
}

export async function getRoot() {
    const { active, roots } = await browser.storage.local.get();
    return roots[active];
}
