import { createCopyrightHTML } from "./apodRenderer.js"

// modal contents settings
export let cardMap = new Map()

function getApodValue(key) {
    // update modal content
    let apod = cardMap.get(key)
    const slideContent = document.getElementById("slide-over-content")

    let copyright = createCopyrightHTML(apod)

    // 画像以外の場合
    if (apod.hdurl === "") {
        slideContent.innerHTML = `
            <iframe
                class="rounded-lg w-full aspect-[16/9] object-cover"
                src=${apod.url}
                alt=${apod.title}>
            </iframe>
            ${copyright}
            <h2 class="text-xl md:text-2xl font-semibold leading-6 text-gray-900 pt-2 md:pt-3" id="slide-over-title">${apod.title}</h2>
            <div class="text-black pt-6 text-sm md:text-xl">
                <p>${apod.explanation}</p>
            </div>
        `
    } else {
        // 画像の場合
        slideContent.innerHTML = `
            <img
                class="rounded-lg w-full aspect-[16/9] object-cover"
                src=${apod.hdurl}
                alt=${apod.title}/>
            ${copyright}
            <h2 class="text-xl md:text-2xl font-semibold leading-6 text-gray-900 pt-2 md:pt-3" id="slide-over-title">${apod.title}</h2>
            <div class="text-black pt-2 md:pt-6 text-sm md:text-xl">
                <p>${apod.explanation}</p>
            </div>
        `
    }

    // open modal
    openModal()
}

window.getApodValue = getApodValue;


// modal settings
const modal = document.querySelector('[role="dialog"]');
const backdrop = document.getElementById("backdrop")
const slideOverPanel = document.getElementById("slide-over-panel")
const closeBtn = document.getElementById("close-modal-button")

closeBtn.onclick = function() {
    hideModal()
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == backdrop) {
    hideModal()
  }
}

function openModal() {
    modal.classList.remove("hidden")
    backdrop.classList.add("opacity-100")
    slideOverPanel.classList.remove("translate-x-full")
    closeBtn.classList.add("opacity-100")
}

function hideModal() {
    modal.classList.add("hidden")
    backdrop.classList.remove("opacity-100")
    slideOverPanel.classList.add("translate-x-full")
    closeBtn.classList.remove("opacity-100")
}
