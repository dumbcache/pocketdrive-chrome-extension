import { getUserInfo, OAUTH, setUser } from "./utils.js";

export const login = async () => {
    chrome.identity.launchWebAuthFlow(
        { url: OAUTH, interactive: true },
        async (redirectURL) => {
            chrome.runtime.lastError && "";
            if (!redirectURL) {
                console.log("redirect failed");
                return;
            }
            const url = new URL(redirectURL);
            const token = url.hash.split("&")[0].split("=")[1];
            const userinfo = await getUserInfo(token);
            await setUser(userinfo, token);
            console.log("session logged in");
        }
    );
};

export const logout = async () => {
    const { active } = await chrome.storage.local.get("active");
    await chrome.storage.local.remove(active);
    await chrome.storage.local.set({ active: "" });
    console.log("session logged out");
};
