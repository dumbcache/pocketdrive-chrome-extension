(async () => {
    const loginWrapper = document.querySelector(".loginWrapper");
    const loginButton = document.querySelector(".login");
    const logOutButton = document.querySelector(".logout");
    const warnings = document.querySelector(".warnings");
    const { loginStatus } = await chrome.storage.local.get("loginStatus");

    if (loginStatus === 1) {
        logOutButton.style.display = "initial";
        logOutButton.onclick = (e) => {
            console.log("clicked");
            chrome.runtime.sendMessage({ context: "logoutSubmit" });
        };
        return;
    }
    loginButton.onclick = async () => {
        const req = await fetch(
            "http://127.0.0.1:5001/dumbcache4658/us-central1/krabs/login/ext"
        );
        const { url } = await req.json();
        chrome.identity.launchWebAuthFlow(
            { url, interactive: true },
            async (redirectURL) => {
                chrome.runtime.lastError && "";
                if (!redirectURL) return;
                const url = new URL(redirectURL);
                const id_token = url.hash.split("&")[0].split("=")[1];
                let req = await fetch(
                    "http://127.0.0.1:5001/dumbcache4658/us-central1/krabs/login",
                    {
                        method: "post",
                        headers: {
                            "content-type": "application/json",
                        },
                        body: JSON.stringify({ id_token }),
                    }
                );
                if (req.status !== 200) return;
                const { root, token } = await req.json();
                const mes = await chrome.runtime.sendMessage({
                    context: "loginSubmit",
                    root,
                    token,
                });
                console.log(mes);
            }
        );
    };

    chrome.runtime.onMessage.addListener((message, sender, sendRes) => {
        console.log(message);
        if (message.context === "loginStatus") {
            if (message.status === 200) {
                warnings.innerText = message.message;
                return;
            }
            loginWrapper.style.display = "none";
        }
    });
})();
