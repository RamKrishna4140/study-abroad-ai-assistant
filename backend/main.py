from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from fastapi import FastAPI, UploadFile, File, Form
from pypdf import PdfReader

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma

import os
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel
from pymongo import MongoClient

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

mongo_client = MongoClient(os.getenv("MONGO_URI"))
mongo_client.admin.command("ping")
print("MongoDB connected successfully")
db = mongo_client["study_abroad_ai"]
chats_collection = db["chats"]

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
        chats_collection
        .find({"session_id": request.session_id})
        .sort("created_at", -1)
        .limit(5)
    )

    previous_chats.reverse()

    system_prompt = """
    You are an AI Study Abroad Assistant created for students.

        Your job:
- Help students with study abroad guidance
- Focus mainly on Italy and Europe
- Explain university admissions clearly
- Guide students about eligibility, scholarships, visa process, SOP, CV, and English-taught programs

Rules:
- Be professional and student-friendly
- Give short and practical answers
- Use bullet points when helpful
- Do not guarantee admission, scholarship, or visa approval
- Mention that final eligibility depends on official university requirements
- If the user types random or unclear text, politely ask them to clarify
"""

    messages = [
    {
        "role": "system",
        "content": system_prompt
    }
]

    for chat_item in previous_chats:
        messages.append({
            "role": "user",
            "content": chat_item["user_message"]
        })

        messages.append({
            "role": "assistant",
            "content": chat_item["assistant_reply"]
        })

    messages.append({
        "role": "user",
        "content": request.message
    })

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=messages
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
    print("PDF UPLOAD SESSION:", session_id)
    try:
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
            chunk_size=500,
            chunk_overlap=50
        )

        chunks = text_splitter.split_text(extracted_text)

        pdf_chunks_collection = db["pdf_chunks"]

        pdf_chunks_collection.delete_many({
            "session_id": session_id
        })

        for index, chunk in enumerate(chunks):
            pdf_chunks_collection.insert_one({
                "session_id": session_id,
                "source": file.filename,
                "chunk_index": index,
                "text": chunk,
                "created_at": datetime.utcnow()
            })

        chats_collection.insert_one({
        "session_id": session_id,
        "user_message": f"Uploaded PDF: {file.filename}",
        "assistant_reply": f"PDF uploaded successfully: {file.filename}",
        "created_at": datetime.utcnow()
})

        return {
            "message": "PDF uploaded and chunks saved successfully",
            "filename": file.filename,
            "session_id": session_id,
            "chunks_created": len(chunks)
        }

    except Exception as e:
        return {"error": str(e)}
    

@app.post("/ask-pdf")
async def ask_pdf(request: ChatRequest):
    print("ASK PDF SESSION:", request.session_id)
    try:
        pdf_chunks_collection = db["pdf_chunks"]

        chunks = list(
            pdf_chunks_collection
            .find({"session_id": request.session_id})
            .sort("chunk_index", 1)
            .limit(12)
        )

        if not chunks:
            return {
                "reply": "No PDF found for this chat. Please upload a PDF first, then ask your question in PDF Mode."
            }

        context = ""

        for chunk in chunks:
            context += chunk["text"] + "\n\n"

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
                    "content": "You answer questions strictly from the uploaded PDF context only."
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

        return {"reply": reply}

    except Exception as e:
        return {"error": str(e)}

@app.get("/sessions/{session_id}")
def get_session_messages(session_id: str):
    chats = list(
        chats_collection
        .find({"session_id": session_id})
        .sort("created_at", 1)
    )

    messages = []

    for chat in chats:
        messages.append({
            "role": "user",
            "content": chat["user_message"]
        })

        messages.append({
            "role": "assistant",
            "content": chat["assistant_reply"]
        })

    return {
        "session_id": session_id,
        "messages": messages
    }
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

@app.get("/")
def home():
    return {"message": "AI Study Abroad Backend Running"}


@app.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    chats_result = chats_collection.delete_many({"session_id": session_id})

    pdf_chunks_collection = db["pdf_chunks"]
    pdf_result = pdf_chunks_collection.delete_many({"session_id": session_id})

    return {
        "message": "Session deleted successfully",
        "deleted_chats": chats_result.deleted_count,
        "deleted_pdf_chunks": pdf_result.deleted_count
    }