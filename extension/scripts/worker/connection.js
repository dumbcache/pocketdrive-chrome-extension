import {
    checkRuntimeError,
    getUserInfo,
    OAUTH,
    refreshDirs,
    setUser,
} from "./utils.js";

export const login = async () => {
    chrome.identity.launchWebAuthFlow(
        { url: OAUTH, interactive: true },
        async (redirectURL) => {
            chrome.runtime.lastError && "";
            if (!redirectURL) {
                console.log("redirect failed");
                return;
            }
            const { active } = await chrome.storage.local.get("active");
            const url = new URL(redirectURL);
            const token = url.hash.split("&")[0].split("=")[1];
            const userinfo = await getUserInfo(token);
            await setUser(userinfo, token);
            console.log("session logged in");
            if (!active) {
                await refreshDirs();
                chrome.runtime.sendMessage(
                    {
                        context: "LOGIN",
                    },
                    checkRuntimeError
                );
            }
        }
    );
};

export const logout = async () => {
    let { active, users } = await chrome.storage.local.get();
    users = users.filter((user) => user !== active);
    await chrome.storage.local.clear();
    await chrome.storage.local.set({ users });
    chrome.runtime.sendMessage(
        {
            context: "LOGOUT",
        },
        checkRuntimeError
    );
    console.log("session logged out");
};
