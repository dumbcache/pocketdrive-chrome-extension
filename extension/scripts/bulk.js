import {
    createElement,
    createImgElement,
    createButtonElement,
    iconPath,
} from "./utils.js";

(() => {
    /**************** Inserting scripts *****************/
    const bulk = createElement("div", [["class", "bulk"]]);
    bulk.style.display = "none";

    const cancelIcon = createImgElement(iconPath("cancelIcon"), "cancel-img");
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
    const wrapper = createElement("div", [["class", "wrapper"]]);
    bulk.append(ele, okButton, cancelButton, wrapper);
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
    bulk.addEventListener("click", (e) => {
        e.stopPropagation();
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
