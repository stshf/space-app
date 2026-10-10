// switch date view, list view
const dateViewBtn = document.getElementById("date-view-button")
const listViewBtn = document.getElementById("list-view-button")
const apodBtn = document.getElementById("apod-button")
const apodsListBtn = document.getElementById("apods-list-button")

function selectDateViewButton() {
    apodBtn.classList.remove("hidden")
    apodsListBtn.classList.add("hidden")

    dateViewBtn.classList.add("bg-sky-500")
    listViewBtn.classList.remove("bg-sky-500")
}

function selectListViewButton() {
    apodBtn.classList.add("hidden")
    apodsListBtn.classList.remove("hidden")

    dateViewBtn.classList.remove("bg-sky-500")
    listViewBtn.classList.add("bg-sky-500")
}

// 初期状態は date View Button
selectDateViewButton()

window.selectDateViewButton = selectDateViewButton;
window.selectListViewButton = selectListViewButton;