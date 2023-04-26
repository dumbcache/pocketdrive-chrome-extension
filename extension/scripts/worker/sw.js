import { login, logout } from "./connection.js";
import {
    createDir,
    fetchDirs,
    updateRecents,
    uploadRequest,
    initContextMenus,
    init,
    isSystemPage,
    isLoggedIn,
} from "./utils.js";

try {
    chrome.runtime.onInstalled.addListener(async () => {
        const { token } = await isLoggedIn();
        if (!token) {
            chrome.action.setIcon({ path: "/images/krabsOff.png" });
            initContextMenus();
            return;
        }
        initContextMenus();
        init();
        chrome.action.setIcon({ path: "/images/krabs.png" });
    });

    chrome.storage.onChanged.addListener(async (changes) => {
        if (changes.token) {
            let { newValue } = changes.token;
            if (newValue) {
                chrome.action.setIcon({ path: "/images/krabs.png" });
                init();
            } else {
                chrome.action.setIcon({ path: "/images/krabsOff.png" });
                chrome.storage.local.clear();
            }
            initContextMenus();
        }
        if (changes.dirs) {
            let { newValue } = changes.dirs;
            const [tab] = await chrome.tabs.query({
                active: true,
            });
            if (isSystemPage(tab)) return;
            chrome.tabs.sendMessage(tab.id, {
                context: "DIRS",
                data: newValue,
            });
        }
        if (changes.recents) {
            let { newValue } = changes.recents;
            if (newValue?.length > 10) {
                newValue.pop();
                await chrome.storage.local.set({ recents: newValue });
            }
        }
    });

    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        try {
            if (info.menuItemId === "refresh") {
                init();
                return;
            }
            if (info.menuItemId === "login") {
                login(tab.id);
                return;
            }
            if (info.menuItemId === "logout") {
                logout(tab.id);
                return;
            }
            if (info.menuItemId === "save") {
                if (isSystemPage(tab)) return;
                const exists = await chrome.tabs.sendMessage(tab.id, {
                    context: "CHECK_IF_ROOT_EXISTS",
                });
                if (exists)
                    await chrome.tabs.sendMessage(tab.id, {
                        context: "SELECTION",
                        status: 200,
                        src: info.srcUrl,
                    });
                return;
            }
        } catch (error) {
            console.warn("error", error);
        }
    });

    chrome.action.onClicked.addListener(async (tab) => {
        try {
            const { token } = await isLoggedIn();
            if (!token) {
                login(tab.id);
                return;
            }
            if (isSystemPage(tab)) return;
            const exits = await chrome.tabs.sendMessage(tab.id, {
                context: "CHECK_IF_ROOT_EXISTS",
            });
            if (exits)
                chrome.tabs.sendMessage(tab.id, {
                    context: "ACTION",
                });
        } catch (error) {
            console.warn("error", error);
        }
    });
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        /******** Related to content scripts *******/
        try {
            if (isSystemPage(sender.tab)) return;
            if (message.context === "CHILD_DIRS") {
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
                        console.warn(error);
                        sendResponse({
                            status: 500,
                        });
                    }
                })();
                return true;
            }
            if (message.context === "SAVE") {
                (async () => {
                    await Promise((res, rej) => {});
                    // try {
                    //     const { id, dirName, src } = message.data;
                    //     updateRecents(id, dirName);
                    //     let { status } = await uploadRequest(id, {
                    //         origin: sender.tab.url,
                    //         src,
                    //     });
                    //     sendResponse({ code: status });
                    //     chrome.storage.local.remove("img");
                    // } catch (error) {
                    //     console.log(error);
                    //     sendResponse({ status: 500 });
                    // }
                })();
                return true;
            }
            if (message.context === "CREATE_DIR") {
                (async () => {
                    const { name, parents } = message.data;
                    const { status, data } = await createDir(name, parents);
                    chrome.tabs.sendMessage(sender.tab.id, {
                        context: "CREATE_DIR",
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
    });
} catch (error) {
    console.warn(error, `cause: ${error.cause}`);
}
