const ENDPOINT = `http://127.0.0.1:5001/dumbcache4658/us-central1/krabs`;
export async function login(tabid) {
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
            chrome.storage.local.set({ root, token, loginStatus: 1 });
            await chrome.tabs.sendMessage(tabid, {
                context: "loginStatus",
                status: 1,
            });
        }
    );
}

export async function logout(tabid) {
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
    await chrome.storage.local.set({ loginStatus: 0 });
    console.log("session logged out");
}
