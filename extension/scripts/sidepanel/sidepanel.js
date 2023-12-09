const iconResources = {
    addIcon: "addIcon.svg",
    sendIcon: "sendIcon.svg",
    cancelIcon: "cancelIcon.svg",
    doneIcon: "doneIcon.svg",
    listIcon: "listIcon.svg",
    errorIcon: "errorIcon.svg",
    okIcon: "okIcon.svg",
    statusIcon: "statusIcon.svg",
};
export let tempBlob = { bytes: null };

/**
 *
 * @param {string} icon
 * @returns {string}
 */
export function iconPath(icon) {
    const relative = "images";
    return chrome.runtime.getURL(`${relative}/${iconResources[icon]}`);
}

/**
 * @returns {HTMLElement}
 */
export function createElement(type, attributes = [], ...childNodes) {
    const element = document.createElement(type);
    for (let [key, val] of attributes) {
        element.setAttribute(key, val);
    }
    childNodes.length !== 0 && element.append(...childNodes);
    return element;
}

/**
 *
 * @param {HTMLImageElement | string} childNode
 * @param {...string} classNames
 * @returns {HTMLButtonElement}
 */
export function createButtonElement(childNode, ...classNames) {
    const button = document.createElement("button");
    button.classList.add("btn", ...classNames);
    childNode && button.append(childNode);
    return button;
}

/**
 * @param {string} string
 * @param {...string} classNames
 * @returns {HTMLImageElement}
 */
export function createImgElement(src, ...classNames) {
    const img = document.createElement("img");
    img.src = src;
    img.classList.add("img", ...classNames);
    return img;
}

/**
 * @returns {DocumentFragment}
 */
export function createListElement(list, classname) {
    const fragment = document.createDocumentFragment();
    for (let { id, name, parentName } of list) {
        const item = createElement(
            "li",
            [
                ["class", `item ${classname}`],
                ["data-id", id],
                ["title", classname === "recent" ? parentName : name],
            ],
            name
        );
        fragment.append(item);
    }
    return fragment;
}

let timeoutId;
let autosave = false;
let autolink = true;
let dropItems = [];
let selectedName = "";
let parentName = "";
const ROOT_FOLDER = "#Pocket_Drive";
let ROOT_ID = "";

const app = document.querySelector(".app");
const rootButton = document.querySelector(".root-button");
const listButton = document.querySelector(".list-button");
const saveButton = document.querySelector(".save");
const autoSaveButton = document.querySelector(".autosave");
const addButton = document.querySelector(".add-button");
const downButton = document.querySelector(".down-button");
const leftButton = document.querySelector(".left-button");
const createWrapper = document.querySelector(".create-wrapper");
const createForm = document.querySelector(".create-form");
const linkButton = document.querySelector(".link");
const listWrapper = document.querySelector(".list-wrapper");
const recents = document.querySelector(".recents");
const dirs = document.querySelector(".dirs");
const childs = document.querySelector(".childs");
/**
 * @type {HTMLIFrameElement}
 */
const pdWebsite = document.querySelector(".pocketdrive-website");
/**
 * @type {HTMLDivElement}
 */
const appBody = document.querySelector(".app-body");
/**
 * @type {HTMLDivElement}
 */
const footer = document.querySelector(".footer");
/**
 * @type {HTMLDivElement}
 */
const pdButton = document.querySelector(".pd-button");
pdButton.addEventListener("click", () => {
    /**
     * @type {HTMLIFrameElement}
     */
    pdWebsite.style.display = "initial";
    appBody.style.display = "none";
    footer.style.display = "none";
});
/**@type {HTMLDivElement} */
const selected = document.querySelector(".selected");
selected.addEventListener("click", (e) => {
    e.stopPropagation();
    setDefaultSelected();
    document.querySelector(".history-icon").hidden = false;
    const recents = document.querySelector(".recents");
    recents.hidden = !recents.hidden;
    dirs.hidden = true;
    childs.hidden = true;
});

async function setCurrentTabURL() {
    chrome.tabs
        .query({ active: true, lastFocusedWindow: true })
        .then(([tab]) => {
            document.querySelector("#url").value = tab?.url;
            document.querySelector("#url").title = tab?.url;
        });
}

async function handleDirCreate(e) {
    e.preventDefault();
    const parent = selected.dataset.id;
    let name = document.querySelector(".child-name").value.trim();
    name = name
        .split(" ")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    const { status } = await chrome.runtime.sendMessage({
        context: "CREATE_DIR",
        data: {
            name,
            parents: parent,
        },
    });
    if (status === 200) {
        createWrapper.style.display = "none";
        const { active, childDirs } = await chrome.storage.local.get();
        setChildList(childDirs[active][parent]);
        childs.hidden = false;
    }
}

