// function getPrevElement(){}
// function getNextElement(){}

export function initTouchEvents() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    const preview = document.querySelector(".preview") as HTMLDivElement;
    const header = document.querySelector(".header") as HTMLDivElement;

    function checkDirection() {
        if (Math.abs(touchStartX - touchEndX) > 40) {
            if (touchStartX > touchEndX) {
                // console.log(
                //     document.querySelector(`[data-id='${e.target?.dataset.id}']`)
                //         ?.parentNode?.previousElementSibling.firstChild
                // );
            }
            if (touchStartX < touchEndX) {
                // console.log(
                //     document.querySelector(`[data-id='${e.target?.dataset.id}']`)
                //         ?.parentNode?.nextElementSibling.firstChild
                // );
                // console.log("swipe right");
            }
        }
        if (Math.abs(touchStartY - touchEndY) > 30) {
            if (touchStartY < touchEndY) {
                console.log("swipe down");
                preview.hidden = true;
            }
            if (touchStartY > touchEndY) {
                console.log("swipe up");
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

    header.addEventListener("click", () => {
        const mainWrapper = document.querySelector(
            ".main-wrapper"
        ) as HTMLDivElement;
        mainWrapper.scrollTo(0, 0);
    });
    header.addEventListener("touchstart", () => {
        const mainWrapper = document.querySelector(
            ".main-wrapper"
        ) as HTMLDivElement;
        mainWrapper.scrollTo(0, 0);
    });
}

export function initMenuEvents() {
    const refresh = document.querySelector(
        ".refresh-button"
    ) as HTMLButtonElement;
    refresh.onclick = (e) => {
        e.stopPropagation();
        window.dispatchEvent(new Event("refresh"));
    };
}
