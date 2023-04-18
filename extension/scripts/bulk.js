(() => {
    /**************** Inserting scripts *****************/
    const bulk = createElement("div", [["id", "krab-bulk"]]);
    bulk.style.display = "none";
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
    const cancelIconPath = chrome.runtime.getURL("images/cancelIcon.svg");
    const cancelIcon = createImgElement(cancelIconPath, "cancel-img");
    const cancelButton = createButtonElement(cancelIcon, "cancel-button");
    const okIconPath = chrome.runtime.getURL("images/doneIcon.svg");
    const okIcon = createImgElement(okIconPath, "ok-img");
    const okButton = createButtonElement(okIcon, "ok-button");
    const selectedCount = createElement("span", [], 0);
    const ele = createElement(
        "div",
        [["class", "count"]],
        "Selected:  ",
        selectedCount
    );
    shadow.append(ele, okButton, cancelButton);
    const wrapper = createElement("div", [["class", "wrapper"]]);
    function scrapImages() {
        const images = document.images;
        wrapper.innerHTML = "";
        for (let i of images) {
            const img = createImgElement(i.src, "pic");
            img.dataset.toggle = "0";
            wrapper.append(img);
        }
        shadow.append(wrapper);
        bulk.style.display = "initial";
    }

    wrapper.addEventListener("click", (e) => {
        /**
         * @type {HTMLImageElement}
         */
        const target = e.target;
        if (!target.classList.contains("pic")) return;
        if (target.dataset.toggle === "0") {
            target.dataset.toggle = "1";
            selectedCount.innerText = Number(selectedCount.innerText) + 1;
        } else {
            target.dataset.toggle = "0";
            selectedCount.innerText = Number(selectedCount.innerText) - 1;
        }
    });
    bulk.addEventListener("click", (e) => {
        e.stopPropagation();
    });
    cancelButton.addEventListener("click", () => {
        bulk.style.display = "none";
    });

    window.addEventListener("click", () => (bulk.style.display = "none"));

    bulk.style.display === "none" && scrapImages();
    document.body.append(bulk);

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.context === "action") {
            console.log("action");
            sendResponse(true);
            scrapImages();
            return;
        }
    });
})();
