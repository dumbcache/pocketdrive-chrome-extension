let dropItems = [];

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
selected.addEventListener("click", () => {
    const recents = document.querySelector(".recents");
    recents.hidden = !recents.hidden;
});

const rootButton = document.querySelector(".root-button");
rootButton.addEventListener("click", () => {
    pdWebsite.style.display = "none";
    appBody.style.display = "flex";
    footer.style.display = "initial";
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

function createImgElement(src) {
    const div = document.createElement("div");
    const img = new Image();
    img.src = src;
    img.classList.add("img");
    div.append(img);
    return div;
}

function setRecentList(list) {
    const recents = document.querySelector(".recents");
    recents.innerHTML = "";
    for (let i of list) {
        const recent = document.createElement("li");
        recent.classList.add("recent");
        recent.dataset.id = i.id;
        recent.innerText = i.name;
        recents.append(recent);
    }
    const recentWrapper = document.querySelector(".recent-wrapper");
    recentWrapper.append(recents);
}

async function setRecent() {
    const { recents, root } = await chrome.storage.local.get();
    if (recents.length === 0) {
        selected.dataset.id = root;
        selected.innerText = "#Pocket_Drive";
        return;
    }
    selected.dataset.id = recents[0].id;
    selected.innerText = recents[0].name;
    setRecentList(recents);
    return;
}

window.addEventListener("load", () => {
    setRecent();
    const img = new Image();
    img.classList.add("img");
    img.src = chrome.runtime.getURL("images/doneIcon.svg");
    document.querySelector(".save")?.append(img);
    const listIcon = new Image();
    listIcon.classList.add("img");
    listIcon.src = chrome.runtime.getURL("images/listIcon.svg");
    document.querySelector(".list-icon")?.append(listIcon);
});
