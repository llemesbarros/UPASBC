chrome.action.onClicked.addListener(() => {
    const url = "https://www.seulinkexterno.com";  // Substitua pelo link que você deseja abrir
    chrome.tabs.create({ url });
});
