import { signUserOut, togglePreview } from "./utils";

export function initTouchEvents() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    const preview = document.querySelector(".preview") as HTMLDivElement;
    const header = document.querySelector(".header") as HTMLDivElement;

    function checkDirection() {
        if (Math.abs(touchStartX - touchEndX) > 40) {
            //swipe left
            if (touchStartX > touchEndX) {
                // console.log(
                //     document.querySelector(`[data-id='${e.target?.dataset.id}']`)
                //         ?.parentNode?.previousElementSibling.firstChild
                // );
            }
            if (touchStartX < touchEndX) {
                //swipe right
                // console.log(
                //     document.querySelector(`[data-id='${e.target?.dataset.id}']`)
                //         ?.parentNode?.nextElementSibling.firstChild
                // );
            }
        }
        if (Math.abs(touchStartY - touchEndY) > 40) {
            // swipe down
            if (touchStartY < touchEndY) {
                preview.hidden = true;
            }
            // swipe up
            if (touchStartY > touchEndY) {
                preview.hidden = true;
            }
        }
    }
    preview.addEventListener("touchstart", (e) => {
        e.stopPropagation();
        if ((e.target as HTMLImageElement).classList.contains("preview-img")) {
            if (e.changedTouches.length === 0) return;
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        }
    });
    preview.addEventListener("touchend", (e) => {
        e.stopPropagation();
        if ((e.target as HTMLImageElement).classList.contains("preview-img")) {
            if (e.changedTouches.length === 0) return;
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            checkDirection();
        }
    });

    preview.addEventListener("touchmove", (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
    header.addEventListener("click", () => {
        const main = document.querySelector(".main-wrapper") as HTMLDivElement;
        main.scrollTo(0, 0);
    });
}

export function initMenuEvents() {
    const refresh = document.querySelector(
        ".refresh-button"
    ) as HTMLButtonElement;
    const signoutButton = document.querySelector(
        ".signout-button"
    )! as HTMLDivElement;
    refresh.addEventListener("click", (e) => {
        e.stopPropagation();
        window.dispatchEvent(new Event("refresh"));
    });
    signoutButton.addEventListener("click", signUserOut);
}

export function initPreviewClose() {
    const preview = document.querySelector(".preview") as HTMLDivElement;
    const previewClose = document.querySelector(
        ".preview-close"
    ) as HTMLDivElement;
    previewClose.addEventListener("click", () => {
        preview.hidden = true;
    });
}

export function initPreviewFull() {
    const preview = document.querySelector(".preview") as HTMLDivElement;
    const previewExpand = document.querySelector(
        ".preview-expand"
    ) as HTMLDivElement;
    previewExpand.addEventListener("click", () => {
        preview.classList.toggle("preview-full");
    });
}

export function initPreviewEvents() {
    initPreviewClose();
    initPreviewFull();
}

function initImgEvents(childWorker: Worker) {
    const imgsEle = document.querySelector(".imgs") as HTMLDivElement;
    imgsEle?.addEventListener("click", async (e) => {
        const target = e.target as HTMLImageElement;
        if (!target.classList.contains("img")) return;
        const dataset = target.dataset;
        const previewImg = document.querySelector(
            ".preview-img"
        ) as HTMLImageElement;
        if (previewImg.dataset.id === dataset.id) {
            togglePreview();
            return;
        }
        previewImg.src = target.src;
        previewImg.dataset.id = target.dataset.id;
        togglePreview();
        if (dataset.url) {
            previewImg.src = dataset.url;
        } else {
            const token = window.localStorage.getItem("token")!;
            childWorker.postMessage({
                context: "FETCH_IMAGE",
                id: dataset.id,
                token,
            });
        }
    });
}

export function initMainEvents(childWorker: Worker) {
    initTouchEvents();
    initImgEvents(childWorker);
    initPreviewEvents();
}
