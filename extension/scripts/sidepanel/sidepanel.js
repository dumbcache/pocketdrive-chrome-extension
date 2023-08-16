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
    for (let { id, name } of list) {
        const item = createElement("li", [
            ["class", `item ${classname}`],
            ["data-id", id],
            ["title", name],
        ]);
        item.innerText = name;
        fragment.append(item);
    }
    return fragment;
}

let dropItems = [];
const ROOT_FOLDER = "#Pocket_Drive";

const rootButton = document.querySelector(".root-button");
const listButton = document.querySelector(".list-button");
const saveButton = document.querySelector(".save");
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
const dropArea = document.querySelector(".drop-area");
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
        setSelected(id, name);
        recents.hidden = true;
        dirs.hidden = true;
        document.querySelector(".history-icon").hidden = true;
        let childDirs = await fetchChilds(id);
        childDirs ?? (childDirs = []);
        setChildList(childDirs);
        childs.hidden = false;
    }
});
listButton.addEventListener("click", async (e) => {
    e.stopPropagation();
    recents.hidden = true;
    childs.hidden = true;
    dirs.hidden = !dirs.hidden;
    document.querySelector(".history-icon").hidden = true;
    const { root } = await chrome.storage.local.get("root");
    setSelected(root, ROOT_FOLDER);
});

function toggleDropHighlight() {
    dropArea.classList.toggle("highlight");
}

/**
 *
 * @param {DragEvent} e
 */
function dropHandler(e) {
    e.preventDefault();
    dropArea.classList.remove("highlight");
    if (e.dataTransfer?.files) {
        previewAndSetDropItems(e.dataTransfer.files);
    }
}

window.addEventListener("drop", dropHandler);
window.addEventListener("dragenter", toggleDropHighlight);
window.addEventListener("dragleave", toggleDropHighlight);
window.addEventListener("dragstart", (e) => e.preventDefault());
window.addEventListener("dragover", (e) => e.preventDefault());

function previewAndSetDropItems(files) {
    for (let img of files) {
        if (img.type.match("image/")) {
            console.log(img.type);
            const id = Math.round(Math.random() * Date.now()).toString();
            const imgRef = URL.createObjectURL(img);
            const imgNew = createDropElement(imgRef);
            imgNew.dataset.id = id;
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
                    const bytes = new Uint8Array(result);
                    dropItems = {
                        ...dropItems,
                        [id]: {
                            mimeType: img.type,
                            bytes,
                        },
                    };
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
                        const bytes = new Uint8Array(result);
                        dropItems = {
                            ...dropItems,
                            [id]: {
                                mimeType: blob?.type,
                                bytes,
                            },
                        };
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

function createDropElement(src) {
    const div = createElement("div", [["class", "drop"]]);
    const cancelIcon = createImgElement(iconPath("cancelIcon"));
    const doneIcon = createImgElement(iconPath("doneIcon"));
    const cancelButton = createButtonElement(cancelIcon, "cancel-single");
    const doneButton = createButtonElement(doneIcon, "done-single");
    const img = createImgElement(src, "drop-img");
    div.append(img, cancelButton, doneButton);
    return div;
}

async function saveImages() {
    for (let i in dropItems) {
        // const { code } = await chrome.runtime.sendMessage({
        //     context: "SAVE",
        //     data: {
        //         id: selected.dataset.id,
        //         dirName: selected.innerText,
        //         src: document.querySelector("#url").value,
        //         blob: dropItems[i].bytes,
        //         mimeType: dropItems[i].mimeType,

        //     },
        // });
        console.log({
            id: selected.dataset.id,
            dirName: selected.innerText,
            src: document.querySelector("#url").value,
            blob: dropItems[i].bytes,
            mimeType: dropItems[i].mimeType,
        });
    }
}

async function fetchChilds(id) {
    const { status, childDirs } = await chrome.runtime.sendMessage({
        context: "CHILD_DIRS",
        data: { parents: id },
    });
    return childDirs;
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
    const { recents, root } = await chrome.storage.local.get();
    if (recents.length === 0) {
        setSelected(root, ROOT_FOLDER);
        createHistoryIconElement();
        return;
    }
    setSelected(recents[0].id, recents[0].name);
    createHistoryIconElement();
}

async function setRecents() {
    const { recents } = await chrome.storage.local.get();
    setRecentList(recents);
    return;
}

async function setDirs() {
    const { dirs } = await chrome.storage.local.get("dirs");
    setDirList(dirs);
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

window.addEventListener("load", () => {
    setDefaultSelected();
    setRecents();
    setDirs();
});
