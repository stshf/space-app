const dateInput = document.getElementById("date");

// バリデーションエラー
function validateDate () {
    const date = document.getElementById("date").value;
    const errorMessage = document.getElementById('error-message');
    const [month, day, year] = date.split("/").map(Number);
    const inputDate = new Date(year, month - 1, day);
    const minDate = new Date('1995-06-19');
    const today = new Date();
    const formatDate = `${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}/${today.getFullYear()}`;

    if (!isNaN(inputDate) && minDate <= inputDate && inputDate <= today) {
        errorMessage.classList.add('invisible'); // エラーメッセージを非表示
    } else if (date === '') {
        errorMessage.classList.add('invisible');
    } else {
        errorMessage.innerHTML = `
            06/20/1995 ~ ${formatDate}の範囲内の日付を入力してください
        `;
        errorMessage.classList.remove('invisible'); // エラーメッセージを表示
    }
}

function deleteErrorMessage() {
    const errorMessage = document.getElementById('error-message');
    errorMessage.classList.add('invisible');
}

document.getElementById("list-view-button").addEventListener('click', deleteErrorMessage);
dateInput.addEventListener('blur', validateDate);
dateInput.addEventListener('input', validateDate);
