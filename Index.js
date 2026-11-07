const modePicker = document.querySelector("#mode-picker");
const modeTrigger = document.querySelector("#mode-trigger");
const currentModeImage = document.querySelector("#current-mode-image");
const modeChoices = document.querySelector("#mode-choices");
const choices = document.querySelectorAll(".mode-choice");
const searchInput = document.querySelector("#SearchInp");
const searchForm = document.querySelector("#search-form");
const searchButton = document.querySelector("#Search");
const searchError = document.querySelector("#search-error");
const searchStatus = document.querySelector("#search-status");
const resultsContent = document.querySelector("#results-content");
const emptyState = document.querySelector("#empty-state");
const questionHeading = document.querySelector("#original-question");
const selectedModeNote = document.querySelector("#selected-mode-note");
const homeLink = document.querySelector("#home-link");
const resultSections = document.querySelectorAll(".result-section");
const pageParams = new URLSearchParams(window.location.search);
let selectedMode = "Wisdom Library";

function selectMode(mode) {
    const selectedChoice = Array.from(choices).find((choice) => choice.dataset.mode === mode);
    if (!selectedChoice) {
        return;
    }

    selectedMode = mode;
    currentModeImage.src = selectedChoice.dataset.image;
    modeTrigger.setAttribute("aria-label", `Choose a mode. Current mode: ${mode}`);

    choices.forEach((choice) => {
        const isSelected = choice.dataset.mode === mode;
        choice.classList.toggle("is-selected", isSelected);
        choice.setAttribute("aria-pressed", String(isSelected));
    });

    if (resultsContent) {
        resultSections.forEach((section) => {
            section.classList.toggle("is-selected", section.dataset.resultMode === mode);
        });
        selectedModeNote.textContent = `Selected mode: ${mode}`;

        const params = new URLSearchParams(window.location.search);
        params.set("mode", mode);
        window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
        homeLink.href = `HomePage.html?mode=${encodeURIComponent(mode)}`;
    }
}

function setModePickerOpen(isOpen) {
    modePicker.classList.toggle("is-open", isOpen);
    modeTrigger.setAttribute("aria-expanded", String(isOpen));
    modeChoices.inert = !isOpen;
}

if (pageParams.has("mode")) {
    selectMode(pageParams.get("mode"));
}

modeTrigger.addEventListener("click", () => {
    setModePickerOpen(modeTrigger.getAttribute("aria-expanded") !== "true");
});

choices.forEach((choice) => {
    choice.addEventListener("click", () => {
        selectMode(choice.dataset.mode);
        setModePickerOpen(false);
    });
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modeTrigger.getAttribute("aria-expanded") === "true") {
        setModePickerOpen(false);
        modeTrigger.focus();
    }
});

if (searchForm) {
    searchForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const question = searchInput.value;
        if (!question.trim()) {
            searchError.textContent = "Please enter a question before searching.";
            searchError.hidden = false;
            searchInput.setAttribute("aria-invalid", "true");
            searchInput.focus();
            return;
        }

        searchError.hidden = true;
        searchError.textContent = "";
        searchInput.setAttribute("aria-invalid", "false");
        searchInput.disabled = true;
        searchButton.disabled = true;
        searchButton.setAttribute("aria-busy", "true");
        searchButton.textContent = "Searching...";
        searchStatus.textContent = "Opening your results...";
        searchStatus.hidden = false;

        const params = new URLSearchParams({
            question,
            mode: selectedMode
        });
        window.setTimeout(() => {
            window.location.href = `Results.html?${params}`;
        }, 150);
    });

    searchInput.addEventListener("input", () => {
        if (!searchError.hidden) {
            searchError.hidden = true;
            searchInput.setAttribute("aria-invalid", "false");
        }
    });
}

if (resultsContent && emptyState) {
    const question = pageParams.get("question");
    if (question && question.trim()) {
        questionHeading.textContent = question;
        resultsContent.hidden = false;
    } else {
        emptyState.hidden = false;
    }
}

document.addEventListener("click", (event) => {
    if (!modePicker.contains(event.target)) {
        setModePickerOpen(false);
    }
});