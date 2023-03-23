(async () => {
    const loginWrapper = document.querySelector(".loginWrapper");
    const logOutButton = document.querySelector(".logout");
    const warnings = document.querySelector(".warnings");
    const form = document.querySelector(".loginForm");
    const { loginStatus } = await chrome.storage.local.get("loginStatus");

    if (loginStatus === 1) {
        loginWrapper.style.display = "none";
        logOutButton.style.display = "initial";
        logOutButton.onclick = (e) => {
            console.log("clicked");
            chrome.runtime.sendMessage({ context: "logoutSubmit" });
        };
        return;
    }
    logOutButton.style.display = "none";
    form.onsubmit = async (e) => {
        e.preventDefault();
        let creds = {};
        for (let [name, val] of new FormData(form)) {
            creds[name] = val.trim();
        }
        await chrome.runtime.sendMessage({
            context: "loginSubmit",
            creds,
        });
    };
    chrome.runtime.onMessage.addListener((message, sender, sendRes) => {
        if (message.context === "loginStatus") {
            if (message.status !== 200) {
                warnings.innerText = message.message;
                return;
            }
            loginWrapper.style.display = "none";
        }
    });
})();
