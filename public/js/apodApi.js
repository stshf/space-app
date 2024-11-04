import {
    apodContainer,
    clearApodContainer,
    clearApodsContainer,
    createAPODCardHTML,
    createAPODHTML, 
    displayErrorMessage,
} from "./apodRenderer.js";

async function fetchAPOD() {
    let url = new URL("http://localhost:8000/api/apod");
    const date = document.getElementById("date").value
    const params = new URLSearchParams({
        date: date
    })
    if (date != "") {
        url.search = params.toString();
    }
    console.log(url)

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`response status: ${response.status}`);
        }

        // clear apods container
        clearApodsContainer()

        const json = await response.json();
        const apod = json.apod;
        apodContainer.innerHTML = createAPODHTML(apod)
    } catch (error) {
        displayErrorMessage("予期せぬエラーが発生しました。再度お試しください。");
        console.error(error.message);
    }
}

async function fetchAPODs() {
    let url = new URL("http://localhost:8000/api/apods/random");
    const date = ""
    const params = new URLSearchParams({
        date: date
    })
    if (date != "") {
        url.search = params.toString();
    }
    console.log(url)

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`response status: ${response.status}`);
        }

        // clear apod container
        clearApodContainer()

        const json = await response.json();
        const apods = json.apods;
        createAPODCardHTML(apods)
    } catch (error) {
        console.error(error.message);
    }
}

window.fetchAPOD = fetchAPOD;
window.fetchAPODs = fetchAPODs;