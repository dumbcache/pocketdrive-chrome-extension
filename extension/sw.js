try {
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
        let { loginStatus } = await chrome.storage.local.get("loginStatus");
        if (loginStatus === 1) {
            await chrome.action.setIcon({ path: "images/krabs.png" });
            initContextMenus();
            init();
        } else {
            await chrome.action.setIcon({ path: "images/krabsOff.png" });
            await chrome.storage.local.set({ loginStatus: 0 });
        }
    });

    chrome.storage.onChanged.addListener(async (changes) => {
        if (changes.loginStatus) {
            let { newValue } = changes.loginStatus;
            if (newValue === 1) {
                chrome.action.setIcon({ path: "images/krabs.png" });
            } else {
                chrome.action.setIcon({ path: "images/krabsOff.png" });
                chrome.contextMenus.removeAll();
            }
        }
    });

    const init = async () => {
        try {
            await refreshDirs();
            let { childDirs, recents } = await chrome.storage.local.get();
            childDirs = childDirs ? { ...childDirs } : {};
            recents = recents ? [...recents] : [];
            chrome.storage.local.set({ childDirs, recents });
            chrome.storage.local.set({
                root: "1MqEnipzxCT2KVMhTYy_OkYj_mxqRGHCT",
            });
        } catch (error) {
            console.warn(error);
        }
    };

    const refreshDirs = async () => {
        try {
            let parents = "1MqEnipzxCT2KVMhTYy_OkYj_mxqRGHCT";
            let { status, data } = await fetchDirs({ parents });
            await chrome.storage.local.set({ dirs: data.dirs });
        } catch (error) {
            console.warn("Unable to Refresh dirs:", error);
            let { dirs } = await chrome.storage.local.get();
            dirs = dirs ? [...dirs] : [];
            await chrome.storage.local.set({ dirs });
        }
    };

    const updateRecents = async (id, dirName) => {
        let { recents } = await chrome.storage.local.get("recents");
        recents = recents.filter((item) => item.id !== id);
        recents.unshift({ id, name: dirName });
        chrome.storage.local.set({ recents });
    };

    const fetchDirs = async (parents) => {
        let url = "http://127.0.0.1:5001/dumbcache4658/us-central1/utils/dirs";
        const { access_token } = await chrome.storage.local.get("access_token");
        let req = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${access_token}`,
            },
            body: JSON.stringify(parents),
        });
        let { status, statusText } = req;
        if (status !== 200) {
            throw new Error("error while fetching dirs", {
                cause: `${status} ${statusText}`,
            });
        }
        let data = await req.json();
        return { status, data };
    };

    const uploadRequest = async (parents, img) => {
        let url = "http://127.0.0.1:5001/dumbcache4658/us-central1/utils/pics";
        const { access_token } = await chrome.storage.local.get("access_token");
        let body = { ...img, parents };
        let req = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${access_token}`,
            },
            body: JSON.stringify(body),
        });
        let { status, statusText } = req;
        if (status !== 200)
            throw new Error("error while fetching dirs", {
                cause: `${status} ${statusText}`,
            });
        return { status };
    };

    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        try {
            if (info.menuItemId === "refresh") {
                await refreshDirs();
            }
            if (info.menuItemId === "save") {
                await chrome.storage.local.set({
                    img: { origin: info.pageUrl, src: info.srcUrl },
                });
                let data = await chrome.storage.local.get("recents");
                await chrome.tabs.sendMessage(tab.id, {
                    context: "recents",
                    status: 200,
                    data,
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
            if (loginStatus === 0) {
            }
        } catch (error) {
            console.error("error", error);
        }
    });

    chrome.runtime.onMessage.addListener(
        async (message, sender, sendResponse) => {
            try {
                if (message.context === "getChilds") {
                    let { parents } = message.data;
                    let { childDirs } = await chrome.storage.local.get(
                        "childDirs"
                    );

                    if (childDirs[parents] === undefined) {
                        let { status, data } = await fetchDirs({ parents });
                        childDirs[parents] = data.dirs;
                        chrome.storage.local.set({ childDirs });
                        chrome.tabs.sendMessage(sender.tab.id, {
                            context: "childDirs",
                            status,
                            childDirs: data.dirs,
                        });
                    }
                    chrome.tabs.sendMessage(sender.tab.id, {
                        context: "childDirs",
                        status: 200,
                        childDirs: childDirs[parents],
                    });
                }
                if (message.context === "submit") {
                    const { img } = await chrome.storage.local.get("img");
                    const { id, dirName } = message.data;
                    let { status } = await uploadRequest([id], img);
                    chrome.tabs.sendMessage(sender.tab.id, {
                        context: "uploadStatus",
                        status,
                    });
                    updateRecents(id, dirName);
                    chrome.storage.local.remove("img");
                }
                if (message.context === "loginSubmit") {
                    const creds = message.creds;
                    let req = await fetch(
                        "http://127.0.0.1:5001/dumbcache4658/us-central1/utils/login",
                        {
                            method: "POST",
                            headers: { "Content-type": "application/json" },
                            body: JSON.stringify(creds),
                        }
                    );
                    if (req.status !== 200) {
                        await chrome.storage.local.set({
                            access_token: "",
                            loginStatus: 0,
                        });
                        return;
                    }
                    const { token } = await req.json();
                    await chrome.storage.local.set({
                        access_token: token,
                        username: creds.user,
                        loginStatus: 1,
                    });
                    chrome.action.setIcon({ path: "images/krabs.png" });
                    initContextMenus();
                    console.log("session logged in");
                    chrome.runtime.sendMessage({
                        context: "loginStatus",
                        status: 200,
                    });
                }
                if (message.context === "logoutSubmit") {
                    console.log("session logged out");
                    chrome.storage.local.set({ loginStatus: 0 });
                }
            } catch (error) {
                console.error(error);
            }
        }
    );
} catch (error) {
    console.log(error);
}
