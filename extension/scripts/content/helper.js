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
    button.classList.add(...classNames);
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
    img.classList.add(...classNames);
    return img;
}

/**
 * @returns {DocumentFragment}
 */
export function createOptionsElement(dirs) {
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

export function initBulk() {
    const bulk = createElement("div", [["class", "bulk"]]);
    bulk.style.display = "none";

    const cancelIcon = createImgElement(iconPath("cancelIcon"), "cancel-img");
    const bulkCancelButton = createButtonElement(
        cancelIcon,
        "bulk-cancel-button"
    );

    const wrapper = createElement("div", [["class", "bulk-wrapper"]]);
    bulk.append(bulkCancelButton, wrapper);

    return { bulk, bulkCancelButton };
}
/**
 *
 * @param {string} url
 */
export function downloadImage(url) {
    const image = new Image();
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    if (url.endsWith(".png") || url.endsWith(".jpeg") || url.endsWith(".jpg")) {
        image.onload = function () {
            c.width = this.naturalWidth; // update canvas size to match image
            c.height = this.naturalHeight;
            ctx.drawImage(this, 0, 0);
            c.toBlob(async function (blob) {
                tempBlob.bytes = Array.from(
                    new Uint8Array(await blob.arrayBuffer())
                );
            }, "image/webp");
        };
        image.onerror = function () {};
        image.crossOrigin = "anonymous"; // if from different origin
        image.src = url;
    }
}
