import { ENDPOINT } from "./utils.js";

export const login = async (tabid) => {
    const req = await fetch(`${ENDPOINT}/login/ext`);
    const { url } = await req.json();
    chrome.identity.launchWebAuthFlow(
        { url, interactive: true },
        async (redirectURL) => {
            chrome.runtime.lastError && "";
            if (!redirectURL) {
                await chrome.tabs.sendMessage(tabid, {
                    context: "loginStatus",
                    status: 2,
                });
                return;
            }
            const url = new URL(redirectURL);
            const id_token = url.hash.split("&")[0].split("=")[1];
            let req = await fetch(`${ENDPOINT}/login`, {
                method: "post",
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify({ id_token }),
            });
            if (req.status !== 200) {
                await chrome.tabs.sendMessage(tabid, {
                    context: "loginStatus",
                    status: 2,
                });
                return;
            }
            const { root, token } = await req.json();
            chrome.storage.local.set({ root, token, status: 1 });
            await chrome.tabs.sendMessage(tabid, {
                context: "loginStatus",
                status: 1,
            });
        }
    );
};

export const logout = async (tabid) => {
    const { token } = await chrome.storage.local.get("token");
    let { status } = await fetch(`${ENDPOINT}/logout`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (status !== 200) {
        chrome.tabs.sendMessage(tabid, { context: "loginStatus", status: 2 });
        return;
    }
    await chrome.tabs.sendMessage(tabid, { context: "loginStatus", status: 0 });
    await chrome.storage.local.set({ status: 0 });
    console.log("session logged out");
};
