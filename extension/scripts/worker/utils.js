export const ENDPOINT = `http://127.0.0.1:5001/dumbcache4658/us-central1/krabs`;

export function checkRuntimeError() {
    chrome.runtime.lastError && console.log(chrome.runtime.lastError);
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
        await refreshDirs();
        chrome.storage.local.set({ childDirs: {} }, checkRuntimeError);
        chrome.storage.local.set({ recents: [] }, checkRuntimeError);
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

export const fetchDirs = async (parent) => {
    let url = `${ENDPOINT}/dirs/${parent}`;
    const { token } = await chrome.storage.local.get("token");
    let req = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    let { status, statusText } = req;
    if (status === 401) {
        chrome.storage.local.set({ token: null }, checkRuntimeError);
        throw new Error("error while fetching dirs", {
            cause: `${status} ${statusText} ${await req.text()}`,
        });
    }
    if (status !== 200) {
        throw new Error("error while fetching dirs", {
            cause: `${status} ${statusText} ${await req.text()}`,
        });
    }
    let data = await req.json();
    return { status, data };
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
export const createDir = async (name, parents) => {
    let url = `${ENDPOINT}/dirs/`;
    const { token } = await chrome.storage.local.get("token");
    let req = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ dirName: name, parents }),
    });
    let { status, statusText } = req;
    if (status === 401) {
        chrome.storage.local.set({ token: null }, checkRuntimeError);
        throw new Error("error while creating dirs", {
            cause: `${status} ${statusText} ${await req.text()}`,
        });
    }
    if (status !== 200) {
        throw new Error("error while fetching dirs", {
            cause: `${status} ${statusText} ${await req.text()}`,
        });
    }
    let data = await req.json();
    addtoLocalDirs(data, parents);
    return { status, data };
};

export const uploadRequest = async (parents, img) => {
    let url = `${ENDPOINT}/pics`;
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
    let { status, statusText } = req;
    if (status === 401) {
        chrome.storage.local.set({ token: null }, checkRuntimeError);
        throw new Error("error while uploading img", {
            cause: `${status} ${statusText} ${await req.text()}`,
        });
    }
    if (status !== 200) {
        chrome.storage.local.remove("img", checkRuntimeError);
        throw new Error("error while uploading img", {
            cause: `${status} ${statusText}`,
        });
    }
    return { status };
};
