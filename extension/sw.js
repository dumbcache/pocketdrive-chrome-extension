import { login, logout } from "./utils/connection.js";

try {
    const URL = "http://127.0.0.1:5001/dumbcache4658/us-central1/krabs";
    const initContextMenus = () => {
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

    chrome.runtime.onInstalled.addListener(async () => {
        await chrome.storage.local.set({ loginStatus: 0 });
    });
    chrome.storage.onChanged.addListener(async (changes) => {
        // console.log(changes);
        if (changes.loginStatus) {
            let { newValue } = changes.loginStatus;
            if (newValue === 1) {
                chrome.action.setIcon({ path: "images/krabs.png" });
                initContextMenus();
            } else {
                chrome.action.setIcon({ path: "images/krabsOff.png" });
                chrome.contextMenus.removeAll();
                chrome.storage.local.clear();
            }
        }
        if (changes.dirs) {
            let { newValue } = changes.dirs;
            const [tab] = await chrome.tabs.query({ active: true });
            chrome.tabs.sendMessage(tab.id, {
                context: "dirs",
                data: newValue,
            });
        }
        if (changes.recents) {
            let { newValue } = changes.recents;
            if (newValue?.length > 10) {
                newValue.pop();
                chrome.storage.local.set({ recents: newValue });
            }
        }
    });

    const init = async () => {
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

    const refreshDirs = async () => {
        try {
            let { root } = await chrome.storage.local.get("root");
            console.log(root);
            let { data } = await fetchDirs(root);
            await chrome.storage.local.set({ dirs: data });
        } catch (error) {
            console.warn("Unable to Refresh dirs:", error);
            let { dirs } = await chrome.storage.local.get();
            dirs = dirs ? [...dirs] : [];
            await chrome.storage.local.set({ dirs });
        }
    };
    const refreshChildDirs = async () => {
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

    const updateRecents = async (id, dirName) => {
        let { recents } = await chrome.storage.local.get("recents");
        recents = recents.filter((item) => item.id !== id);
        recents.unshift({ id, name: dirName });
        chrome.storage.local.set({ recents });
    };

    const fetchDirs = async (parent) => {
        let url = `${URL}/dirs/${parent}`;
        const { token } = await chrome.storage.local.get("token");
        let req = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        let { status, statusText } = req;
        if (status === 401) {
            await chrome.storage.local.set({ loginStatus: 0 });
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

    const addtoLocalDirs = async (data, parents) => {
        const { root } = await chrome.storage.local.get("root");
        if (root === parents) {
            let { dirs } = await chrome.storage.local.get("dirs");
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
    const createDir = async (name, parents) => {
        let url = `${URL}/dirs/`;
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
            await chrome.storage.local.set({ loginStatus: 0 });
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

    const uploadRequest = async (parents, img) => {
        let url = `${URL}/pics`;
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
            await chrome.storage.local.set({ loginStatus: 0 });
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

    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        try {
            if (info.menuItemId === "refresh") {
                await refreshDirs();
                refreshChildDirs();
            }
            if (info.menuItemId === "save") {
                await chrome.storage.local.set({
                    img: { origin: info.pageUrl, src: info.srcUrl },
                });
                let { recents } = await chrome.storage.local.get("recents");
                await chrome.tabs.sendMessage(tab.id, {
                    context: "recents",
                    status: 200,
                    data: recents,
                });
            }
        } catch (error) {
            console.error("error", error);
        }
    });

    chrome.action.onClicked.addListener(async (tab) => {
        try {
            const { loginStatus } = await chrome.storage.local.get(
                "loginStatus"
            );
            chrome.tabs.sendMessage(tab.id, { context: "action", loginStatus });
        } catch (error) {
            console.error("error", error);
        }
    });

    chrome.runtime.onMessage.addListener(
        async (message, sender, sendResponse) => {
            /******** Related to popup *******/
            try {
                if (message.context === "loginSubmit") {
                    login(sender.tab.id);
                }
                if (message.context === "logoutSubmit") {
                    logout(sender.tab.id);
                }
            } catch (error) {
                console.warn(error, `cause: ${error?.cause}`);
                chrome.runtime.sendMessage({
                    context: message.context,
                    status: 500,
                });
            }

            /******** Related to content scripts *******/
            try {
                if (message.context === "childDirs") {
                    let { parents } = message.data;
                    let { childDirs } = await chrome.storage.local.get(
                        "childDirs"
                    );

                    if (childDirs[parents] === undefined) {
                        let { status, data } = await fetchDirs(parents);
                        childDirs[parents] = data;
                        chrome.storage.local.set({ childDirs });
                        chrome.tabs.sendMessage(sender.tab.id, {
                            context: "childDirs",
                            status,
                            childDirs: data,
                        });
                        return;
                    }
                    chrome.tabs.sendMessage(sender.tab.id, {
                        context: "childDirs",
                        status: 200,
                        childDirs: childDirs[parents],
                    });
                }
                if (message.context === "save") {
                    const { img } = await chrome.storage.local.get("img");
                    const { id, dirName } = message.data;
                    let { status } = await uploadRequest([id], img);
                    chrome.tabs.sendMessage(sender.tab.id, {
                        context: "save",
                        status,
                    });
                    updateRecents(id, dirName);
                    chrome.storage.local.remove("img");
                }

                if (message.context === "createDir") {
                    const { name, parents } = message.data;
                    const { status, data } = await createDir(name, parents);
                    chrome.tabs.sendMessage(sender.tab.id, {
                        context: "createDir",
                        status,
                        data,
                    });
                }
            } catch (error) {
                console.warn(error, `cause: ${error.cause}`);
                chrome.tabs.sendMessage(sender.tab.id, {
                    context: message.context,
                    status: 500,
                });
            }
        }
    )();
} catch (error) {
    console.warn(error, `cause: ${error.cause}`);
}
