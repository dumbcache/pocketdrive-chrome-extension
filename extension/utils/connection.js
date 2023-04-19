import { ENDPOINT, initContextMenus } from "./utils.js";

export const login = async (tabid) => {
    const req = await fetch(`${ENDPOINT}/login/ext`);
    const { url } = await req.json();
    chrome.identity.launchWebAuthFlow(
        { url, interactive: true },
        async (redirectURL) => {
            chrome.runtime.lastError && "";
            if (!redirectURL) {
                console.log("redirect failed");
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
            console.log(req.status);
            if (req.status !== 200) {
                console.log("login failed");
                return;
            }
            const { root, token } = await req.json();
            await chrome.storage.local.set({ root, token, status: 1 });
            await initContextMenus();
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
        console.log("logout failed");
        return;
    }
    await chrome.storage.local.set({ status: 0 });
    console.log("session logged out");
};
