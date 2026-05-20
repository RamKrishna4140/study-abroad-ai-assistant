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
        model="llama-3.1-8b-instant",
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
                "last_message": item["last_message"],
                "last_updated": item["last_updated"].isoformat()
            }
            for item in sessions
        ]
    }


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
    sessions = chats_collection.distinct("session_id")
    return {"sessions": sessions}


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
    result = chats_collection.delete_many({"session_id": session_id})

    return {
        "message": "Session deleted successfully",
        "deleted_count": result.deleted_count
    }