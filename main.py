from typing import Literal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import ollama

app = FastAPI()

main_model = "llama3.2:latest"
failSafe_model = "llama3.1:latest"

AnswerIntructions = {
    "Wisdom Library": (
        "Help the user discover relevant concepts, established wisdom, and useful "
        "directions for further exploration. External source retrieval is not "
        "implemented, so say that clearly. Do not invent quotations, books, authors, "
        "research papers, links, or citations. Distinguish general knowledge from "
        "verifiable source claims."
    ),
    "Simplicity": (
        "Explain the answer clearly and concisely for someone unfamiliar with the "
        "subject. Explain necessary terminology using simple language."
    ),
    "Different Perspectives": (
        "Present multiple meaningful perspectives. Explain why different people or "
        "disciplines may approach the question differently. Separate established "
        "facts from interpretations and unsupported opinions."
    ),
}

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST"],
    allow_headers=["*"],
)


class QuestionRequest(BaseModel):
    question: str
    mode: Literal["Wisdom Library", "Simplicity", "Different Perspectives"] = "Wisdom Library"


def generate_answer(question: str, mode: str) -> tuple[str, str]:
    messages = [
        {"role": "system", "content": AnswerIntructions[mode]},
        {"role": "user", "content": question},
    ]

    model = main_model
    try:
        response = ollama.chat(model=model, messages=messages)
    except ConnectionError as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not connect to Ollama. Make sure Ollama is running locally.",
        ) from exc
    except ollama.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Ollama could not process the request: {exc}",
        ) from exc
    except ollama.ResponseError as exc:
        if exc.status_code != 404:
            raise HTTPException(
                status_code=502,
                detail=f"Ollama could not generate a response: {exc.error}",
            ) from exc

        model = failSafe_model
        try:
            response = ollama.chat(model=model, messages=messages)
        except ConnectionError as fallback_exc:
            raise HTTPException(
                status_code=503,
                detail="Could not connect to Ollama. Make sure Ollama is running locally.",
            ) from fallback_exc
        except ollama.RequestError as fallback_exc:
            raise HTTPException(
                status_code=502,
                detail=f"Ollama could not process the request: {fallback_exc}",
            ) from fallback_exc
        except ollama.ResponseError as fallback_exc:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Neither configured Ollama model is available. Run "
                    "`ollama pull llama3.2:latest` and `ollama pull llama3.1:latest`."
                ),
            ) from fallback_exc

    answer = response.message.content.strip()
    if not answer:
        raise HTTPException(
            status_code=502,
            detail="Ollama returned an empty response. Please try again.",
        )

    return answer, model


@app.post("/question")
def submit_question(request: QuestionRequest) -> dict[str, str]:
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=422, detail="Question cannot be empty.")

    answer, model = generate_answer(question, request.mode)
    return {
        "question": question,
        "mode": request.mode,
        "answer": answer,
        "model": model,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
