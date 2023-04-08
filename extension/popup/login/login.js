(async () => {
    const loginWrapper = document.querySelector(".loginWrapper");
    const loginButton = document.querySelector(".login");
    const logOutButton = document.querySelector(".logout");
    const warnings = document.querySelector(".warnings");
    const form = document.querySelector(".loginForm");
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
        // window.open(
        //     "http://127.0.0.1:5001/dumbcache4658/us-central1/krabsv2/login",
        //     "",
        //     "popup=1,left=100,top=100,width=320,height=320"
        // );
        const req = await fetch(
            "http://127.0.0.1:5001/dumbcache4658/us-central1/krabs/login/ext"
        );
        const { url } = await req.json();
        chrome.identity.launchWebAuthFlow(
            { url, interactive: true },
            async (redirectURL) => {
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
                const { token } = await req.json();
                console.log(token);
                req = await fetch(
                    "http://127.0.0.1:5001/dumbcache4658/us-central1/krabs/auth",
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                console.log(await req.json());
            }
        );
    };

    chrome.runtime.onMessage.addListener((message, sender, sendRes) => {
        if (message.context === "loginSubmit") {
            if (message.status !== 200) {
                warnings.innerText = message.message;
                return;
            }
            loginWrapper.style.display = "none";
        }
    });
})();
