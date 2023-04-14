export const ENDPOINT = `http://127.0.0.1:5001/dumbcache4658/us-central1/krabs`;

export const initContextMenus = () => {
    chrome.contextMenus.create({
        id: "save",
        title: "KrabSave",
        contexts: ["image"],
    });
    chrome.contextMenus.create({
        id: "refresh",
        title: "KrabRefresh",
        contexts: ["page"],
    });
};

export const init = async () => {
    try {
        await refreshDirs();
        refreshChildDirs();
        let { recents } = await chrome.storage.local.get("recents");
        recents = recents ? [...recents] : [];
        chrome.storage.local.set({ recents });
    } catch (error) {
        console.warn(error);
        console.log("cause:", error.cause);
    }
};

export const refreshDirs = async () => {
    try {
        let { root } = await chrome.storage.local.get("root");
        let { data } = await fetchDirs(root);
        await chrome.storage.local.set({ dirs: data });
    } catch (error) {
        console.warn("Unable to Refresh dirs:", error);
        let { dirs } = await chrome.storage.local.get();
        dirs = dirs ? [...dirs] : [];
        await chrome.storage.local.set({ dirs });
    }
};
export const refreshChildDirs = async () => {
    try {
        let { childDirs, dirs } = await chrome.storage.local.get([
            "childDirs",
            "dirs",
        ]);
        if (!childDirs) childDirs = {};
        for (let child of Object.keys(childDirs)) {
            let status = false;
            for (let { id } of dirs) {
                child === id && (status = true);
            }
            status || delete childDirs[child];
        }
        if (childDirs) {
            for (let parent of Object.keys(childDirs)) {
                const { data } = await fetchDirs(parent);
                childDirs[parent] = data;
            }
            chrome.storage.local.set({ childDirs });
        }
    } catch (error) {
        console.warn("Unable to Refresh childDirs:", error);
        let { childDirs } = await chrome.storage.local.get("childDirs");
        childDirs = childDirs ? { ...childDirs } : {};
        await chrome.storage.local.set({ childDirs });
    }
};

export const updateRecents = async (id, dirName) => {
    let { recents } = await chrome.storage.local.get("recents");
    if (!recents) {
        chrome.storage.local.set({ recents: [{ id, name: dirName }] });
        return;
    }
    recents = recents.filter((item) => item.id !== id);
    recents.unshift({ id, name: dirName });
    chrome.storage.local.set({ recents });
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
        await chrome.storage.local.set({ status: 0 });
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
        chrome.storage.local.set({ dirs });
        return;
    }
    let { childDirs } = await chrome.storage.local.get("childDirs");
    childDirs[parents]
        ? childDirs[parents].unshift(data)
        : (childDirs[parents] = [data]);
    chrome.storage.local.set({ childDirs });
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
        await chrome.storage.local.set({ status: 0 });
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
        await chrome.storage.local.set({ status: 0 });
        throw new Error("error while uploading img", {
            cause: `${status} ${statusText} ${await req.text()}`,
        });
    }
    if (status !== 200) {
        chrome.storage.local.remove("img");
        throw new Error("error while uploading img", {
            cause: `${status} ${statusText}`,
        });
    }
    return { status };
};
