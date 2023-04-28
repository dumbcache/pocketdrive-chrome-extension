import {
    createElement,
    createImgElement,
    createOptionsElement,
    iconPath,
    initMain,
    initBulk,
} from "./helper.js";

const init = async (sendResponse) => {
    try {
        /**************** Inserting scripts *****************/
        const krab = createElement("div", [["id", "krab-ext"]]);
        krab.style.background = "none";
        const shadow = krab.attachShadow({ mode: "open" });

        const styles = chrome.runtime.getURL("scripts/content/content.css");
        const styleElement = createElement("link", [
            ["rel", "stylesheet"],
            ["href", styles],
        ]);
        shadow.append(styleElement);

        /**************** Resource Urls *****************/
        let { root = "", dirs = [] } = await chrome.storage.local.get([
            "root",
            "dirs",
        ]);
        let tempDirs = dirs;
        let tempParent = root;
        const tempBulk = new Set();
        /**************** Element declarations *****************/

        const {
            addButton,
            cancelButton,
            dirStatusIcon,
            doneButton,
            main,
            recents,
            search,
            selected,
            sendButton,
            list,
            childs,
            parents,
            listButton,
            mainImg,
            rootButton,
        } = initMain(root, dirs);

        const { bulk, check, bulkOkButton, bulkCancelButton, selectedCount } =
            initBulk();

        const statusWrapper = createElement("div", [
            ["class", "status-wrapper"],
        ]);
        shadow.append(statusWrapper, main, bulk);
        document.body.append(krab);

        /**************** Helper Functions *****************/
        function hideToggles() {
            list.style.display = "none";
            recents && (recents.style.display = "none");
            childs && (childs.style.display = "none");
        }
        /**
         * @returns {HTMLDivElement}
         */
        async function createStatusElement(text, src) {
            const status = createElement("div", [["class", "status"]]);
            const statusText = createElement(
                "div",
                [["class", "status-text"]],
                text
            );
            const image = createImgElement(src, "pic");
            const okIcon = createImgElement(
                iconPath("okIcon"),
                "status-img",
                "ok-img"
            );
            const errorIcon = createImgElement(
                iconPath("errorIcon"),
                "status-img",
                "error-img"
            );
            const imgStatusIcon = createImgElement(
                iconPath("statusIcon"),
                "status-img",
                "img-progress"
            );
            status.append(image, statusText, errorIcon, imgStatusIcon, okIcon);
            return status;
        }
        function inputInvalidate(text) {
            search.placeholder = text;
            search.style.backgroundColor = "#f005";
            search.value = "";
            setTimeout(() => {
                search.placeholder = "Enter Dir to Create";
                search.style.backgroundColor = "#ddd";
            }, 1000);
        }

        function checkDirPresent() {
            let name = search.value;
            for (let dir of tempDirs) {
                if (dir.name === name) return true;
            }
            return false;
        }

        /**************** Event Handler Functions *****************/
        async function dirCreateHandler() {
            if (search.value === "") {
                inputInvalidate("Cannot be empty");
                return;
            }
            if (checkDirPresent()) {
                addButton.style.display = "initial";
                inputInvalidate("Already Present");
                return;
            }
            let name = search.value.trim();
            name = name
                .split(" ")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");
            search.value = name;

            sendButton.style.display = "none";
            dirStatusIcon.style.display = "initial";

            await chrome.runtime.sendMessage({
                context: "CREATE_DIR",
                data: {
                    name: name,
                    parents: tempParent,
                },
            });
            search.removeEventListener("keyup", ListenForEnterInCreateMode);
        }

        function createChilds(dirs) {
            childs.innerHTML = "";
            childs.append(createOptionsElement(dirs));
            childs.style.display = "block";
            parents.style.display = "none";
        }

        function ListenForEnterInCreateMode(e) {
            if (e.ctrlKey === false && e.key === "Enter") {
                dirCreateHandler();
            }
        }
        async function optionClickHandler(e) {
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
                context: "CHILD_DIRS",
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
            addButton.style.display = "initial";
            sendButton.style.display = "none";
            tempDirs = childDirs || [];
            createChilds(tempDirs);
        }
        /**************** Event Listners *****************/

        listButton.addEventListener("click", (e) => {
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
        });

        rootButton.addEventListener("click", async (e) => {
            let { root } = await chrome.storage.local.get("root");
            selected.dataset.id = root;
            selected.dataset.dirName = "root";
            selected.innerText = "root";
        });

        selected.addEventListener("click", (e) => {
            e.stopPropagation();
            list.style.display = "none";
            recents.style.display =
                recents.style.display === "block" ? "none" : "block";
        });

        addButton.addEventListener("click", async (e) => {
            e.stopPropagation();
            createChilds(tempDirs);
            addButton.style.display = "none";
            sendButton.style.display = "initial";
            search.placeholder = "Enter Dir to Create";
            search.focus();
            search.addEventListener("keyup", ListenForEnterInCreateMode);
        });

        sendButton.addEventListener("click", async (e) => {
            e.stopPropagation();
            dirCreateHandler();
        });

        search.addEventListener("keyup", (e) => {
            if (e.ctrlKey && e.key === "Enter") {
                addButton.style.display = "none";
                dirCreateHandler();
                childs.innerHTML = "";
                childs.append(createOptionsElement(tempDirs));
            }
        });

        search.addEventListener("click", (e) => {
            e.stopPropagation();
        });

        search.addEventListener("input", (e) => {
            if (addButton.style.display === "none") return;
            let filtered = [];
            let val = e.target.value.toLowerCase().trimLeft();
            if (val === "") {
                e.target.value = "";
                filtered = tempDirs;
            } else {
                filtered = tempDirs.filter((element) =>
                    element.name.toLowerCase().includes(val)
                );
            }
            createChilds(filtered);
        });

        cancelButton.addEventListener("click", (e) => {
            e.stopPropagation();
            main.style.display = "none";
            hideToggles();
        });
        async function toggleStatus(id, dirName, src) {
            const status = await createStatusElement("Uploading...", src);
            hideToggles();
            statusWrapper.append(status);
            main.style.display = "none";
            const { code } = await chrome.runtime.sendMessage({
                context: "SAVE",
                data: { id, dirName, src },
            });
            setTimeout(() => statusWrapper.removeChild(status), 2000);
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
        }
        doneButton.addEventListener("click", async (e) => {
            e.stopPropagation();
            let { id, dirName } = selected.dataset;
            for (let src of tempBulk) {
                toggleStatus(id, dirName, src);
            }
        });

        main.addEventListener("click", (e) => {
            e.stopPropagation();
            if (e.target.classList.contains("option")) {
                optionClickHandler(e);
                return;
            }
            if (
                e.target.classList.contains("recents") ||
                e.target.classList.contains("parents") ||
                e.target.classList.contains("childs")
            )
                return;
            hideToggles();
        });

        main.addEventListener("contextmenu", (e) => e.stopPropagation());

        window.addEventListener("click", () => {
            if (main.style.display !== "none") {
                main.style.display = "none";
                hideToggles();
                if (sendButton.style.display !== "none") {
                    search.placeholder = "Search Directory";
                    sendButton.style.display = "none";
                    addButton.style.display = "initial";
                }
            }
            if (bulk.style.display !== "none") {
                bulk.style.display = "none";
                tempBulk.clear();
            }
        });
        window.addEventListener("contextmenu", () => {
            if (window.location.host === "www.instagram.com") {
                const ele = document.querySelectorAll("._aagw");
                for (let i of ele) {
                    i.style.display = "none";
                }
            }
            if (main.style.display !== "none") {
                main.style.display = "none";
                hideToggles();
                if (sendButton.style.display !== "none") {
                    search.placeholder = "Search Directory";
                    sendButton.style.display = "none";
                    addButton.style.display = "initial";
                }
            }
        });

        /**************** Popup toggler *****************/
        async function toggleMain() {
            let { recents: recentDirs } = await chrome.storage.local.get(
                "recents"
            );
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
        bulk.addEventListener("click", (e) => {
            e.stopPropagation();
            /**
             * @type {HTMLImageElement}
             */
            const target = e.target;
            if (!target.classList.contains("bulk-pic")) return;
            if (target.dataset.toggle === "0") {
                target.dataset.toggle = "1";
                tempBulk.add(target.src);
                selectedCount.innerText = Number(selectedCount.innerText) + 1;
            } else {
                target.dataset.toggle = "0";
                tempBulk.delete(target.src);
                selectedCount.innerText = Number(selectedCount.innerText) - 1;
            }
        });
        bulkCancelButton.addEventListener("click", () => {
            bulk.style.display = "none";
            tempBulk.clear();
        });
        bulkOkButton.addEventListener("click", () => {
            if (tempBulk.size === 0) return;
            mainImg.src = [...tempBulk][0] || "";
            bulk.style.display = "none";
            toggleMain();
        });
        function scrapImages() {
            selectedCount.innerText = "0";
            const images = document.images;
            const wrapper = bulk.querySelector(".bulk-wrapper");
            wrapper.innerHTML = "";
            for (let i of images) {
                const img = createImgElement(i.src, "bulk-pic");
                img.dataset.toggle = "0";
                wrapper.append(img);
            }
            bulk.style.display = "initial";
        }
        check.addEventListener("change", () => {
            if (check.checked) {
                selectedCount.innerText = "0";
                const imgs = bulk.querySelectorAll(".bulk-pic");
                for (let img of imgs) {
                    img.dataset.toggle = "1";
                    tempBulk.add(img.src);
                    selectedCount.innerText =
                        Number(selectedCount.innerText) + 1;
                }
            } else {
                const imgs = bulk.querySelectorAll(".bulk-pic");
                for (let img of imgs) {
                    img.dataset.toggle = "0";
                    tempBulk.delete(img.src);
                }
                selectedCount.innerText = "0";
            }
        });

        sendResponse(true);
        /**************** Chrome message handling *****************/
        chrome.runtime.onMessage.addListener((message) => {
            try {
                switch (message.context) {
                    case "ACTION":
                        const bulk = shadow.querySelector(".bulk");
                        if (bulk?.style.display !== "none") return;
                        tempBulk.clear();
                        check.checked = false;
                        scrapImages();
                        break;
                    case "SELECTION":
                        tempBulk.clear();
                        let { src } = message;
                        mainImg.src = src;
                        tempBulk.add(src);
                        setTimeout(() => toggleMain(), 100);
                        break;
                    case "DIRS":
                        const dirs = message.data || [];
                        tempDirs = dirs;
                        parents.innerHTML = "";
                        parents.append(createOptionsElement(dirs));
                        break;
                    case "CREATE_DIR":
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
                }
            } catch (error) {
                console.warn("krabs:", error);
            }
        });
    } catch (error) {
        console.warn("krabs:", error);
    }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        if (message.context === "CHECK_IF_ROOT_EXISTS") {
            const root = document.getElementById("krab-ext");
            if (root) {
                sendResponse(true);
                return;
            }
            init(sendResponse);
            return true;
        }
    } catch (error) {
        console.warn("krabs:", error);
    }
});
