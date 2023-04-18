import { login, logout } from "./utils/connection.js";
import {
    createDir,
    fetchDirs,
    refreshChildDirs,
    refreshDirs,
    updateRecents,
    uploadRequest,
    initContextMenus,
    init,
    isSystemPage,
} from "./utils/utils.js";

try {
    chrome.runtime.onInstalled.addListener(async () => {
        const { status, token } = await chrome.storage.local.get([
            "status",
            "token",
        ]);
        if (status !== 1 || !token) {
            chrome.action.setIcon({ path: "images/krabsOff.png" });
            initContextMenus();
            return;
        }
        initContextMenus();
        init();
        chrome.action.setIcon({ path: "images/krabs.png" });
    });
    chrome.storage.onChanged.addListener(async (changes) => {
        // console.log(changes);
        if (changes.status) {
            let { newValue } = changes.status;
            if (newValue === 1) {
                chrome.action.setIcon({ path: "images/krabs.png" });
            } else {
                chrome.action.setIcon({ path: "images/krabsOff.png" });
                chrome.contextMenus.removeAll();
                chrome.storage.local.clear();
            }
            initContextMenus();
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
                await chrome.storage.local.set({ recents: [] });
            }
            if (info.menuItemId === "login") {
                login(tab.id);
            }
            if (info.menuItemId === "logout") {
                logout(tab.id);
            }
            if (info.menuItemId === "save") {
                await chrome.storage.local.set({
                    img: { origin: info.pageUrl, src: info.srcUrl },
                });
                let { recents } = await chrome.storage.local.get("recents");
                await chrome.tabs.sendMessage(tab.id, {
                    context: "selection",
                    status: 200,
                    recents,
                    src: info.srcUrl,
                });
            }
        } catch (error) {
            console.error("error", error);
        }
    });

    chrome.action.onClicked.addListener(async (tab) => {
        try {
            console.log(tab.url);
            if (isSystemPage(tab)) return;
            const exits = await chrome.tabs.sendMessage(tab.id, {
                context: "action",
            });
            if (exits) return;
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ["scripts/bulk.js"],
            });
        } catch (error) {
            console.error("error", error);
        }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        /******** Related to content scripts *******/
        try {
            if (isSystemPage(tab)) return;
            if (message.context === "childDirs") {
                (async () => {
                    try {
                        let { parents } = message.data;
                        let { childDirs } = await chrome.storage.local.get(
                            "childDirs"
                        );

                        if (childDirs[parents] === undefined) {
                            let { status, data } = await fetchDirs(parents);
                            childDirs[parents] = data;
                            chrome.storage.local.set({ childDirs });
                            sendResponse({
                                status,
                                childDirs: data,
                            });
                            return;
                        }
                        sendResponse({
                            status: 200,
                            childDirs: childDirs[parents],
                        });
                    } catch (error) {
                        sendResponse({
                            status: 500,
                        });
                    }
                })();
                return true;
            }
            if (message.context === "save") {
                (async () => {
                    try {
                        const { img } = await chrome.storage.local.get("img");
                        const { id, dirName } = message.data;
                        let { status } = await uploadRequest([id], img);
                        sendResponse({ code: status });
                        updateRecents(id, dirName);
                        chrome.storage.local.remove("img");
                    } catch (error) {
                        sendResponse({ status: 500 });
                    }
                })();
                return true;
            }

            if (message.context === "createDir") {
                (async () => {
                    const { name, parents } = message.data;
                    const { status, data } = await createDir(name, parents);
                    chrome.tabs.sendMessage(sender.tab.id, {
                        context: "createDir",
                        status,
                        data,
                    });
                })();
            }
        } catch (error) {
            console.warn(error, `cause: ${error.cause}`);
            chrome.tabs.sendMessage(
                sender.tab.id,
                {
                    context: message.context,
                    status: 500,
                },
                () => chrome.runtime.lastError
            );
        }
    })();
} catch (error) {
    console.warn(error, `cause: ${error.cause}`);
}