leftButton.addEventListener("click", async () => {
    let id = selected.dataset.id;
    if (id === ROOT_ID) {
        toggleList();
        return;
    }
    const { status, data } = await chrome.runtime.sendMessage({
        context: "FETCH_PARENT",
        id,
    });
    if (status === 200) {
        const { id: parent, name } = data;
        if (parent === ROOT_ID) {
            toggleList();
            return;
        }
        setSelected(parent, name);

        let { status, childDirs } = await fetchChilds(parent);
        if (status !== 200) {
            selected.style.backgroundColor = "#f00";
            setTimeout(() => (selected.style.backgroundColor = "#333"), 1000);
            return;
        }
        childDirs ?? (childDirs = []);
        setChildList(childDirs);
        childs.hidden = false;
        recents.hidden = true;
    }
});

downButton.addEventListener("click", async () => {
    let id = selected.dataset.id;
    let { status, childDirs } = await fetchChilds(id);
    if (status !== 200) {
        selected.style.backgroundColor = "#f00";
        setTimeout(() => (selected.style.backgroundColor = "#333"), 1000);
        return;
    }
    childDirs ?? (childDirs = []);
    setChildList(childDirs);
    childs.hidden = false;
    recents.hidden = true;
});

addButton.addEventListener("click", () => {
    const parent = document.querySelector(".parent-name");
    parent.dataset.id = selected.dataset.id;
    parent.innerText = selected.innerText;
    createWrapper.style.display =
        createWrapper.style.display === "grid" ? "none" : "grid";
    const child = document.querySelector(".child-name");
    child.value = "";
    child.focus();
});
createForm.addEventListener("submit", handleDirCreate);
createForm.addEventListener("click", (e) => {
    e.stopPropagation();
});

createWrapper.addEventListener("click", () => {
    createWrapper.style.display = "none";
});

autoSaveButton.addEventListener("click", () => {
    autosave = !autosave;
    autoSaveButton.classList.toggle("active");
});
linkButton.addEventListener("click", () => {
    autolink = !autolink;
    linkButton.classList.toggle("active");
    autolink && setCurrentTabURL();
});
saveButton.addEventListener("click", saveImages);
rootButton.addEventListener("click", () => {
    pdWebsite.style.display = "none";
    appBody.style.display = "flex";
    footer.style.display = "flex";
});
recents.addEventListener("click", (e) => {
    e.stopPropagation();
    if (e.target.classList.contains("recent")) {
        setSelected(e.target.dataset.id, e.target.innerText);
        recents.hidden = true;
    }
});
listWrapper.addEventListener("click", async (e) => {
    e.stopPropagation();
    if (
        e.target.classList.contains("dir") ||
        e.target.classList.contains("child")
    ) {
        const id = e.target.dataset.id;
        const name = e.target.innerText;
        recents.hidden = true;
        dirs.hidden = true;
        document.querySelector(".history-icon").hidden = true;
        let { status, childDirs } = await fetchChilds(id);
        if (status !== 200) {
            selected.style.backgroundColor = "#f00";
            setTimeout(() => (selected.style.backgroundColor = "#333"), 1000);
            return;
        }
        childDirs ?? (childDirs = []);
        setChildList(childDirs);
        setSelected(id, name);
        childs.hidden = false;
        if (e.target.classList.contains("dir")) {
            selectedName = name;
            parentName = "Pocket_#Drive";
        } else {
            parentName = selectedName;
            selectedName = name;
        }
    }
});

async function toggleList() {
    recents.hidden = true;
    childs.hidden = true;
    dirs.hidden = !dirs.hidden;
    document.querySelector(".history-icon").hidden = true;
    const { roots, active } = await chrome.storage.local.get();
    setSelected(roots[active], ROOT_FOLDER);
}

listButton.addEventListener("click", async (e) => {
    e.stopPropagation();
    toggleList();
});

function toggleDropHighlight() {
    app.classList.toggle("highlight");
}

/**
 *
 * @param {DragEvent} e
 */
function dropHandler(e) {
    e.preventDefault();
    autolink && setCurrentTabURL();
    app.classList.remove("highlight");
    if (e.dataTransfer?.files) {
        previewAndSetDropItems(e.dataTransfer.files);
    }
}

window.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveImages();
});
window.addEventListener("drop", dropHandler);
window.addEventListener("dragenter", toggleDropHighlight);
window.addEventListener("dragleave", toggleDropHighlight);
window.addEventListener("dragstart", (e) => e.preventDefault());
window.addEventListener("dragover", (e) => e.preventDefault());

function previewAndSetDropItems(files) {
    for (let img of files) {
        if (img.type.match("image/")) {
            const id = Math.round(Math.random() * Date.now()).toString();
            const imgRef = URL.createObjectURL(img);
            const imgNew = createDropElement(imgRef, id);
            appBody.append(imgNew);
            if (
                img.type === "image/gif" ||
                img.type === "image/avif" ||
                img.type === "image/webp"
            ) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    /** @type {ArrayBuffer} */
                    const result = e.target?.result;
                    const bytes = Array.from(new Uint8Array(result));
                    dropItems = {
                        ...dropItems,
                        [id]: {
                            mimeType: img.type,
                            bytes,
                            status: "",
                        },
                    };
                    if (autosave) saveImages();
                };
                reader.readAsArrayBuffer(img);
            } else {
                const image = new Image();
                const c = document.createElement("canvas");
                const ctx = c.getContext("2d");

                image.onload = function () {
                    c.width = this.naturalWidth; // update canvas size to match image
                    c.height = this.naturalHeight;
                    ctx.drawImage(this, 0, 0);
                    c.toBlob(async function (blob) {
                        /**@type {ArrayBuffer} */
                        const result = await blob?.arrayBuffer();
                        const bytes = Array.from(new Uint8Array(result));
                        dropItems = {
                            ...dropItems,
                            [id]: {
                                mimeType: blob?.type,
                                bytes,
                                status: "",
                            },
                        };
                        if (autosave) saveImages();
                    }, "image/webp");
                };
                image.onerror = function () {
                    alert("Error in loading");
                };
                image.crossOrigin = ""; // if from different origin
                image.src = imgRef;
            }
        }
    }
}

