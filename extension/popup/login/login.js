(async () => {
    const ENDPOINT = `http://127.0.0.1:5001/dumbcache4658/us-central1/krabs`;
    const connection = document.querySelector(".connection");
    const loginButton = document.querySelector(".login");
    const logoutButton = document.querySelector(".logout");
    const warnings = document.querySelector(".warnings");
    const { status } = await chrome.storage.local.get("status");
    console.log(status);
    status === 1
        ? (loginButton.style.display = "none")
        : (logoutButton.style.display = "none");

    loginButton.onclick = async () => {
        const req = await fetch(`${ENDPOINT}/login/ext`);
        const { url } = await req.json();
        chrome.identity.launchWebAuthFlow(
            { url, interactive: true },
            async (redirectURL) => {
                chrome.runtime.lastError && "";
                if (!redirectURL) {
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
                    return;
                }
                const { root, token } = await req.json();
                chrome.storage.local.set({ root, token, status: 1 });
                console.log("session logged in");
            }
        );
    };
    logoutButton.onclick = async () => {
        const { token } = await chrome.storage.local.get("token");
        let { status } = await fetch(`${ENDPOINT}/logout`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (status !== 200) {
            return;
        }
        await chrome.storage.local.set({ status: 0 });
        console.log("session logged out");
    };
})();
