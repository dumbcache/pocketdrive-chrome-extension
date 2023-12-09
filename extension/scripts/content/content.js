import { createElement, createImgElement, initBulk } from "./helper.js";

const init = async (sendResponse) => {
    try {
        /**************** Inserting scripts *****************/
        const krab = createElement("div", [["id", "krab-ext"]]);
        krab.style.background = "none";
        krab.style.position = "fixed";
        krab.style.width = "fit-content";
        const shadow = krab.attachShadow({ mode: "open" });

        const styles = chrome.runtime.getURL("scripts/content/content.css");
        const styleElement = createElement("link", [
            ["rel", "stylesheet"],
            ["href", styles],
        ]);
        shadow.append(styleElement);

        /**************** Resource Urls *****************/
        const tempBulk = new Set();
        /**************** Element declarations *****************/

        const { bulk, bulkCancelButton } = initBulk();

        shadow.append(bulk);
        document.body.append(krab);

        window.addEventListener("click", () => {
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
            if (window.location.host === "band.us") {
                const ele = document.querySelectorAll(".preventSaveContent");
                for (let i of ele) {
                    i.style.display = "none";
                }
                console.log(ele);
            }
        });

        /**************** Popup toggler *****************/

        bulkCancelButton.addEventListener("click", () => {
            bulk.style.display = "none";
            tempBulk.clear();
        });

        function scrapImages() {
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

        sendResponse(true);
        /**************** Chrome message handling *****************/
        chrome.runtime.onMessage.addListener((message) => {
            try {
                switch (message.context) {
                    case "ACTION":
                        const bulk = shadow.querySelector(".bulk");
                        if (bulk?.style.display !== "none") return;
                        tempBulk.clear();
                        scrapImages();
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
