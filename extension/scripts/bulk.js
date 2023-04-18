(() => {
    /**************** Inserting scripts *****************/
    const bulk = createElement("div", [["id", "krab-bulk"]]);
    const shadow = bulk.attachShadow({ mode: "open" });

    const styles = chrome.runtime.getURL("scripts/bulk.css");
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
     * @param {HTMLImageElement | string} childNode
     * @param {...string} classNames
     * @returns {HTMLButtonElement}
     */
    function createButtonElement(childNode, ...classNames) {
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
    function createImgElement(src, ...classNames) {
        const img = document.createElement("img");
        img.src = src;
        img.classList.add(...classNames);
        return img;
    }

    const images = document.images;
    for (let i of images) {
        const img = createImgElement(i.src, "pic");
        shadow.append(img);
    }
    document.body.append(bulk);
})();
