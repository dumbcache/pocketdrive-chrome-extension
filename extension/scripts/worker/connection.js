import { getUserInfo, OAUTH, setUser } from "./utils.js";

export const login = async () => {
    browser.identity.launchWebAuthFlow(
        { url: OAUTH, interactive: true },
        async (redirectURL) => {
            browser.runtime.lastError && "";
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
    let { active, users } = await browser.storage.local.get();
    users = users.filter((user) => user !== active);
    await browser.storage.local.set({ users });
    console.log("session logged out");
};
