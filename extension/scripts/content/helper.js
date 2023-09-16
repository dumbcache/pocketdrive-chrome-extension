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
    return browser.runtime.getURL(`${relative}/${iconResources[icon]}`);
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

export function initMain(root, dirs) {
    const main = createElement("main", [["class", "main"]]);
    main.style.display = "none";

    const listIcon = createImgElement(iconPath("listIcon"), "menu-img");
    const addIcon = createImgElement(iconPath("addIcon"), "add-img");
    const sendIcon = createImgElement(iconPath("sendIcon"), "send-img");
    const doneIcon = createImgElement(iconPath("doneIcon"), "done-img");
    const cancelIcon = createImgElement(iconPath("cancelIcon"), "cancel-img");
    const dirStatusIcon = createImgElement(
        iconPath("statusIcon"),
        "status-img",
        "dir-progress"
    );

    const addButton = createButtonElement(addIcon, "add-button");
    const sendButton = createButtonElement(sendIcon, "send-button");
    const doneButton = createButtonElement(doneIcon, "done-button");
    const cancelButton = createButtonElement(cancelIcon, "cancel-button");
    const listButton = createButtonElement(listIcon, "list-button");
    const rootButton = createButtonElement("/r", "root-button");
    rootButton.title = "save to root directory";

    const menu = createElement(
        "div",
        [["class", "menu"]],
        listButton,
        rootButton
    );
    const mainImg = createImgElement("", "pic");
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
     *  @type {HTMLInputElement}
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
    list.append(search, sendButton, dirStatusIcon, addButton, childs, parents);

    main.append(menu, mainImg, selection, list, cancelButton);
    return {
        main,
        addButton,
        cancelButton,
        doneButton,
        sendButton,
        selected,
        recents,
        dirStatusIcon,
        search,
        list,
        childs,
        parents,
        listButton,
        rootButton,
        mainImg,
    };
}

export function initBulk() {
    const bulk = createElement("div", [["class", "bulk"]]);
    bulk.style.display = "none";

    const cancelIcon = createImgElement(iconPath("cancelIcon"), "cancel-img");
    const bulkCancelButton = createButtonElement(
        cancelIcon,
        "bulk-cancel-button"
    );
    const okIconPath = browser.runtime.getURL("images/doneIcon.svg");
    const okIcon = createImgElement(okIconPath, "ok-img");
    const bulkOkButton = createButtonElement(okIcon, "bulk-ok-button");
    const selectedCount = createElement("span", [], 0);
    const check = createElement("input", [
        ["class", "check"],
        ["type", "checkbox"],
    ]);
    const ele = createElement(
        "div",
        [["class", "count"]],
        "Selected:  ",
        selectedCount,
        check
    );
    const wrapper = createElement("div", [["class", "bulk-wrapper"]]);
    bulk.append(ele, bulkOkButton, bulkCancelButton, wrapper);

    return { bulk, check, bulkOkButton, bulkCancelButton, selectedCount };
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
