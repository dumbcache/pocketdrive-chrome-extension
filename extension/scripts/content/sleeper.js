(async () => {
    function sleepListner(message, sender, sendResponse) {
        if (message.context === "CHECK_IF_ROOT_EXISTS") {
            const root = document.getElementById("krab-ext");
            if (root) {
                sendResponse(true);
                return;
            }
            import(chrome.runtime.getURL("scripts/content/content.js"));
            setTimeout(() => {
                sendResponse(true);
            }, 500);
            return true;
        }
    }
    chrome.runtime.onMessage.addListener(sleepListner);
})();
