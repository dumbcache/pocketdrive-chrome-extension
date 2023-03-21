let form = document.querySelector(".loginForm");
form.onsubmit = async (e) => {
    e.preventDefault();
    let creds = {};
    for (let [name, val] of new FormData(form)) {
        creds[name] = val.trim();
    }
    const res = await chrome.runtime.sendMessage({
        context: "loginSubmit",
        createImageBitmap,
    });
};
