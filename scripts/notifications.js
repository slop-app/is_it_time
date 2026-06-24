(() => {
  const noticeModal = document.getElementById("noticeModal");
  const noticeTitle = document.getElementById("noticeTitle");
  const noticeMessage = document.getElementById("noticeMessage");
  const noticeMark = document.getElementById("noticeMark");
  const noticeConfirmButton = document.getElementById("noticeConfirmButton");
  const noticeCancelButton = document.getElementById("noticeCancelButton");
  let noticeConfirmAction = null;
  let noticeLastFocus = null;

  function closeNotice() {
    noticeModal.hidden = true;
    noticeConfirmAction = null;

    if (noticeLastFocus && typeof noticeLastFocus.focus === "function") {
      noticeLastFocus.focus();
    }
  }

  function showNotice({
    title,
    message,
    mark = "!",
    confirmLabel = "OK",
    cancelLabel = "",
    onConfirm = null
  }) {
    noticeLastFocus = document.activeElement;
    noticeTitle.textContent = title;
    noticeMessage.textContent = message;
    noticeMark.textContent = mark;
    noticeConfirmButton.textContent = confirmLabel;
    noticeCancelButton.textContent = cancelLabel;
    noticeCancelButton.hidden = !cancelLabel;
    noticeConfirmAction = onConfirm;
    noticeModal.hidden = false;
    noticeConfirmButton.focus();
  }

  noticeConfirmButton.addEventListener("click", () => {
    const action = noticeConfirmAction;
    closeNotice();

    if (action) action();
  });

  noticeCancelButton.addEventListener("click", closeNotice);
  noticeModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-notice-close]")) closeNotice();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !noticeModal.hidden) closeNotice();
  });

  window.showNotice = showNotice;
})();
