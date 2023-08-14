let dropItems = [];
const ROOT_FOLDER = "#Pocket_Drive";

const rootButton = document.querySelector(".root-button");
const listButton = document.querySelector(".list-button");
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
    const recents = document.querySelector(".recents");
    recents.hidden = !recents.hidden;
    dirs.hidden = true;
    childs.hidden = true;
});

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

dropArea.addEventListener("drop", dropHandler);
dropArea.addEventListener("dragenter", toggleDropHighlight);
dropArea.addEventListener("dragleave", toggleDropHighlight);
dropArea.addEventListener("dragstart", (e) => e.preventDefault());
dropArea.addEventListener("dragover", (e) => e.preventDefault());

function previewAndSetDropItems(files, parentID, parentName) {
    for (let img of files) {
        if (img.type.match("image/")) {
            const id = Math.round(Math.random() * Date.now()).toString();
            const imgRef = URL.createObjectURL(img);
            const imgNew = createImgElement(imgRef);
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
                    dropItems = [
                        ...dropItems,
                        {
                            id,
                            name: id,
                            mimeType: img.type,
                            bytes,
                            imgRef,
                            parent: parentID,
                            parentName: parentName,
                        },
                    ];
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
                        const imgRef = URL.createObjectURL(blob);
                        dropItems = [
                            ...dropItems,
                            {
                                id,
                                name: id,
                                mimeType: blob?.type,
                                bytes,
                                imgRef,
                                parent: parentID,
                                parentName: parentName,
                            },
                        ];
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

async function fetchChilds(id) {
    const { status, childDirs } = await chrome.runtime.sendMessage({
        context: "CHILD_DIRS",
        data: { parents: id },
    });
    return childDirs;
}

function createImgElement(src) {
    const div = document.createElement("div");
    const img = new Image();
    img.src = src;
    img.classList.add("img");
    div.append(img);
    return div;
}

function createList(list, classname) {
    const fragment = document.createDocumentFragment();
    for (let i of list) {
        const item = document.createElement("li");
        item.classList.add(classname);
        item.classList.add("item");
        item.dataset.id = i.id;
        item.innerText = i.name;
        item.title = i.name;
        fragment.append(item);
    }
    return fragment;
}

function setRecentList(list) {
    recents.innerHTML = "";
    recents.append(createList(list, "recent"));
}
function setDirList(list) {
    dirs.innerHTML = "";
    dirs.append(createList(list, "dir"));
}
function setChildList(list) {
    childs.innerHTML = "";
    childs.append(createList(list, "child"));
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
        return;
    }
    setSelected(recents[0].id, recents[0].name);
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

function addImagesToButtons() {
    const img = new Image();
    img.classList.add("img");
    img.src = chrome.runtime.getURL("images/doneIcon.svg");
    document.querySelector(".save")?.append(img);
    const listIcon = new Image();
    listIcon.classList.add("img");
    listIcon.src = chrome.runtime.getURL("images/listIcon.svg");
    document.querySelector(".list-button")?.append(listIcon);
}

window.addEventListener("click", () => {
    dirs.hidden = true;
    childs.hidden = true;
    recents.hidden = true;
});

window.addEventListener("load", () => {
    addImagesToButtons();
    setDefaultSelected();
    setRecents();
    setDirs();
});
