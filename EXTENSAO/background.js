chrome.action.onClicked.addListener(() => {
    const url = "https://llemesbarros.github.io/UPASBC/MEDICAMENTOS";
    chrome.tabs.create({ url });
});
