(async () => {
    try {
        /**************** Util Functions *****************/
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
            const optionWrapper = document.createDocumentFragment();
            // let optionWrapper = createElement("div", [
            //     ["class", `optionWrapper ${className}`],
            // ]);
            for (let { id, name } of dirs) {
                let div = createElement("div", [
                    ["class", `option`],
                    ["data-id", id],
                    ["data-dir-name", name],
                ]);
                div.innerHTML = name;
                optionWrapper.append(div);
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
                selected.dataset.id = id;
                selected.dataset.dirName = dirName;
                selected.innerHTML = dirName;
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

        const krab = createElement("div", [["id", "krab-ext"]]);
        const main = createElement("main", [["class", "krab-main"]]);
        const connection = createElement("div", [["class", "krab-connection"]]);

        main.style.display = "none";
        connection.style.display = "none";
        /**************** Connection declarations *****************/
        const login = createElement("button", ["class", "login"]);
        const logout = createElement("button", ["class", "logout"]);
        login.innerText = "Sign in using Google";
        logout.innerText = "Logout";
        login.style.display = "none";
        logout.style.display = "none";
        connection.append(login, logout);
        /**************** Element declarations *****************/

        const menuIcon = createElement("img", [
            ["class", "menuImg"],
            ["src", menuIconPath],
        ]);
        const addIcon = createElement("img", [
            ["class", "addImg"],
            ["src", addIconPath],
        ]);
        const sendIcon = createElement("img", [
            ["class", "sendImg"],
            ["src", sendIconPath],
        ]);
        const doneIcon = createElement("img", [
            ["class", "doneImg"],
            ["src", doneIconPath],
        ]);
        const cancelIcon = createElement("img", [
            ["class", "cancelImg"],
            ["src", cancelIconPath],
        ]);
        const successIcon = createElement("img", [
            ["class", "statusImg"],
            ["src", successIconPath],
        ]);
        const errorIcon = createElement("img", [
            ["class", "statusImg"],
            ["src", errorIconPath],
        ]);
        const imgStatusIcon = createElement("img", [
            ["class", "statusImg statusScroll"],
            ["src", imgStatusIconPath],
        ]);
        const dirStatusIcon = createElement("img", [
            ["class", "statusImg dirStatusScroll"],
            ["src", imgStatusIconPath],
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

        menuButton.append(menuIcon);
        addButton.append(addIcon);
        sendButton.append(sendIcon);
        doneButton.append(doneIcon);
        cancelButton.append(cancelIcon);

        let recents = createElement("div", [["class", "recents"]]);
        let selected = createElement("div", [
            ["class", "recentSelect"],
            ["data-id", root],
            ["data-dir-name", "root"],
        ]);
        selected.innerHTML = "root";
        recents.append(selected, doneButton);

        let dirWrapper = createElement("div", [["class", "dirWrapper"]]);
        let dirInput = createElement("input", [
            ["class", "dirInput"],
            ["placeholder", "Search Directory"],
        ]);
        let dirsList = createOptionsElement(dirs, "dirs");
        let childDirsList = createOptionsElement([], "childDirs");
        dirWrapper.append(
            dirInput,
            addButton,
            sendButton,
            dirStatusIcon,
            dirsList,
            childDirsList
        );

        main.append(menuButton, rootButton, recents, dirWrapper, cancelButton);

        krab.append(main, connection);
        document.body.append(krab);

        /**************** Helper Functions *****************/
        /**
         * @returns {HTMLElement}
         */
        function createStatusElement() {
            const status = createElement("div", [["id", "krab-status"]]);
            status.append(
                "Uploading...",
                successIcon,
                errorIcon,
                imgStatusIcon
            );
            return status;
        }

        /**************** Event Listners *****************/
        menuButton.onclick = (e) => {
            e.stopPropagation();
            let recentDirs = document.querySelector(
                ".optionWrapper.recentDirs"
            );
            recentDirs.style.display = "none";
            dirWrapper.style.display =
                dirWrapper.style.display === "block" ? "none" : "block";
            dirsList.style.display = "block";
            let childDirsList = document.querySelector(
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
            childDirsList.style.display = "none";
        };
        rootButton.onclick = async (e) => {
            let { root } = await chrome.storage.local.get("root");
            selected.dataset.id = root;
            selected.dataset.dirName = "root";
            selected.innerHTML = "root";
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
            main.style.display = "none";
            dirWrapper.style.display = "none";
            recentDirs.style.display = "none";
            krabMain.style.display = "none";
            status.style.display = "block";
        };
        cancelButton.onclick = (e) => {
            e.stopPropagation();
            main.style.display = "none";
            let recentDirs = document.querySelector(".recentDirs");
            dirWrapper.style.display = "none";
            recentDirs.style.display = "none";
            selected.dataset.id = root;
            selected.dataset.dirName = "root";
            selected.innerHTML = "root";
        };

        main.onclick = (e) => {
            e.stopPropagation();
            let recentDirs = document.querySelector(
                ".optionWrapper.recentDirs"
            );
            let childDirsList = document.querySelector(
                ".optionWrapper.childDirs"
            );
            dirWrapper.style.display = "none";
            recentDirs.style.display = "none";
            childDirsList.style.display = "none";
        };

        selected.onclick = (e) => {
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
                dirWrapper.append(childDirs);
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
            dirsList.style.display = "none";
            dirWrapper.append(childDirs);
        };
        login.onclick = async (e) => {
            e.stopPropagation();
            chrome.runtime.sendMessage({ context: "loginSubmit" });
        };
        logout.onclick = async (e) => {
            e.stopPropagation();
            chrome.runtime.sendMessage({ context: "logoutSubmit" });
        };
        window.onclick = () => {
            if (main.style.display !== "none") {
                let recentDirs = document.querySelector(
                    ".optionWrapper.recentDirs"
                );
                let childDirsList = document.querySelector(
                    ".optionWrapper.childDirs"
                );
                main.style.display = "none";
                dirWrapper.style.display = "none";
                recentDirs.style.display = "none";
                childDirsList.style.display = "none";
                if (sendButton.style.display !== "none") {
                    dirInput.placeholder = "Search Directory";
                    sendButton.style.display = "none";
                    addButton.style.display = "initial";
                }
            }
        };

        /**************** Popup toggler *****************/
        function toggleLogin(loginStatus) {
            if (loginStatus !== 1) {
                login.style.display = "initial";
                logout.style.display = "none";
            } else {
                login.style.display = "none";
                logout.style.display = "initial";
            }
            connection.style.display = "initial";
        }
        function toggleMain(recents) {
            if (recents) {
                if (recents.length > 0) {
                    selected.setAttribute("data-id", recents[0].id);
                    selected.setAttribute("data-dir-name", recents[0].name);
                    selected.innerHTML = recents[0].name;
                }
                let recentDirs = createOptionsElement(recents, "recentDirs");
                let previousRecentDirs = document.querySelector(".recentDirs");
                previousRecentDirs && recents.removeChild(previousRecentDirs);
                // recents.append(recentDirs);
                main.style.display = "initial";
                return;
            }
            let recentDirs = createOptionsElement([], "recentDirs");
            // recents.append(recentDirs);
            main.style.display = "initial";
        }

        /**************** Inserting scripts *****************/
        const styles = chrome.runtime.getURL("scripts/content.css");
        const styleElement = createElement("link", [
            ["rel", "stylesheet"],
            ["href", styles],
        ]);
        const siteHead = document.querySelector("head");
        siteHead.append(styleElement);

        /**************** Chrome message handling *****************/
        chrome.runtime.onMessage.addListener(
            async (message, sender, sendResponse) => {
                try {
                    switch (message.context) {
                        case "action":
                            const { loginStatus } = message;
                            toggleLogin(loginStatus);
                            break;
                        case "loginStatus":
                            const { status } = message;
                            if (status === 0 || status === 1)
                                toggleLogin(status);
                            else console.log("login failed");
                            break;
                        case "recents":
                            let recents = message.data;
                            toggleMain(recents);
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
                            dirsList.style.display = "none";
                            dirWrapper.append(childDirs);
                            break;
                        case "dirs":
                            const dirs = message.data || [];
                            tempDirs = dirs;
                            dirWrapper.removeChild(dirsList);
                            dirsList = createOptionsElement(dirs, "dirs");
                            dirsList.style.display = "none";
                            dirWrapper.append(dirsList);
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
                                status.style.display = "none";
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
