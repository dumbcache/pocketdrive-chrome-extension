import { login, logout } from "./connection.js";
import {
    updateRecents,
    initContextMenus,
    init,
    isSystemPage,
    checkRuntimeError,
    saveimg,
    saveimgExternal,
    removeUser,
    beforeInit,
} from "./utils.js";
import { fetchDirs, createDir, fetchParent } from "./drive.js";

try {
    chrome.runtime.onInstalled.addListener(beforeInit);

    chrome.runtime.onStartup.addListener(beforeInit);

    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

    chrome.storage.onChanged.addListener(async (changes) => {
        if (changes.active) {
            let { newValue } = changes.active;
            if (newValue) {
                chrome.action.setIcon(
                    { path: "/images/krabs.png" },
                    checkRuntimeError
                );
                chrome.action.setBadgeText(
                    { text: newValue[0] },
                    checkRuntimeError
                );
            } else {
                chrome.action.setIcon(
                    { path: "/images/krabsOff.png" },
                    checkRuntimeError
                );
                chrome.action.setBadgeText({ text: "" }, checkRuntimeError);
            }
            initContextMenus();
        }

        if (changes.users) {
            let { newValue, oldValue } = changes.users;
            if (newValue?.length === 0) {
                await chrome.storage.local.clear();
                return;
            }
            if (newValue?.length < oldValue?.length) {
                removeUser(newValue);
            }
        }

        if (changes.dirs) {
            let { newValue } = changes.dirs;
            const { active } = await chrome.storage.local.get("active");
            const [tab] = await chrome.tabs.query({
                active: true,
            });
            if (isSystemPage(tab)) return;
            if (newValue) {
                chrome.tabs.sendMessage(
                    tab.id,
                    {
                        context: "DIRS",
                        data: newValue[active],
                    },
                    checkRuntimeError
                );
            }
        }

        if (changes.recents) {
            let { newValue } = changes.recents;
            const { active, recents } = await chrome.storage.local.get();
            if (newValue) {
                if (newValue[active]?.length > 100) {
                    newValue[active].pop();
                    recents[active] = newValue[active];
                    chrome.storage.local.set({ recents }, checkRuntimeError);
                }
            }
        }
    });

    chrome.contextMenus.onClicked.addListener(async (info, tab) => {
        try {
            switch (info.menuItemId) {
                case "refresh":
                    init(true);
                    return;
                case "login":
                    chrome.sidePanel.setPanelBehavior({
                        openPanelOnActionClick: true,
                    });
                case "token":
                    login();
                    return;
                case "logout":
                    logout();
                    chrome.sidePanel.setPanelBehavior({
                        openPanelOnActionClick: false,
                    });
                    return;
                case "images":
                    try {
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
                    return;
                case "save":
                    if (isSystemPage(tab)) return;
                    const exists = await chrome.tabs.sendMessage(tab.id, {
                        context: "CHECK_IF_ROOT_EXISTS",
                    });
                    if (exists)
                        chrome.tabs.sendMessage(tab.id, {
                            context: "SELECTION",
                            status: 200,
                            src: info.srcUrl,
                        });
                    console.log(await fetch(info.srcUrl));
                    return;
            }
        } catch (error) {
            console.warn("error", error);
        }
    });

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        /******** Related to content scripts *******/
        try {
            if (isSystemPage(sender.tab)) return;
            if (message.context === "LOGIN") {
                login();
                return;
            }
            if (message.context === "CHILD_DIRS") {
                (async () => {
                    try {
                        let { parents } = message.data;
                        let { childDirs, active } =
                            await chrome.storage.local.get();
                        if (childDirs[active][parents] === undefined) {
                            let { status, data } = await fetchDirs(parents);
                            childDirs[active][parents] = data;
                            chrome.storage.local.set(
                                { childDirs },
                                checkRuntimeError
                            );
                            sendResponse({
                                status,
                                childDirs: data,
                            });
                            return;
                        }
                        sendResponse({
                            status: 200,
                            childDirs: childDirs[active][parents],
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
                    try {
                        const {
                            id,
                            name,
                            dirName,
                            parentName,
                            src,
                            blob,
                            mimeType,
                        } = message.data;
                        updateRecents(id, dirName, parentName);
                        if (blob) {
                            let { status } = await saveimg({
                                origin:
                                    src === undefined ? sender.tab.url : src,
                                parents: id,
                                blob,
                                mimeType,
                                name,
                            });
                            sendResponse({ code: status });
                        } else {
                            let { status } = await saveimgExternal(id, {
                                origin: sender.tab.url,
                                src,
                            });
                            sendResponse({ code: status });
                        }
                        chrome.storage.local.remove("img", checkRuntimeError);
                    } catch (error) {
                        console.log(error);
                        sendResponse({ status: 500 });
                    }
                })();
                return true;
            }
            if (message.context === "FETCH_PARENT") {
                (async () => {
                    const { status, data } = await fetchParent(message.id);
                    sendResponse({
                        status,
                        data,
                    });
                })();
                return true;
            }
            if (message.context === "CREATE_DIR") {
                (async () => {
                    const { name, parents } = message.data;
                    const { status, data } = await createDir(name, parents);
                    sendResponse({
                        status,
                        data,
                    });
                })();
                return true;
            }
        } catch (error) {
            console.warn(error, `cause: ${error.cause}`);
            chrome.tabs.sendMessage(sender.tab.id, {
                context: message.context,
                status: 500,
            });
        }
    });
} catch (error) {
    console.warn(error, `cause: ${error.cause}`);
}
