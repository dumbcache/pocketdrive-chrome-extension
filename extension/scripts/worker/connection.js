import { initContextMenus, OAUTH } from "./utils.js";
import { fetchRootDir } from "./drive.js";

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
            const { root } = await chrome.storage.local.get("root");
            if (!root) {
                const { root } = await fetchRootDir(token);
                await chrome.storage.local.set({ root });
            }
            await chrome.storage.local.set({ token });
            await initContextMenus();
            console.log("session logged in");
        }
    );
};

export const logout = async () => {
    await chrome.storage.local.set({ token: null });
    console.log("session logged out");
};
