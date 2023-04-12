import { login, logout } from "./utils/connection.js";
import {
    createDir,
    fetchDirs,
    refreshChildDirs,
    refreshDirs,
    updateRecents,
    uploadRequest,
    initContextMenus,
} from "./utils/utils.js";

try {
    chrome.runtime.onInstalled.addListener(async () => {
        const { status, token } = await chrome.storage.local.get([
            "status",
            "token",
        ]);
        if (status !== 1 || !token) {
            chrome.action.setIcon({ path: "images/krabsOff.png" });
            return;
        }
        initContextMenus();
        chrome.action.setIcon({ path: "images/krabs.png" });
    });
    chrome.storage.onChanged.addListener(async (changes) => {
        // console.log(changes);
        if (changes.status) {
            let { newValue } = changes.status;
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
            const { status } = await chrome.storage.local.get("status");
            chrome.tabs.sendMessage(tab.id, {
                context: "action",
                status,
            });
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
