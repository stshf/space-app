import { cardMap } from "./modalController.js";

export const apodContainer = document.getElementById('apod-container')
export const apodsContainer = document.getElementById('apods-container')

export function createAPODHTML(apod) {

    let copyright = createCopyrightHTML(apod)
    // hdurl = ""の場合は画像以外がresponseで返却されている
    if (apod.hdurl === "") {
        return `
            <h2 class="text-sm md:text-2xl py-2">${apod.title}</h2>
            <iframe
                class="max-w-2xl w-full aspect-[16/9] mx-auto"
                src=${apod.url}
                alt=${apod.title}
                allowfullscreen>
            </iframe>
            ${copyright}
            <p class="text-left text-xs md:text-sm py-2 max-w-2xl">${apod.explanation}</p>
        `;
    }
    else {
        return `
            <h2 class="text-sm md:text-2xl py-2">${apod.title}</h2>
            <img class="py-2 max-w-2xl w-full aspect-[16/9] mx-auto" src="${apod.hdurl}" alt="${apod.title}">
            ${copyright}
            <p class="text-left text-xs md:text-sm py-2 max-w-2xl">${apod.explanation}</p>
        `;
    }
}

export function createAPODCardHTML(apods) {
    // clear apodsContainer.innerHTML
    clearApodsContainer()

    // create Apod card html
    apods.forEach((apod, index) => {
        
        cardMap.set(`card-${index}`, apod)  // set map {key, value} for modal panel
        const card = document.createElement("div")
        card.className = "relative mx-3 mt-6 h-84 flex flex-col self-start rounded-lg overflow-hidden "

        let copyright = createCopyrightHTML(apod)

        // hdurl = ""の場合は画像以外がresponseで返却されている
        if (apod.hdurl === "") {
            console.log("embed")
            // iframeで埋め込みを実装する
            card.innerHTML = `
                <a href="#!" class="hover:opacity-60" onclick="getApodValue('card-${index}')">
                    <iframe
                        class="pointer-events-none rounded-lg w-full aspect-[16/9] object-cover"
                        src=${apod.url}
                        alt=${apod.title}>
                    </iframe>
                    ${copyright}
                    <div class="p-2 md:p-4">
                        <h2 class="mb-2 text-sm md:text-xl font-medium min-h-[3rem] line-clamp-2 leading-tight">
                        ${apod.title}
                        </h2>
                    </div>
                </a>
            `
        } else {
            card.innerHTML = `
                <a href="#!" class="hover:opacity-60" onclick="getApodValue('card-${index}')">
                    <img
                        class="rounded-lg w-full aspect-[16/9] object-cover"
                        src=${apod.hdurl}
                        alt=${apod.title}/>
                    ${copyright}
                    <div class="p-2 md:p-4">
                        <h2 class="mb-2 text-sm md:text-xl font-medium min-h-[3rem] line-clamp-2 leading-tight">
                        ${apod.title}
                        </h2>
                    </div>
                </a>
            `
        }
        apodsContainer.appendChild(card)
    });
}

export function clearApodsContainer() {
    apodsContainer.innerHTML = ``
}

export function clearApodContainer() {
    apodContainer.innerHTML = ``
}

export function displayErrorMessage(message) {
    apodContainer.innerHTML = `
        <p class="text-red-500 text-sm mt-2">${message}</p>
    `;
}

export function createCopyrightHTML(apod) {
    if (apod.copyright === "")
        return ""
    else 
        return `<p class="text-gray-400 text-xs">Image Credit: ${apod.copyright}</p>  <!-- クレジット表記 -->`
}