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
        let { loginStatus, username } = await chrome.storage.local.get([
            "loginStatus",
            "username",
        ]);
        if (loginStatus === 1) {
            await chrome.action.setIcon({ path: "images/krabs.png" });
            await chrome.action.setBadgeText({ text: username[0] });
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
                let { username } = await chrome.storage.local.get("username");
                chrome.action.setIcon({ path: "images/krabs.png" });
                chrome.action.setBadgeText({ text: username[0] });
                initContextMenus();
            } else {
                chrome.action.setIcon({ path: "images/krabsOff.png" });
                chrome.action.setBadgeText({ text: "" });
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
    });

    const init = async () => {
        try {
            await refreshDirs();
            refreshChildDirs();
            let { recents } = await chrome.storage.local.get();
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
            let { data } = await fetchDirs(root);
            await chrome.storage.local.set({ dirs: data });
        } catch (error) {
            console.warn("Unable to Refresh dirs:", error, error.cause);
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
            console.warn("Unable to Refresh childDirs:", error, error.cause);
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
        let { username } = await chrome.storage.local.get("username");
        let url = `http://127.0.0.1:5001/dumbcache4658/us-central1/krabs/${username}/dirs/${parent}`;
        const { access_token } = await chrome.storage.local.get("access_token");
        let req = await fetch(url, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${access_token}`,
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
        let { username } = await chrome.storage.local.get("username");
        let url = `http://127.0.0.1:5001/dumbcache4658/us-central1/krabs/${username}/dirs/`;
        const { access_token } = await chrome.storage.local.get("access_token");
        let req = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${access_token}`,
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
        let { username } = await chrome.storage.local.get("username");
        let url = `http://127.0.0.1:5001/dumbcache4658/us-central1/krabs/${username}/pics`;
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
            if (loginStatus === 0) {
            }
        } catch (error) {
            console.error("error", error);
        }
    });

    const loginHandler = async (creds) => {
        let req = await fetch(
            "http://127.0.0.1:5001/dumbcache4658/us-central1/krabs/login",
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
            chrome.runtime.sendMessage({
                context: "loginStatus",
                status: req.status,
                message: `${req.status} ${req.statusText}`,
            });
            return {};
        }
        const { token, root, user } = await req.json();
        await chrome.storage.local.set({
            access_token: token,
            username: user,
            loginStatus: 1,
            root,
            childDirs: {},
        });
        chrome.action.setIcon({ path: "images/krabs.png" });
        refreshDirs();
        console.log("session logged in");
        return req.status;
    };
    const logoutHandler = async () => {
        const { username, access_token } = await chrome.storage.local.get([
            "username",
            "access_token",
        ]);
        let { status } = await fetch(
            `http://127.0.0.1:5001/dumbcache4658/us-central1/krabs/${username}/logout`,
            {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            }
        );
        if (status !== 200) {
            throw new Error("unable to logout", { cause });
        }
        chrome.storage.local.set({ loginStatus: 0 });
        console.log("session logged out");
    };

    chrome.runtime.onMessage.addListener(
        async (message, sender, sendResponse) => {
            /******** Related to popup *******/
            try {
                if (message.context === "loginSubmit") {
                    const creds = message.creds;
                    let status = await loginHandler(creds);
                    chrome.runtime.sendMessage({
                        context: "loginSubmit",
                        status,
                    });
                    const [tab] = await chrome.tabs.query({ active: true });
                }
                if (message.context === "logoutSubmit") {
                    await logoutHandler();
                    const [tab] = await chrome.tabs.query({ active: true });
                    chrome.tabs.sendMessage(tab.id, {
                        context: "loginStatus",
                        status: 0,
                    });
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
    );
} catch (error) {
    console.warn(error, `cause: ${error.cause}`);
}
