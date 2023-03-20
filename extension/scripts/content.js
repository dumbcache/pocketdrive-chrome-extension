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
                    context: "getChilds",
                    data: { parents: id },
                });
            }
            const recentSelect = document.querySelector(".recentSelect");
            recentSelect.dataset.id = id;
            recentSelect.dataset.dirName = dirName;
            recentSelect.innerHTML = dirName;
            if (currentTarget.classList.contains("recentDirs")) {
                const recentDirs = document.querySelector(".recentDirs");
                recentDirs.style.display = "none";
            }
        };
        return optionWrapper;
    }

    const cancelIconPath = chrome.runtime.getURL("images/cancelIcon.svg");
    const doneIconPath = chrome.runtime.getURL("images/doneIcon.svg");
    const menuIconPath = chrome.runtime.getURL("images/menuIcon.svg");
    const errorIconPath = chrome.runtime.getURL("images/errorIcon.svg");
    const successIconPath = chrome.runtime.getURL("images/successIcon.svg");
    const statusIconPath = chrome.runtime.getURL("images/statusIcon.svg");
    const { root, dirs } = await chrome.storage.local.get(["root", "dirs"]);

    const krabWrapper = createElement("div", [["id", "krabWrapper"]]);
    krabWrapper.style.display = "none";
    const krabStatusWrapper = createElement("div", [
        ["id", "krabStatusWrapper"],
    ]);
    krabStatusWrapper.style.display = "none";

    const krabMain = createElement("div", [["class", "krabMain"]]);
    const statusText = createElement("div", [["class", "krabStatusText"]]);
    statusText.innerText = "Uploading...";

    const menuIcon = createElement("img", [
        ["class", "menuImg"],
        ["src", menuIconPath],
        ["alt", "menuImg"],
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
    const cancelButton = createElement("button", [["class", "cancelButton"]]);
    const doneButton = createElement("button", [["class", "doneButton"]]);
    menuButton.appendChild(menuIcon);
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
        availableChildDirs.style.display = "none";
    };
    doneButton.onclick = async (e) => {
        e.stopPropagation();
        let { id, dirName } = document.querySelector(".recentSelect").dataset;
        await chrome.runtime.sendMessage({
            context: "submit",
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
    dirInput.onclick = (e) => {
        e.stopPropagation();
    };

    recentSelected.onclick = (e) => {
        e.stopPropagation();
        let recentDirs = document.querySelector(".optionWrapper.recentDirs");
        dirWrapper.style.display = "none";
        recentDirs.style.display =
            recentDirs.style.display === "block" ? "none" : "block";
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
        }
    };

    function toggleKrab(recents) {
        if (krabWrapper.style.display === "none") {
            if (recents.length > 0) {
                recentSelected.setAttribute("data-id", recents[0].id);
                recentSelected.setAttribute("data-dir-name", recents[0].name);
                recentSelected.innerHTML = recents[0].name;
            }
            let recentDirs = createOptionsElement(recents, "recentDirs");
            let previousRecentDirs = document.querySelector(".recentDirs");
            previousRecentDirs && recentWrapper.removeChild(previousRecentDirs);
            recentWrapper.appendChild(recentDirs);

            krabWrapper.style.display = "initial";
        }
    }

    chrome.runtime.onMessage.addListener(
        async (message, sender, sendResponse) => {
            if (message.context === "recents") {
                let { recents } = message.data;
                toggleKrab(recents);
            }

            if (message.context === "childDirs") {
                let childDirs = document.querySelector(".childDirs");
                dirWrapper.removeChild(childDirs);
                childDirs = createOptionsElement(
                    message.childDirs,
                    "childDirs"
                );
                availableDirs.style.display = "none";
                dirWrapper.appendChild(childDirs);
            }
            if (message.context === "uploadStatus") {
                statusIcon.style.display = "none";
                if (message.status === 200) {
                    statusText.innerText = "success";
                    successIcon.style.display = "initial";
                } else {
                    statusText.innerText = "failed";
                    errorIcon.style.display = "initial";
                }
                setTimeout(() => {
                    krabStatusWrapper.style.display = "none";
                    statusText.innerText = "Uploading...";
                    statusIcon.style.display = "initial";
                    successIcon.style.display = "none";
                    errorIcon.style.display = "none";
                    krabMain.style.display = "flex";
                }, 2000);
            }
        }
    );
    let styles = chrome.runtime.getURL("scripts/content.css");
    console.log(styles);
    let styleElement = createElement("link", [
        ["rel", "stylesheet"],
        ["href", styles],
    ]);
    let siteHead = document.querySelector("head");
    siteHead.appendChild(styleElement);
})();
