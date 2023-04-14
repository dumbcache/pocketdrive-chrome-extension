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
         * @returns {DocumentFragment}
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
            sendButton,
            dirStatusIcon,
            addButton,
            childs,
            parents
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
            const statusText = createElement(
                "div",
                [["class", "status-text"]],
                text
            );
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
            status.append(image, statusText, errorIcon, imgStatusIcon, okIcon);
            return status;
        }

        doneButton.onclick = async (e) => {
            e.stopPropagation();
            let { id, dirName } = selected.dataset;
            const status = await createStatusElement("Uploading...");
            hideToggles();
            shadow.insertBefore(status, main);
            main.style.display = "none";
            const { code } = await chrome.runtime.sendMessage({
                context: "save",
                data: { id, dirName },
            });
            setTimeout(() => shadow.removeChild(status), 2000);
            if (code !== 200) {
                status.style.backgroundColor = "#fa5";
                status.querySelector(".status-text").innerText = "failed";
                status.querySelector(".img-progress").style.display = "none";
                status.querySelector(".error-img").style.display = "initial";
                return;
            }
            status.style.backgroundColor = "#5a5";
            status.querySelector(".status-text").innerText = "uploaded";
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
                childs.innerHTML = "";
                childs.append(createOptionsElement(tempDirs));
            }
        };

        search.onclick = (e) => {
            e.stopPropagation();
        };

        search.oninput = (e) => {
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
            childs.innerHTML = "";
            childs.append(createOptionsElement(filtered));
            childs.style.display = "block";
            parents.style.display = "none";
        };

        login.onclick = async (e) => {
            e.stopPropagation();
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

        const optionHandle = async (e) => {
            let { id, dirName } = e.target.dataset;
            tempParent = id;
            selected.dataset.id = id;
            selected.dataset.dirName = dirName;
            selected.innerText = dirName;
            if (e.composedPath().includes(recents)) {
                recents.style.display = "none";
                return;
            }

            const { status, childDirs } = await chrome.runtime.sendMessage({
                context: "childDirs",
                data: { parents: id },
            });
            if (status !== 200) {
                search.style.backgroundColor = "#f005";
                search.placeholder = "unable to fetch childs";
                setTimeout(() => {
                    search.style.backgroundColor = "#ddd";
                    search.placeholder = "Search Directory";
                }, 1000);
                return;
            }
            search.value = "";
            search.focus();
            childs.innerHTML = "";
            childs.style.display = "block";
            tempDirs = childDirs || [];
            childs.append(createOptionsElement(tempDirs));
            parents.style.display = "none";
        };

        main.onclick = (e) => {
            e.stopPropagation();
            if (e.target.classList.contains("option")) {
                optionHandle(e);
                return;
            }
            if (
                e.target.classList.contains("recents") ||
                e.target.classList.contains("parents") ||
                e.target.classList.contains("childs")
            )
                return;
            hideToggles();
        };

        window.onclick = () => {
            connection.style.display !== "none" &&
                (connection.style.display = "none");
            if (main.style.display !== "none") {
                main.style.display = "none";
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
        function toggleMain(recentDirs) {
            if (recentDirs?.length > 0) {
                selected.setAttribute("data-id", recentDirs[0].id);
                selected.setAttribute("data-dir-name", recentDirs[0].name);
                selected.innerText = recentDirs[0].name;
                const options = createOptionsElement(recentDirs);
                recents.innerHTML = "";
                recents.append(options);
            } else {
                selected.dataset.id = root;
                selected.dataset.dirName = "root";
                selected.innerText = "root";
                recents.innerHTML = "";
            }
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
                            let recents = message.data;
                            toggleMain(recents);
                            break;
                        case "dirs":
                            const dirs = message.data || [];
                            tempDirs = dirs;
                            parents.innerHTML = "";
                            parents.append(createOptionsElement(dirs));
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
                            div.innerText = name;
                            div.style.backgroundColor = "#0f05";
                            childs.prepend(div);
                            tempDirs.unshift(message.data);
                            setTimeout(() => {
                                div.style.backgroundColor = "initial";
                            }, 500);
                            dirStatusIcon.style.display = "none";
                            addButton.style.display = "initial";
                            search.focus();
                            search.value = "";
                            break;
                        // case "save":
                        //     imgStatusIcon.style.display = "none";
                        //     if (message.status === 200) {
                        //         statusText.textContent = "ok";
                        //         okIcon.style.display = "initial";
                        //     } else {
                        //         statusText.textContent = "failed";
                        //         errorIcon.style.display = "initial";
                        //     }
                        //     setTimeout(() => {
                        //         status.style.display = "none";
                        //         statusText.textContent = "Uploading...";
                        //         imgStatusIcon.style.display = "initial";
                        //         okIcon.style.display = "none";
                        //         errorIcon.style.display = "none";
                        //         krabMain.style.display = "flex";
                        //     }, 2000);
                        //     break;
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
