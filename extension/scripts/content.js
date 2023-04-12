(async () => {
    try {
        /**************** Inserting scripts *****************/
        const krab = createElement("div", [["id", "krab-ext"]]);
        const shadow = krab.attachShadow({ mode: "closed" });

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
        function createElement(type, attributes = []) {
            let element = document.createElement(type);
            for (let [key, val] of attributes) {
                element.setAttribute(key, val);
            }
            // element.classList.add(type);
            return element;
        }

        /**
         * @returns {HTMLDivElement}
         */
        function createOptionsElement(dirs, className) {
            let options = createElement("div", [
                ["class", `options ${className}`],
            ]);
            for (let { id, name } of dirs) {
                let div = createElement("div", [
                    ["class", `option`],
                    ["data-id", id],
                    ["data-dir-name", name],
                ]);
                div.innerText = name;
                options.append(div);
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

        const listIcon = createElement("img", [
            ["class", "menu-img"],
            ["src", listIconPath],
        ]);
        const addIcon = createElement("img", [
            ["class", "add-img"],
            ["src", addIconPath],
        ]);
        const sendIcon = createElement("img", [
            ["class", "send-img"],
            ["src", sendIconPath],
        ]);
        const doneIcon = createElement("img", [
            ["class", "done-img"],
            ["src", doneIconPath],
        ]);
        const cancelIcon = createElement("img", [
            ["class", "cancel-img"],
            ["src", cancelIconPath],
        ]);
        const okIcon = createElement("img", [
            ["class", "status-img"],
            ["src", okIconPath],
        ]);
        const errorIcon = createElement("img", [
            ["class", "status-img"],
            ["src", errorIconPath],
        ]);
        const imgStatusIcon = createElement("img", [
            ["class", "status-img img-progress"],
            ["src", statusIconPath],
        ]);
        const dirStatusIcon = createElement("img", [
            ["class", "status-img dir-progress"],
            ["src", statusIconPath],
        ]);
        const listButton = createElement("button", [["class", "list-button"]]);
        const addButton = createElement("button", [["class", "add-button"]]);
        const sendButton = createElement("button", [["class", "send-button"]]);
        const cancelButton = createElement("button", [
            ["class", "cancel-button"],
        ]);
        const doneButton = createElement("button", [["class", "done-button"]]);
        const rootButton = createElement("button", [["class", "root-button"]]);
        rootButton.innerText = "/r";

        listButton.append(listIcon);
        addButton.append(addIcon);
        sendButton.append(sendIcon);
        doneButton.append(doneIcon);
        cancelButton.append(cancelIcon);

        let recents = createElement("div", [["class", "recents"]]);
        let selected = createElement("div", [
            ["class", "selected"],
            ["data-id", root],
            ["data-dir-name", "root"],
        ]);
        selected.innerText = "root";
        recents.append(selected, doneButton);

        let list = createElement("div", [["class", "list"]]);
        let search = createElement("input", [
            ["class", "search"],
            ["placeholder", "Search Directory"],
        ]);
        let parents = createOptionsElement(dirs, "parents");
        let childs = createOptionsElement([], "childs");
        list.append(
            search,
            addButton,
            sendButton,
            dirStatusIcon,
            parents,
            childs
        );

        main.append(listButton, rootButton, recents, list, cancelButton);

        shadow.append(main, connection);
        document.body.append(krab);

        /**************** Helper Functions *****************/
        /**
         * @returns {HTMLElement}
         */
        function createStatusElement(text) {
            const status = createElement("div", [["class", "status"]]);
            status.append(text, okIcon, errorIcon, imgStatusIcon);
            return status;
        }

        /**************** Event Listners *****************/
        listButton.onclick = (e) => {
            e.stopPropagation();
            let recentDirs = document.querySelector(".recents.options");
            recentDirs && (recentDirs.style.display = "none");
            list.style.display =
                list.style.display === "block" ? "none" : "block";
            parents.style.display = "block";
            let childs = document.querySelector(".options.childDirs");
            if (sendButton.style.display !== "none") {
                search.placeholder = "Search Directory";
                sendButton.style.display = "none";
                addButton.style.display = "initial";
            }
            tempDirs = dirs;
            tempParent = root;
            search.value = "";
            search.focus();
            childs.style.display = "none";
        };
        rootButton.onclick = async (e) => {
            let { root } = await chrome.storage.local.get("root");
            selected.dataset.id = root;
            selected.dataset.dirName = "root";
            selected.innerText = "root";
        };

        doneButton.onclick = async (e) => {
            e.stopPropagation();
            let { id, dirName } =
                document.querySelector(".recentSelect").dataset;
            await chrome.runtime.sendMessage({
                context: "save",
                data: { id, dirName },
            });
            let recentDirs = document.querySelector(".options.recentDirs");
            main.style.display = "none";
            list.style.display = "none";
            recentDirs.style.display = "none";
            krabMain.style.display = "none";
            status.style.display = "block";
        };
        cancelButton.onclick = (e) => {
            e.stopPropagation();
            main.style.display = "none";
            let recentDirs = document.querySelector(".recentDirs");
            list.style.display = "none";
            recentDirs.style.display = "none";
            selected.dataset.id = root;
            selected.dataset.dirName = "root";
            selected.innerHTML = "root";
        };

        main.onclick = (e) => {
            e.stopPropagation();
            let recentDirs = document.querySelector(".options.recentDirs");
            let childs = document.querySelector(".options.childDirs");
            list.style.display = "none";
            recentDirs.style.display = "none";
            childs.style.display = "none";
        };

        selected.onclick = (e) => {
            e.stopPropagation();
            let recentDirs = document.querySelector(".options.recentDirs");
            list.style.display = "none";
            recentDirs.style.display =
                recentDirs.style.display === "block" ? "none" : "block";
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
            list.removeChild(childDirs);
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
        window.onclick = () => {
            connection.style.display !== "none" &&
                (connection.style.display = "none");
            if (main.style.display !== "none") {
                let recentDirs = document.querySelector(".options.recentDirs");
                let childs = document.querySelector(".options.childDirs");
                main.style.display = "none";
                list.style.display = "none";
                recentDirs.style.display = "none";
                childs.style.display = "none";
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
                main.style.display = "flex";
                return;
            }
            let recentDirs = createOptionsElement([], "recentDirs");
            // recents.append(recentDirs);
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
                        case "recents":
                            let recents = message.data;
                            toggleMain(recents);
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
