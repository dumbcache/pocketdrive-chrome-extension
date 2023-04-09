(async () => {
    try {
        /**************** Helper functions *****************/
        /**
         * @returns {HTMLElement}
         */
        function createElement(type, attributes = []) {
            let element = document.createElement(type);
            for (let [key, val] of attributes) {
                element.setAttribute(key, val);
            }
            element.classList.add(type);
            element.classList.add("krab");
            return element;
        }

        /**
         * @returns {HTMLDivElement}
         */
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
                tempParent = id;
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

        /**************** Resource Urls *****************/
        const addIconPath = chrome.runtime.getURL("images/addIcon.svg");
        const sendIconPath = chrome.runtime.getURL("images/sendIcon.svg");
        const cancelIconPath = chrome.runtime.getURL("images/cancelIcon.svg");
        const doneIconPath = chrome.runtime.getURL("images/doneIcon.svg");
        const menuIconPath = chrome.runtime.getURL("images/menuIcon.svg");
        const errorIconPath = chrome.runtime.getURL("images/errorIcon.svg");
        const successIconPath = chrome.runtime.getURL("images/successIcon.svg");
        const imgStatusIconPath = chrome.runtime.getURL(
            "images/statusIcon.svg"
        );
        let { root, dirs } = await chrome.storage.local.get(["root", "dirs"]);

        dirs = dirs || [];
        let tempDirs = dirs;
        let tempParent = root;
        console.log(tempParent);

        /**************** Element declarations *****************/
        const krabWrapper = createElement("div", [["id", "krabWrapper"]]);
        const krabLoginWrapper = createElement("div", [
            ["id", "krabLoginWrapper"],
        ]);
        const krabStatusWrapper = createElement("div", [
            ["id", "krabStatusWrapper"],
        ]);
        krabLoginWrapper.style.display = "none";
        krabWrapper.style.display = "none";
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
        const imgStatusIcon = createElement("img", [
            ["class", "statusImg statusScroll"],
            ["src", imgStatusIconPath],
            ["alt", "statusImg"],
        ]);
        const dirStatusIcon = createElement("img", [
            ["class", "statusImg dirStatusScroll"],
            ["src", imgStatusIconPath],
            ["alt", "statusImg"],
        ]);
        const menuButton = createElement("button", [["class", "menuButton"]]);
        const addButton = createElement("button", [["class", "addButton"]]);
        const sendButton = createElement("button", [["class", "sendButton"]]);
        const cancelButton = createElement("button", [
            ["class", "cancelButton"],
        ]);
        const doneButton = createElement("button", [["class", "doneButton"]]);
        const rootButton = createElement("button", [["class", "rootButton"]]);
        rootButton.innerText = "/r";

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
        dirWrapper.appendChild(dirStatusIcon);
        dirWrapper.appendChild(availableDirs);
        dirWrapper.appendChild(availableChildDirs);

        krabMain.appendChild(menuButton);
        krabMain.appendChild(rootButton);
        krabMain.appendChild(recentWrapper);
        krabMain.appendChild(dirWrapper);

        krabWrapper.appendChild(cancelButton);
        krabWrapper.appendChild(krabMain);

        krabStatusWrapper.appendChild(statusText);
        krabStatusWrapper.appendChild(successIcon);
        krabStatusWrapper.appendChild(errorIcon);
        krabStatusWrapper.appendChild(imgStatusIcon);

        document.body.appendChild(krabWrapper);
        document.body.appendChild(krabStatusWrapper);

        /**************** Event Listners *****************/
        menuButton.onclick = (e) => {
            e.stopPropagation();
            let recentDirs = document.querySelector(
                ".optionWrapper.recentDirs"
            );
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
            tempParent = root;
            dirInput.value = "";
            dirInput.focus();
            availableChildDirs.style.display = "none";
        };
        rootButton.onclick = async (e) => {
            let { root } = await chrome.storage.local.get("root");
            recentSelected.dataset.id = root;
            recentSelected.dataset.dirName = "root";
            recentSelected.innerHTML = "root";
        };

        doneButton.onclick = async (e) => {
            e.stopPropagation();
            let { id, dirName } =
                document.querySelector(".recentSelect").dataset;
            await chrome.runtime.sendMessage({
                context: "save",
                data: { id, dirName },
            });
            let recentDirs = document.querySelector(
                ".optionWrapper.recentDirs"
            );
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
            let recentDirs = document.querySelector(
                ".optionWrapper.recentDirs"
            );
            let availableChildDirs = document.querySelector(
                ".optionWrapper.childDirs"
            );
            dirWrapper.style.display = "none";
            recentDirs.style.display = "none";
            availableChildDirs.style.display = "none";
        };

        recentSelected.onclick = (e) => {
            e.stopPropagation();
            let recentDirs = document.querySelector(
                ".optionWrapper.recentDirs"
            );
            dirWrapper.style.display = "none";
            recentDirs.style.display =
                recentDirs.style.display === "block" ? "none" : "block";
        };
        const inputInvalidate = (text) => {
            dirInput.placeholder = text;
            dirInput.style.backgroundColor = "#f005";
            dirInput.value = "";
            setTimeout(() => {
                dirInput.placeholder = "Enter Dir to Create";
                dirInput.style.backgroundColor = "#ddd";
            }, 1000);
        };
        const checkDirPresent = () => {
            let name = dirInput.value;
            for (let dir of tempDirs) {
                if (dir.name === name) return true;
            }
            return false;
        };
        const dirCreateHandler = async () => {
            if (dirInput.value === "") {
                inputInvalidate("Cannot be empty");
                return;
            }
            if (checkDirPresent()) {
                addButton.style.display = "initial";
                inputInvalidate("Already Present");
                return;
            }
            sendButton.style.display = "none";
            dirStatusIcon.style.display = "initial";

            await chrome.runtime.sendMessage({
                context: "createDir",
                data: {
                    name: dirInput.value.trim(),
                    parents: tempParent,
                },
            });
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
            dirInput.focus();
            dirInput.addEventListener("keyup", enterButtonHandler);
        };
        sendButton.onclick = async (e) => {
            e.stopPropagation();
            dirCreateHandler();
        };
        dirInput.onkeyup = (e) => {
            if (e.ctrlKey && e.key === "Enter") {
                addButton.style.display = "none";
                dirCreateHandler();
                let childDirs = document.querySelector(".childDirs");
                dirWrapper.removeChild(childDirs);
                childDirs = createOptionsElement(tempDirs, "childDirs");
                dirWrapper.appendChild(childDirs);
            }
        };
        dirInput.onclick = (e) => {
            e.stopPropagation();
        };
        dirInput.oninput = (e) => {
            let val = e.target.value.toLowerCase().trimLeft();
            let filtered = [];
            if (val === "") {
                e.target.value = "";
                filtered = tempDirs;
                console.log("filtered");
            } else {
                filtered = tempDirs.filter((element) =>
                    element.name.toLowerCase().includes(val)
                );
            }
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

        /**************** Popup toggler *****************/
        function toggleKrab(recents) {
            if (recents) {
                if (recents.length > 0) {
                    recentSelected.setAttribute("data-id", recents[0].id);
                    recentSelected.setAttribute(
                        "data-dir-name",
                        recents[0].name
                    );
                    recentSelected.innerHTML = recents[0].name;
                }
                let recentDirs = createOptionsElement(recents, "recentDirs");
                let previousRecentDirs = document.querySelector(".recentDirs");
                previousRecentDirs &&
                    recentWrapper.removeChild(previousRecentDirs);
                recentWrapper.appendChild(recentDirs);
                krabWrapper.style.display = "initial";
                return;
            }
            let recentDirs = createOptionsElement([], "recentDirs");
            recentWrapper.appendChild(recentDirs);
            krabWrapper.style.display = "initial";
        }

        /**************** Inserting stylesheet *****************/
        let styles = chrome.runtime.getURL("scripts/content.css");
        let styleElement = createElement("link", [
            ["rel", "stylesheet"],
            ["href", styles],
        ]);
        let siteHead = document.querySelector("head");
        siteHead.appendChild(styleElement);

        /**************** Chrome message handling *****************/
        chrome.runtime.onMessage.addListener(
            async (message, sender, sendResponse) => {
                try {
                    switch (message.context) {
                        case "recents":
                            let recents = message.data;
                            toggleKrab(recents);
                            break;
                        case "childDirs":
                            tempDirs = message.childDirs || [];
                            let childDirs =
                                document.querySelector(".childDirs");
                            dirWrapper.removeChild(childDirs);
                            childDirs = createOptionsElement(
                                tempDirs,
                                "childDirs"
                            );
                            availableDirs.style.display = "none";
                            dirWrapper.appendChild(childDirs);
                            break;
                        case "dirs":
                            const dirs = message.data || [];
                            tempDirs = dirs;
                            dirWrapper.removeChild(availableDirs);
                            availableDirs = createOptionsElement(dirs, "dirs");
                            availableDirs.style.display = "none";
                            dirWrapper.appendChild(availableDirs);
                            break;
                        case "createDir":
                            if (message.status !== 200) {
                                dirInput.style.backgroundColor = "#f005";
                                dirInput.placeholder = "failed";
                                setTimeout(() => {
                                    dirInput.style.backgroundColor = "#ddd";
                                    dirInput.placeholder = "Search Directory";
                                }, 1000);
                            }
                            let { id, name } = message.data;
                            let div = createElement("div", [
                                ["class", `option`],
                                ["data-id", id],
                                ["data-dir-name", name],
                            ]);
                            div.innerHTML = name;
                            div.style.backgroundColor = "#0f05";
                            document.querySelector(".childDirs").prepend(div);
                            tempDirs.unshift(message.data);
                            setTimeout(() => {
                                div.style.backgroundColor = "initial";
                            }, 500);
                            dirStatusIcon.style.display = "none";
                            addButton.style.display = "initial";
                            dirInput.focus();
                            dirInput.value = "";
                            break;
                        case "save":
                            imgStatusIcon.style.display = "none";
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
                                imgStatusIcon.style.display = "initial";
                                successIcon.style.display = "none";
                                errorIcon.style.display = "none";
                                krabMain.style.display = "flex";
                            }, 2000);
                            break;
                        case "loginStatus":
                            break;
                    }
                } catch (error) {
                    console.warn("krabs:", error);
                }
            }
        );
    } catch (error) {
        console.warn("krabs:", error);
    }
})();
