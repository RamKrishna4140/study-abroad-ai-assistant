import os
from datetime import datetime

import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel
from pymongo import MongoClient
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

mongo_client = MongoClient(os.getenv("MONGO_URI"))
mongo_client.admin.command("ping")
print("MongoDB connected successfully")

db = mongo_client["study_abroad_ai"]
chats_collection = db["chats"]
pdf_chunks_collection = db["pdf_chunks"]

embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default-session"


@app.get("/")
def home():
    return {"message": "AI Study Abroad Backend Running"}


@app.post("/chat")
def chat(request: ChatRequest):
    previous_chats = list(
        chats_collection.find({"session_id": request.session_id})
        .sort("created_at", -1)
        .limit(5)
    )

    previous_chats.reverse()

    system_prompt = """
You are an AI Study Abroad Assistant.

Your job:
- Help students with study abroad guidance
- Focus mainly on Italy and Europe
- Explain admissions, eligibility, scholarships, visa, SOP, CV, and English-taught programs

Rules:
- Be professional and student-friendly
- Give short and practical answers
- Use bullet points when helpful
- Do not guarantee admission, scholarship, or visa approval
- Mention that final eligibility depends on official university requirements
"""

    messages = [{"role": "system", "content": system_prompt}]

    for chat_item in previous_chats:
        messages.append({"role": "user", "content": chat_item["user_message"]})
        messages.append({"role": "assistant", "content": chat_item["assistant_reply"]})

    messages.append({"role": "user", "content": request.message})

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.4,
    )

    reply = completion.choices[0].message.content

    chats_collection.insert_one({
        "session_id": request.session_id,
        "user_message": request.message,
        "assistant_reply": reply,
        "created_at": datetime.utcnow()
    })

    return {"reply": reply}


@app.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    session_id: str = Form(...)
):
    try:
        print("PDF UPLOAD SESSION:", session_id)

        os.makedirs("uploads", exist_ok=True)
        file_path = f"uploads/{file.filename}"

        with open(file_path, "wb") as f:
            f.write(await file.read())

        pdf_reader = PdfReader(file_path)
        extracted_text = ""

        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=700,
            chunk_overlap=100
        )

        chunks = text_splitter.split_text(extracted_text)

        pdf_chunks_collection.delete_many({"session_id": session_id})

        for index, chunk in enumerate(chunks):
            embedding = embedding_model.encode(chunk).tolist()

            pdf_chunks_collection.insert_one({
                "session_id": session_id,
                "source": file.filename,
                "chunk_index": index,
                "text": chunk,
                "embedding": embedding,
                "created_at": datetime.utcnow()
            })

        chats_collection.insert_one({
            "session_id": session_id,
            "user_message": f"Uploaded PDF: {file.filename}",
            "assistant_reply": f"PDF uploaded successfully: {file.filename}",
            "created_at": datetime.utcnow()
        })

        return {
            "message": "PDF uploaded and embedded successfully",
            "filename": file.filename,
            "session_id": session_id,
            "chunks_created": len(chunks)
        }

    except Exception as e:
        return {"error": str(e)}


@app.post("/ask-pdf")
async def ask_pdf(request: ChatRequest):
    try:
        print("ASK PDF SESSION:", request.session_id)

        chunks = list(
            pdf_chunks_collection.find({"session_id": request.session_id})
        )

        if not chunks:
            return {
                "reply": "No PDF found for this chat. Please upload a PDF first, then ask your question in PDF Mode."
            }

        question_embedding = embedding_model.encode(request.message)

        scored_chunks = []

        for chunk in chunks:
            chunk_embedding = np.array(chunk["embedding"])

            similarity = np.dot(question_embedding, chunk_embedding) / (
                np.linalg.norm(question_embedding) * np.linalg.norm(chunk_embedding)
            )

            scored_chunks.append({
                "text": chunk["text"],
                "score": similarity,
                "source": chunk.get("source", "uploaded PDF")
            })

        scored_chunks = sorted(
            scored_chunks,
            key=lambda x: x["score"],
            reverse=True
        )

        top_chunks = scored_chunks[:5]

        context = "\n\n".join([chunk["text"] for chunk in top_chunks])

        prompt = f"""
You are an AI Study Abroad Assistant.

Answer ONLY from the uploaded PDF context below.
If the answer is not available in the PDF, say:
"I could not find this information in the uploaded PDF."

PDF Context:
{context}

Question:
{request.message}
"""

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You answer questions strictly from uploaded PDF context only."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2,
        )

        reply = completion.choices[0].message.content

        chats_collection.insert_one({
            "session_id": request.session_id,
            "user_message": request.message,
            "assistant_reply": reply,
            "created_at": datetime.utcnow()
        })

        return {
            "reply": reply,
            "sources_used": [
                {
                    "source": chunk["source"],
                    "score": float(chunk["score"])
                }
                for chunk in top_chunks
            ]
        }

    except Exception as e:
        return {"error": str(e)}


@app.get("/sessions")
def get_sessions():
    pipeline = [
        {"$sort": {"created_at": -1}},
        {
            "$group": {
                "_id": "$session_id",
                "last_message": {"$first": "$user_message"},
                "last_updated": {"$first": "$created_at"}
            }
        },
        {"$sort": {"last_updated": -1}}
    ]

    sessions = list(chats_collection.aggregate(pipeline))

    return {
        "sessions": [
            {
                "session_id": item["_id"],
                "last_message": item.get("last_message", "Untitled Chat"),
                "last_updated": item["last_updated"].isoformat()
            }
            for item in sessions
        ]
    }


@app.get("/chat-history/{session_id}")
def get_chat_history(session_id: str):
    chats = list(
        chats_collection.find(
            {"session_id": session_id},
            {"_id": 0}
        ).sort("created_at", 1)
    )

    return {"messages": chats}


@app.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    chats_result = chats_collection.delete_many({"session_id": session_id})
    pdf_result = pdf_chunks_collection.delete_many({"session_id": session_id})

    return {
        "message": "Session deleted successfully",
        "deleted_chats": chats_result.deleted_count,
        "deleted_pdf_chunks": pdf_result.deleted_count
    }