(async () => {
    function createElement(type, attributes = [], elementBody = "") {
        let element = document.createElement(type);
        for (let [key, val] of attributes) {
            element.setAttribute(key, val);
        }
        element.classList.add(type);
        element.classList.add("krab");
        return element;
    }

    function createOptionsElement(dirs, className) {
        let optionWrapper = createElement("div", [
            ["class", `optionWrapper ${className}`],
        ]);
        for (let { id, name } of dirs) {
            let div = createElement("div", [
                ["class", `option`],
                ["data-id", id],
                ["data-dir-name", name],
            ]);
            div.innerHTML = name;
            optionWrapper.appendChild(div);
        }
        optionWrapper.onclick = async (e) => {
            e.stopPropagation();
            let currentTarget = e.currentTarget;
            let target = e.target;
            if (target === currentTarget) return;
            let { id, dirName } = target.dataset;
            if (
                currentTarget.classList.contains("dirs") ||
                currentTarget.classList.contains("childDirs")
            ) {
                chrome.runtime.sendMessage({
                    context: "childDirs",
                    data: { parents: id },
                });
            }
            recentSelected.dataset.id = id;
            recentSelected.dataset.dirName = dirName;
            recentSelected.innerHTML = dirName;
            dirInput.value = "";
            dirInput.focus();
            if (currentTarget.classList.contains("recentDirs")) {
                const recentDirs = document.querySelector(".recentDirs");
                recentDirs.style.display = "none";
            }
        };
        return optionWrapper;
    }

    const addIconPath = chrome.runtime.getURL("images/addIcon.svg");
    const sendIconPath = chrome.runtime.getURL("images/sendIcon.svg");
    const cancelIconPath = chrome.runtime.getURL("images/cancelIcon.svg");
    const doneIconPath = chrome.runtime.getURL("images/doneIcon.svg");
    const menuIconPath = chrome.runtime.getURL("images/menuIcon.svg");
    const errorIconPath = chrome.runtime.getURL("images/errorIcon.svg");
    const successIconPath = chrome.runtime.getURL("images/successIcon.svg");
    const statusIconPath = chrome.runtime.getURL("images/statusIcon.svg");
    let { root, dirs } = await chrome.storage.local.get(["root", "dirs"]);
    console.log(root, dirs);
    dirs = dirs || [];
    let tempDirs = dirs;

    const krabWrapper = createElement("div", [["id", "krabWrapper"]]);
    krabWrapper.style.display = "none";
    const krabStatusWrapper = createElement("div", [
        ["id", "krabStatusWrapper"],
    ]);
    krabStatusWrapper.style.display = "none";

    const krabMain = createElement("div", [["class", "krabMain"]]);
    const statusText = createElement("div", [["class", "krabStatusText"]]);
    statusText.textContent = "Uploading...";

    const menuIcon = createElement("img", [
        ["class", "menuImg"],
        ["src", menuIconPath],
        ["alt", "menuImg"],
    ]);
    const addIcon = createElement("img", [
        ["class", "addImg"],
        ["src", addIconPath],
        ["alt", "addImg"],
    ]);
    const sendIcon = createElement("img", [
        ["class", "sendImg"],
        ["src", sendIconPath],
        ["alt", "sendImg"],
    ]);
    const doneIcon = createElement("img", [
        ["class", "doneImg"],
        ["src", doneIconPath],
        ["alt", "doneImg"],
    ]);
    const cancelIcon = createElement("img", [
        ["class", "cancelImg"],
        ["src", cancelIconPath],
        ["alt", "cancelImg"],
    ]);
    const successIcon = createElement("img", [
        ["class", "statusImg"],
        ["src", successIconPath],
        ["alt", "successImg"],
    ]);
    const errorIcon = createElement("img", [
        ["class", "statusImg"],
        ["src", errorIconPath],
        ["alt", "errorImg"],
    ]);
    const statusIcon = createElement("img", [
        ["class", "statusImg statusScroll"],
        ["src", statusIconPath],
        ["alt", "statusImg"],
    ]);
    const menuButton = createElement("button", [["class", "menuButton"]]);
    const addButton = createElement("button", [["class", "addButton"]]);
    const sendButton = createElement("button", [["class", "sendButton"]]);
    const cancelButton = createElement("button", [["class", "cancelButton"]]);
    const doneButton = createElement("button", [["class", "doneButton"]]);
    menuButton.appendChild(menuIcon);
    addButton.appendChild(addIcon);
    sendButton.appendChild(sendIcon);
    doneButton.appendChild(doneIcon);
    cancelButton.appendChild(cancelIcon);

    let recentWrapper = createElement("div", [["class", "recentWrapper"]]);
    let recentSelected = createElement("div", [
        ["class", "recentSelect"],
        ["data-id", root],
        ["data-dir-name", "root"],
    ]);
    recentSelected.innerHTML = "root";
    recentWrapper.appendChild(recentSelected);
    recentWrapper.appendChild(doneButton);

    let dirWrapper = createElement("div", [["class", "dirWrapper"]]);
    let dirInput = createElement("input", [
        ["class", "dirInput"],
        ["placeholder", "Search Directory"],
    ]);
    let availableDirs = createOptionsElement(dirs, "dirs");
    let availableChildDirs = createOptionsElement([], "childDirs");
    dirWrapper.appendChild(dirInput);
    dirWrapper.appendChild(addButton);
    dirWrapper.appendChild(sendButton);
    dirWrapper.appendChild(availableDirs);
    dirWrapper.appendChild(availableChildDirs);

    krabMain.appendChild(menuButton);
    krabMain.appendChild(recentWrapper);
    krabMain.appendChild(dirWrapper);

    krabWrapper.appendChild(cancelButton);
    krabWrapper.appendChild(krabMain);

    krabStatusWrapper.appendChild(statusText);
    krabStatusWrapper.appendChild(successIcon);
    krabStatusWrapper.appendChild(errorIcon);
    krabStatusWrapper.appendChild(statusIcon);

    document.body.appendChild(krabWrapper);
    document.body.appendChild(krabStatusWrapper);

    menuButton.onclick = (e) => {
        e.stopPropagation();
        let recentDirs = document.querySelector(".optionWrapper.recentDirs");
        recentDirs.style.display = "none";
        dirWrapper.style.display =
            dirWrapper.style.display === "block" ? "none" : "block";
        availableDirs.style.display = "block";
        let availableChildDirs = document.querySelector(
            ".optionWrapper.childDirs"
        );
        if (sendButton.style.display !== "none") {
            dirInput.placeholder = "Search Directory";
            sendButton.style.display = "none";
            addButton.style.display = "initial";
        }
        tempDirs = dirs;
        dirInput.value = "";
        dirInput.focus();
        availableChildDirs.style.display = "none";
    };
    const dirCreateHandler = async () => {
        if (dirInput.value === "") {
            dirInput.placeholder = "Cannot be empty";
            dirInput.style.backgroundColor = "#f005";
            setTimeout(() => {
                dirInput.placeholder = "Enter Dir to Create";
                dirInput.style.backgroundColor = "#aaa";
            }, 1000);
            return;
        }
        sendButton.style.display = "none";
        addButton.style.display = "initial";
        dirInput.placeholder = "Search Directory";
        dirInput.style.backgroundColor = "#ddd";
        dirInput.focus();
        await chrome.runtime.sendMessage({
            context: "createDir",
            data: { name: dirInput.value, parents: recentSelected.dataset.id },
        });
        dirInput.value = "";
        dirInput.removeEventListener("keyup", enterButtonHandler);
    };
    const enterButtonHandler = (e) => {
        if (e.key === "Enter") {
            dirCreateHandler();
        }
    };
    addButton.onclick = async (e) => {
        e.stopPropagation();
        addButton.style.display = "none";
        sendButton.style.display = "initial";
        dirInput.placeholder = "Enter Dir to Create";
        dirInput.style.backgroundColor = "#aaa";
        dirInput.focus();
        dirInput.addEventListener("keyup", enterButtonHandler);
    };
    sendButton.onclick = async (e) => {
        e.stopPropagation();
        dirCreateHandler();
    };
    doneButton.onclick = async (e) => {
        e.stopPropagation();
        let { id, dirName } = document.querySelector(".recentSelect").dataset;
        await chrome.runtime.sendMessage({
            context: "save",
            data: { id, dirName },
        });
        let recentDirs = document.querySelector(".optionWrapper.recentDirs");
        krabWrapper.style.display = "none";
        dirWrapper.style.display = "none";
        recentDirs.style.display = "none";
        krabMain.style.display = "none";
        krabStatusWrapper.style.display = "block";
    };
    cancelButton.onclick = (e) => {
        e.stopPropagation();
        krabWrapper.style.display = "none";
        let recentDirs = document.querySelector(".recentDirs");
        dirWrapper.style.display = "none";
        recentDirs.style.display = "none";
        recentSelected.dataset.id = root;
        recentSelected.dataset.dirName = "root";
        recentSelected.innerHTML = "root";
    };

    krabWrapper.onclick = (e) => {
        e.stopPropagation();
        let recentDirs = document.querySelector(".optionWrapper.recentDirs");
        let availableChildDirs = document.querySelector(
            ".optionWrapper.childDirs"
        );
        dirWrapper.style.display = "none";
        recentDirs.style.display = "none";
        availableChildDirs.style.display = "none";
    };

    recentSelected.onclick = (e) => {
        e.stopPropagation();
        let recentDirs = document.querySelector(".optionWrapper.recentDirs");
        dirWrapper.style.display = "none";
        recentDirs.style.display =
            recentDirs.style.display === "block" ? "none" : "block";
    };
    dirInput.onclick = (e) => {
        e.stopPropagation();
    };
    dirInput.oninput = (e) => {
        let val = e.target.value.toLowerCase().trimLeft();
        if (val === "") e.target.value = "";
        let filtered = tempDirs.filter((element) =>
            element.name.toLowerCase().includes(val)
        );
        let childDirs = document.querySelector(".childDirs");
        dirWrapper.removeChild(childDirs);
        childDirs = createOptionsElement(filtered, "childDirs");
        availableDirs.style.display = "none";
        dirWrapper.appendChild(childDirs);
    };

    window.onclick = () => {
        if (krabWrapper.style.display !== "none") {
            let recentDirs = document.querySelector(
                ".optionWrapper.recentDirs"
            );
            let availableChildDirs = document.querySelector(
                ".optionWrapper.childDirs"
            );
            krabWrapper.style.display = "none";
            dirWrapper.style.display = "none";
            recentDirs.style.display = "none";
            availableChildDirs.style.display = "none";
            if (sendButton.style.display !== "none") {
                dirInput.placeholder = "Search Directory";
                sendButton.style.display = "none";
                addButton.style.display = "initial";
            }
        }
    };

    function toggleKrab(recents) {
        if (recents) {
            if (recents.length > 0) {
                recentSelected.setAttribute("data-id", recents[0].id);
                recentSelected.setAttribute("data-dir-name", recents[0].name);
                recentSelected.innerHTML = recents[0].name;
            }
            let recentDirs =
                document.querySelector(".recentDirs") ||
                createOptionsElement(recents, "recentDirs");
            let previousRecentDirs = document.querySelector(".recentDirs");
            previousRecentDirs && recentWrapper.removeChild(previousRecentDirs);
            recentWrapper.appendChild(recentDirs);
            krabWrapper.style.display = "initial";
            return;
        }
        let recentDirs = createOptionsElement([], "recentDirs");
        recentWrapper.appendChild(recentDirs);
        krabWrapper.style.display = "initial";
    }

    chrome.runtime.onMessage.addListener(
        async (message, sender, sendResponse) => {
            if (message.context === "recents") {
                let recents = message.data;
                toggleKrab(recents);
            }
            if (message.context === "childDirs") {
                tempDirs = message.childDirs ? message.childDirs : [];
                let childDirs = document.querySelector(".childDirs");
                dirWrapper.removeChild(childDirs);
                childDirs = createOptionsElement(tempDirs, "childDirs");
                availableDirs.style.display = "none";
                dirWrapper.appendChild(childDirs);
            }
            if (message.context === "createDir") {
                console.log(message.status);
                if (message.status !== 200) {
                }
            }
            if (message.context === "save") {
                console.log(message.context);
                statusIcon.style.display = "none";
                if (message.status === 200) {
                    statusText.textContent = "success";
                    successIcon.style.display = "initial";
                } else {
                    statusText.textContent = "failed";
                    errorIcon.style.display = "initial";
                }
                setTimeout(() => {
                    krabStatusWrapper.style.display = "none";
                    statusText.textContent = "Uploading...";
                    statusIcon.style.display = "initial";
                    successIcon.style.display = "none";
                    errorIcon.style.display = "none";
                    krabMain.style.display = "flex";
                }, 2000);
            }
        }
    );
    let styles = chrome.runtime.getURL("scripts/content.css");
    let styleElement = createElement("link", [
        ["rel", "stylesheet"],
        ["href", styles],
    ]);
    let siteHead = document.querySelector("head");
    siteHead.appendChild(styleElement);
})();
