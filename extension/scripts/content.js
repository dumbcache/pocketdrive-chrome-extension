(async () => {
    try {
        /**************** Inserting scripts *****************/
        const krab = createElement("div", [["id", "krab-ext"]]);
        const shadow = krab.attachShadow({ mode: "open" });

        const styles = chrome.runtime.getURL("scripts/content.css");
        const styleElement = createElement("link", [
            ["rel", "stylesheet"],
            ["href", styles],
        ]);
        shadow.append(styleElement);
        /**************** Util Functions *****************/
        /**
         * @returns {HTMLElement}
         */
        function createElement(type, attributes = [], ...childNodes) {
            const element = document.createElement(type);
            for (let [key, val] of attributes) {
                element.setAttribute(key, val);
            }
            childNodes.length !== 0 && element.append(...childNodes);
            return element;
        }
        /**
         *
         * @param {string} className
         * @param {HTMLImageElement | string} childNode
         * @returns {HTMLButtonElement}
         */
        function createButtonElement(childNode, ...classNames) {
            const button = document.createElement("button");
            button.classList.add(...classNames);
            childNode && button.append(childNode);
            return button;
        }
        /**
         * @param {string}
         * @param {string}
         * @returns {HTMLImageElement}
         */
        function createImgElement(src, ...classNames) {
            const img = document.createElement("img");
            img.src = src;
            img.classList.add(...classNames);
            return img;
        }

        /**
         * @returns {HTMLDivElement}
         */
        function createOptionsElement(dirs) {
            const options = document.createDocumentFragment();
            for (let { id, name } of dirs) {
                const option = createElement("div", [
                    ["class", `option`],
                    ["data-id", id],
                    ["data-dir-name", name],
                ]);
                option.innerText = name;
                options.append(option);
            }
            options.onclick = async (e) => {
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
                selected.innerText = dirName;
                search.value = "";
                search.focus();
                if (currentTarget.classList.contains("recentDirs")) {
                    const recentDirs = document.querySelector(".recentDirs");
                    recentDirs.style.display = "none";
                }
            };
            return options;
        }

        /**************** Resource Urls *****************/
        const addIconPath = chrome.runtime.getURL("images/addIcon.svg");
        const sendIconPath = chrome.runtime.getURL("images/sendIcon.svg");
        const cancelIconPath = chrome.runtime.getURL("images/cancelIcon.svg");
        const doneIconPath = chrome.runtime.getURL("images/doneIcon.svg");
        const listIconPath = chrome.runtime.getURL("images/listIcon.svg");
        const errorIconPath = chrome.runtime.getURL("images/errorIcon.svg");
        const okIconPath = chrome.runtime.getURL("images/okIcon.svg");
        const statusIconPath = chrome.runtime.getURL("images/statusIcon.svg");

        let { root = "", dirs = [] } = await chrome.storage.local.get([
            "root",
            "dirs",
        ]);
        let tempDirs = dirs;
        let tempParent = root;

        const main = createElement("main", [["class", "main"]]);
        const connection = createElement("div", [["class", "connection"]]);

        main.style.display = "none";
        connection.style.display = "none";
        /**************** Connection declarations *****************/
        const login = createElement("button", [["class", "login"]]);
        const logout = createElement("button", [["class", "logout"]]);
        login.innerText = "Sign in using Google";
        logout.innerText = "Logout";
        login.style.display = "none";
        logout.style.display = "none";
        connection.append(login, logout);
        /**************** Element declarations *****************/

        const listIcon = createImgElement(listIconPath, "menu-img");
        const addIcon = createImgElement(addIconPath, "add-img");
        const sendIcon = createImgElement(sendIconPath, "send-img");
        const doneIcon = createImgElement(doneIconPath, "done-img");
        const cancelIcon = createImgElement(cancelIconPath, "cancel-img");
        const dirStatusIcon = createImgElement(
            statusIconPath,
            "status-img",
            "dir-progress"
        );

        const listButton = createButtonElement(listIcon, "list-button");
        const addButton = createButtonElement(addIcon, "add-button");
        const sendButton = createButtonElement(sendIcon, "send-button");
        const doneButton = createButtonElement(doneIcon, "done-button");
        const cancelButton = createButtonElement(cancelIcon, "cancel-button");
        const rootButton = createButtonElement("/r", "root-button");

        const selection = createElement("div", [["class", "selection"]]);
        const selected = createElement(
            "div",
            [
                ["class", "selected"],
                ["data-id", root],
                ["data-dir-name", "root"],
            ],
            "root"
        );
        const recents = createElement(
            "div",
            [["class", "recents"]],
            createOptionsElement([])
        );
        selection.append(selected, doneButton, recents);

        const list = createElement("div", [["class", "list"]]);
        /**
         * @type {HTMLInputElement}
         */
        let search = createElement("input", [
            ["class", "search"],
            ["placeholder", "Search Directory"],
        ]);
        const parents = createElement(
            "div",
            [["class", `parents`]],
            createOptionsElement(dirs)
        );
        const childs = createElement(
            "div",
            [["class", "childs"]],
            createOptionsElement([])
        );
        list.append(
            search,
            addButton,
            sendButton,
            dirStatusIcon,
            parents,
            childs
        );

        main.append(listButton, rootButton, selection, list, cancelButton);

        shadow.append(connection, main);
        document.body.append(krab);

        /**************** Helper Functions *****************/

        /**************** Event Listners *****************/

        function hideToggles() {
            list.style.display = "none";
            recents && (recents.style.display = "none");
            childs && (childs.style.display = "none");
        }

        listButton.onclick = (e) => {
            e.stopPropagation();
            recents && (recents.style.display = "none");
            list.style.display =
                list.style.display === "block" ? "none" : "block";
            parents.style.display = "block";
            if (sendButton.style.display !== "none") {
                search.placeholder = "Search Directory";
                sendButton.style.display = "none";
                addButton.style.display = "initial";
            }
            tempDirs = dirs;
            tempParent = root;
            search.value = "";
            search.focus();
            childs && (childs.style.display = "none");
        };

        rootButton.onclick = async (e) => {
            let { root } = await chrome.storage.local.get("root");
            selected.dataset.id = root;
            selected.dataset.dirName = "root";
            selected.innerText = "root";
        };

        /**
         * @returns {HTMLDivElement}
         */
        async function createStatusElement(text) {
            const { img } = await chrome.storage.local.get("img");
            const status = createElement("div", [["class", "status"]]);
            const image = createImgElement(img.src, "pic");
            const okIcon = createImgElement(okIconPath, "status-img", "ok-img");
            const errorIcon = createImgElement(
                errorIconPath,
                "status-img",
                "error-img"
            );
            const imgStatusIcon = createImgElement(
                statusIconPath,
                "status-img",
                "img-progress"
            );
            status.append(image, text, okIcon, errorIcon, imgStatusIcon);
            return status;
        }
        doneButton.onclick = async (e) => {
            e.stopPropagation();
            let { id, dirName } = selected.dataset;
            const status = await createStatusElement("Uploading...");
            hideToggles();
            shadow.insertBefore(status, main);
            const { code } = await chrome.runtime.sendMessage({
                context: "save",
                data: { id, dirName },
            });
            console.log(code);
            setTimeout(() => shadow.removeChild(status), 2000);
            if (code !== 200) {
                status.style.backgroundColor = "#fa5";
                status.querySelector(".img-progress").style.display = "none";
                status.querySelector(".error-img").style.display = "initial";
                return;
            }
            status.style.backgroundColor = "#5a5";
            status.querySelector(".img-progress").style.display = "none";
            status.querySelector(".ok-img").style.display = "initial";
        };

        selected.onclick = (e) => {
            e.stopPropagation();
            list.style.display = "none";
            recents.style.display =
                recents.style.display === "block" ? "none" : "block";
        };

        const inputInvalidate = (text) => {
            search.placeholder = text;
            search.style.backgroundColor = "#f005";
            search.value = "";
            setTimeout(() => {
                search.placeholder = "Enter Dir to Create";
                search.style.backgroundColor = "#ddd";
            }, 1000);
        };

        const checkDirPresent = () => {
            let name = search.value;
            for (let dir of tempDirs) {
                if (dir.name === name) return true;
            }
            return false;
        };

        const dirCreateHandler = async () => {
            if (search.value === "") {
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
                    name: search.value.trim(),
                    parents: tempParent,
                },
            });
            search.removeEventListener("keyup", enterButtonHandler);
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
            search.placeholder = "Enter Dir to Create";
            search.focus();
            search.addEventListener("keyup", enterButtonHandler);
        };

        sendButton.onclick = async (e) => {
            e.stopPropagation();
            dirCreateHandler();
        };

        search.onkeyup = (e) => {
            if (e.ctrlKey && e.key === "Enter") {
                addButton.style.display = "none";
                dirCreateHandler();
                let childDirs = document.querySelector(".childDirs");
                list.removeChild(childDirs);
                childDirs = createOptionsElement(tempDirs, "childDirs");
                list.append(childDirs);
            }
        };

        search.onclick = (e) => {
            e.stopPropagation();
        };

        search.oninput = (e) => {
            let val = e.target.value.toLowerCase().trimLeft();
            console.log(val);
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
            childDirs && list.removeChild(childDirs);
            childDirs = createOptionsElement(filtered, "childDirs");
            parents.style.display = "none";
            list.append(childDirs);
        };

        login.onclick = async (e) => {
            e.stopPropagation();
            console.log(e);
            chrome.runtime.sendMessage({ context: "loginSubmit" });
            connection.style.display = "none";
        };

        logout.onclick = async (e) => {
            e.stopPropagation();
            chrome.runtime.sendMessage({ context: "logoutSubmit" });
            connection.style.display = "none";
        };

        cancelButton.onclick = (e) => {
            e.stopPropagation();
            main.style.display = "none";
            hideToggles();
        };

        main.onclick = (e) => {
            e.stopPropagation();
            hideToggles();
        };

        window.onclick = () => {
            connection.style.display !== "none" &&
                (connection.style.display = "none");
            if (main.style.display !== "none") {
                hideToggles();
                if (sendButton.style.display !== "none") {
                    search.placeholder = "Search Directory";
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
        function toggleMain(selection) {
            if (selection) {
                if (selection.length > 0) {
                    selected.setAttribute("data-id", selection[0].id);
                    selected.setAttribute("data-dir-name", selection[0].name);
                    selected.innerHTML = selection[0].name;
                }
                let recentDirs = createOptionsElement(selection, "recentDirs");
                let previousRecentDirs = document.querySelector(".recentDirs");
                previousRecentDirs && selection.removeChild(previousRecentDirs);
                // selection.append(recentDirs);
                main.style.display = "flex";
                return;
            }
            let recentDirs = createOptionsElement([], "recentDirs");
            // selection.append(recentDirs);
            main.style.display = "flex";
        }

        /**************** Chrome message handling *****************/
        chrome.runtime.onMessage.addListener(
            async (message, sender, sendResponse) => {
                try {
                    switch (message.context) {
                        case "action":
                            toggleLogin(message.status);
                            break;
                        case "loginStatus":
                            const { status } = message;
                            if (status === 0 || status === 1)
                                toggleLogin(status);
                            else console.log("login failed");
                            break;
                        case "selection":
                            let selection = message.data;
                            toggleMain(selection);
                            break;
                        case "childDirs":
                            tempDirs = message.childDirs || [];
                            let childDirs =
                                document.querySelector(".childDirs");
                            list.removeChild(childDirs);
                            childDirs = createOptionsElement(
                                tempDirs,
                                "childDirs"
                            );
                            parents.style.display = "none";
                            list.append(childDirs);
                            break;
                        case "dirs":
                            const dirs = message.data || [];
                            tempDirs = dirs;
                            list.removeChild(parents);
                            parents = createOptionsElement(dirs, "dirs");
                            parents.style.display = "none";
                            list.append(parents);
                            break;
                        case "createDir":
                            if (message.status !== 200) {
                                search.style.backgroundColor = "#f005";
                                search.placeholder = "failed";
                                setTimeout(() => {
                                    search.style.backgroundColor = "#ddd";
                                    search.placeholder = "Search Directory";
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
                            search.focus();
                            search.value = "";
                            break;
                        case "save":
                            imgStatusIcon.style.display = "none";
                            if (message.status === 200) {
                                statusText.textContent = "ok";
                                okIcon.style.display = "initial";
                            } else {
                                statusText.textContent = "failed";
                                errorIcon.style.display = "initial";
                            }
                            setTimeout(() => {
                                status.style.display = "none";
                                statusText.textContent = "Uploading...";
                                imgStatusIcon.style.display = "initial";
                                okIcon.style.display = "none";
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
