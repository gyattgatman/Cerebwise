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
const answerContents = document.querySelectorAll(".answer-content");
const answerStatus = document.querySelector("#answer-status");
const answerError = document.querySelector("#answer-error");
const wisdomDisclaimer = document.querySelector("#wisdom-disclaimer");
const pageParams = new URLSearchParams(window.location.search);
let selectedMode = "Wisdom Library";
let activeAnswerRequest = 0;
let demoPassword = null;

// this is for headers, bulletpoints, and markdowns to render 
function renderAnswer(element, markdown) {
    const html = marked.parse(markdown);
    element.innerHTML = DOMPurify.sanitize(html);

    element.querySelectorAll('ul').forEach((ul) => {
    ul.style.listStyleType = 'disc';
    ul.style.paddingLeft = '1.5rem';
  });
}

const generatedAnswers = new Map();

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
            const isSelected = section.dataset.resultMode === mode;
            section.classList.toggle("is-selected", isSelected);
            section.hidden = !isSelected;
        });
        selectedModeNote.textContent = `Selected mode: ${mode}`;
        wisdomDisclaimer.hidden = mode !== "Wisdom Library";

        const params = new URLSearchParams(window.location.search);
        params.set("mode", mode);
        window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
        homeLink.href = `index.html?mode=${encodeURIComponent(mode)}`;
    }
}

function setModePickerOpen(isOpen) {
    modePicker.classList.toggle("is-open", isOpen);
    modeTrigger.setAttribute("aria-expanded", String(isOpen));
    modeChoices.inert = !isOpen;
}

async function requestAnswer(question, mode) {
    const requestId = ++activeAnswerRequest;
    const answerContent = Array.from(answerContents).find(
        (content) => content.dataset.answerMode === mode
    );
    if (!answerContent) {
        answerError.textContent = "Could not find the selected result section.";
        answerError.hidden = false;
        answerStatus.hidden = true;
        return;
    }

    const cachedAnswer = generatedAnswers.get(mode);
    if (cachedAnswer) {
        renderAnswer(answerContent, cachedAnswer.answer);
        answerStatus.textContent = `Response generated with ${cachedAnswer.model}.`;
        answerStatus.hidden = false;
        answerError.hidden = true;
        return;
    }

    answerContent.textContent = "";
    answerError.hidden = true;
    answerStatus.textContent = "Generating your response with Ollama...";
    answerStatus.hidden = false;

    if (demoPassword === null) {
        demoPassword = window.prompt("Enter the demo password to continue.");
        if (demoPassword === null || demoPassword.length === 0) {
            demoPassword = null;
            answerStatus.hidden = true;
            answerError.textContent = "A demo password is required to generate an answer.";
            answerError.hidden = false;
            return;
        }
    }

    try {
        const response = await fetch("https://earth-spring-distributions-vacations.trycloudflare.com/question", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Demo-Password": demoPassword
            },
            body: JSON.stringify({ question, mode })
        });
        if (response.status === 401) {
            if (requestId !== activeAnswerRequest) {
                return;
            }
            demoPassword = null;
            answerStatus.hidden = true;
            answerError.textContent = "That demo password is incorrect. Please try again.";
            answerError.hidden = false;
            return;
        }

        let payload;
        try {
            payload = await response.json();
        } catch {
            throw new Error("The Python API returned an unreadable response.");
        }

        if (!response.ok) {
            throw new Error(
                typeof payload.detail === "string"
                    ? payload.detail
                    : `The Python API returned an error (${response.status}).`
            );
        }
        if (typeof payload.answer !== "string" || !payload.answer.trim()) {
            throw new Error("The Python API returned an empty answer. Please try again.");
        }

        if (requestId !== activeAnswerRequest) {
            return;
        }

        const model = typeof payload.model === "string" ? payload.model : "Ollama";
        const answer = { answer: payload.answer, model };
        generatedAnswers.set(mode, answer);
        renderAnswer(answerContent, answer.answer);
        answerStatus.textContent = `Response generated with ${model}.`;
        answerStatus.hidden = false;
    } catch (error) {
        if (requestId !== activeAnswerRequest) {
            return;
        }

        answerStatus.hidden = true;
        answerError.textContent = error instanceof TypeError
            ? "Could not reach the Python API. Start it with `python main.py` from the BackEnd folder."
            : error instanceof Error
                ? error.message
                : "An unexpected error occurred while generating your response.";
        answerError.hidden = false;
    }
}

selectMode(selectedMode);
if (pageParams.has("mode")) {
    selectMode(pageParams.get("mode"));
}

modeTrigger.addEventListener("click", () => {
    setModePickerOpen(modeTrigger.getAttribute("aria-expanded") !== "true");
});

choices.forEach((choice) => {
    choice.addEventListener("click", () => {
        const modeChanged = selectedMode !== choice.dataset.mode;
        selectMode(choice.dataset.mode);
        setModePickerOpen(false);
        if (resultsContent && modeChanged && resultQuestion) {
            requestAnswer(resultQuestion, selectedMode);
        }
    });
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modeTrigger.getAttribute("aria-expanded") === "true") {
        setModePickerOpen(false);
        modeTrigger.focus();
    }
});

if (searchForm) {
    searchForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const question = searchInput.value.trim();
        if (!question) {
            searchError.textContent = "Please enter a question before searching.";
            searchError.hidden = false;
            searchInput.setAttribute("aria-invalid", "true");
            searchInput.focus();
            return;
        }

        searchError.hidden = true;
        searchError.textContent = "";
        searchInput.setAttribute("aria-invalid", "false");
        const params = new URLSearchParams({
            question,
            mode: selectedMode
        });
        searchButton.disabled = true;
        searchButton.setAttribute("aria-busy", "true");
        searchButton.textContent = "Opening...";
        searchStatus.textContent = "Opening your results...";
        searchStatus.hidden = false;
        window.location.href = `Results.html?${params}`;
    });

    searchInput.addEventListener("input", () => {
        if (!searchError.hidden) {
            searchError.hidden = true;
            searchInput.setAttribute("aria-invalid", "false");
        }
    });
}

const resultQuestion = resultsContent ? (pageParams.get("question") || "").trim() : "";
if (resultsContent && emptyState) {
    if (resultQuestion) {
        questionHeading.textContent = resultQuestion;
        resultsContent.hidden = false;
        requestAnswer(resultQuestion, selectedMode);
    } else {
        emptyState.hidden = false;
    }
}

document.addEventListener("click", (event) => {
    if (!modePicker.contains(event.target)) {
        setModePickerOpen(false);
    }
});