function removeDropImage(id) {
    const drop = document.querySelector(`[data-id='${id}']`);
    delete dropItems[id];
    appBody.removeChild(drop);
    console.log(dropItems);
}

async function saveDropImage(id) {
    const drop = document.querySelector(`[data-id='${id}']`);
    const overlay = drop.querySelector(".overlay");
    overlay.style.display = "initial";
    const status = drop.querySelector(".status");
    status.style.display = "initial";
    dropItems[id].status = "progress";
    const item = dropItems[id];
    const { code } = await chrome.runtime.sendMessage({
        context: "SAVE",
        data: {
            id: selected.dataset.id,
            dirName: selected.innerText,
            parentName: parentName,
            src: document.querySelector("#url").value,
            blob: item.bytes,
            mimeType: item.mimeType,
        },
    });
    if (code === 200) {
        drop.querySelector(".status-ok").style.display = "initial";
        status.style.display = "none";
        dropItems[id].status = "success";
        return;
    }
    status.style.display = "none";
    dropItems[id].status = "";
    overlay.style.display = "none";
}

function createDropElement(src, id) {
    const div = createElement("div", [["class", "drop"]]);
    div.dataset.id = id;
    const cancelIcon = createImgElement(iconPath("cancelIcon"), "cancel");
    const doneIcon = createImgElement(iconPath("doneIcon"), "done");
    const statusIcon = createImgElement(iconPath("statusIcon"), "status");
    const okIcon = createImgElement(iconPath("okIcon"), "status-ok");
    const cancelButton = createButtonElement(
        cancelIcon,
        "cancel-single",
        "cancel"
    );
    const doneButton = createButtonElement(doneIcon, "done-single", "done");
    const img = createImgElement(src, "drop-img");
    const overlay = createElement("div", [["class", "overlay"]]);
    div.append(img, cancelButton, doneButton, overlay, statusIcon, okIcon);

    doneButton.addEventListener("click", () => {
        saveDropImage(id);
        callClearImages();
        setRecents();
    });
    cancelButton.addEventListener("click", () => {
        removeDropImage(id);
        callClearImages();
        setRecents();
    });
    return div;
}

function clearImages() {
    for (let i in dropItems) {
        if (dropItems[i].status === "success") {
            removeDropImage(i);
        }
    }
}

function callClearImages() {
    clearImages();
    clearTimeout(timeoutId);
    timeoutId = setTimeout(clearImages, 10000);
}

async function saveImages() {
    setRecents();
    for (let i in dropItems) {
        if (dropItems[i].status === "") {
            saveDropImage(i);
        }
    }
    callClearImages();
}

async function fetchChilds(id) {
    const { status, childDirs } = await chrome.runtime.sendMessage({
        context: "CHILD_DIRS",
        data: { parents: id },
    });
    return { status, childDirs };
}

function setRecentList(list) {
    recents.innerHTML = "";
    recents.append(createListElement(list, "recent"));
}
function setDirList(list) {
    dirs.innerHTML = "";
    dirs.append(createListElement(list, "dir"));
}
function setChildList(list) {
    childs.innerHTML = "";
    childs.append(createListElement(list, "child"));
}
function setSelected(id, name) {
    selected.dataset.id = id;
    selected.innerText = name;
    selected.title = name;
}

async function setDefaultSelected() {
    let { recents, roots, active } = await chrome.storage.local.get();
    recents = recents[active];
    if (recents.length === 0) {
        setSelected(roots[active], ROOT_FOLDER);
        createHistoryIconElement();
        return;
    }
    setSelected(recents[0].id, recents[0].name);
    parentName = recents[0].parentName;
    createHistoryIconElement();
}

async function setRecents() {
    const { recents, active } = await chrome.storage.local.get();
    setRecentList(recents[active]);
    return;
}

async function setDirs() {
    const { dirs, active } = await chrome.storage.local.get();
    setDirList(dirs[active]);
    return;
}

function createHistoryIconElement() {
    document.querySelector(".history-icon").src = chrome.runtime.getURL(
        "images/historyIcon.svg"
    );
}

window.addEventListener("click", () => {
    dirs.hidden = true;
    childs.hidden = true;
    recents.hidden = true;
});

window.addEventListener("load", async () => {
    const { active, roots } = await chrome.storage.local.get();
    ROOT_ID = roots[active];
    setDefaultSelected();
    setRecents();
    setDirs();
});
