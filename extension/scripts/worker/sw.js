import { login, logout } from "./connection.js";
import {
    updateRecents,
    initContextMenus,
    init,
    isSystemPage,
    isLoggedIn,
    checkRuntimeError,
    saveimg,
    saveimgExternal,
    removeUser,
} from "./utils.js";
import { fetchDirs, createDir } from "./drive.js";

try {
    browser.runtime.onInstalled.addListener(async () => {
        const { active } = await browser.storage.local.get("active");
        if (!active) {
            browser.action.setIcon(
                { path: "/images/krabsOff.png" },
                checkRuntimeError
            );
            initContextMenus();
            return;
        }
        initContextMenus();
        init();
        browser.action.setIcon(
            { path: "/images/krabs.png" },
            checkRuntimeError
        );
        browser.action.setBadgeText({ text: active[0] }, checkRuntimeError);
    });

    browser.action.onClicked.addListener(() => {
        browser.sidebarAction.toggle();
    });

    browser.storage.onChanged.addListener(async (changes) => {
        if (changes.active) {
            let { newValue } = changes.active;
            if (newValue) {
                browser.action.setIcon(
                    { path: "/images/krabs.png" },
                    checkRuntimeError
                );
                browser.action.setBadgeText(
                    { text: newValue[0] },
                    checkRuntimeError
                );
            } else {
                browser.action.setIcon(
                    { path: "/images/krabsOff.png" },
                    checkRuntimeError
                );
                browser.action.setBadgeText({ text: "" }, checkRuntimeError);
            }
            initContextMenus();
        }

        if (changes.users) {
            let { newValue, oldValue } = changes.users;
            if (newValue?.length === 0) {
                await browser.storage.local.clear();
                return;
            }
            if (newValue?.length < oldValue?.length) {
                removeUser(newValue);
            }
        }

        if (changes.dirs) {
            let { newValue } = changes.dirs;
            if (newValue) {
                const { active } = await browser.storage.local.get("active");
                const [tab] = await browser.tabs.query({
                    active: true,
                });
                if (isSystemPage(tab)) return;
                browser.tabs.sendMessage(
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
            if (newValue) {
                const { active } = await browser.storage.local.get("active");
                if (newValue[active]?.length > 50) {
                    newValue[active].pop();
                    browser.storage.local.set(
                        { recents: newValue[active] },
                        checkRuntimeError
                    );
                }
            }
        }
    });

    browser.contextMenus.onClicked.addListener(async (info, tab) => {
        try {
            switch (info.menuItemId) {
                case "refresh":
                    init(true);
                    return;
                case "login":
                case "token":
                    login();
                    return;
                case "logout":
                    logout();
                    return;
                case "images":
                    try {
                        if (isSystemPage(tab)) return;
                        const exits = await browser.tabs.sendMessage(tab.id, {
                            context: "CHECK_IF_ROOT_EXISTS",
                        });
                        if (exits)
                            browser.tabs.sendMessage(tab.id, {
                                context: "ACTION",
                            });
                    } catch (error) {
                        console.warn("error", error);
                    }
                    return;
                case "save":
                    if (isSystemPage(tab)) return;
                    const exists = await browser.tabs.sendMessage(tab.id, {
                        context: "CHECK_IF_ROOT_EXISTS",
                    });
                    if (exists)
                        browser.tabs.sendMessage(tab.id, {
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

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        /******** Related to content scripts *******/
        try {
            if (isSystemPage(sender.tab)) return;
            if (message.context === "CHILD_DIRS") {
                (async () => {
                    try {
                        let { parents } = message.data;
                        let { childDirs, active } =
                            await browser.storage.local.get();
                        if (childDirs[active][parents] === undefined) {
                            let { status, data } = await fetchDirs(parents);
                            childDirs[active][parents] = data;
                            browser.storage.local.set(
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
                        const { id, dirName, src, blob, mimeType } =
                            message.data;
                        updateRecents(id, dirName);
                        if (blob) {
                            let { status } = await saveimg({
                                origin:
                                    src === undefined ? sender.tab.url : src,
                                parents: id,
                                blob,
                                mimeType,
                            });
                            sendResponse({ code: status });
                        } else {
                            let { status } = await saveimgExternal(id, {
                                origin: sender.tab.url,
                                src,
                            });
                            sendResponse({ code: status });
                        }
                        browser.storage.local.remove("img", checkRuntimeError);
                    } catch (error) {
                        console.log(error);
                        sendResponse({ status: 500 });
                    }
                })();
                return true;
            }
            if (message.context === "CREATE_DIR") {
                (async () => {
                    const { name, parents } = message.data;
                    const { status, data } = await createDir(name, parents);
                    browser.tabs.sendMessage(sender.tab.id, {
                        context: "CREATE_DIR",
                        status,
                        data,
                    });
                })();
            }
        } catch (error) {
            console.warn(error, `cause: ${error.cause}`);
            browser.tabs.sendMessage(sender.tab.id, {
                context: message.context,
                status: 500,
            });
        }
    });
} catch (error) {
    console.warn(error, `cause: ${error.cause}`);
}
