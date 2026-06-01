# Imports
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from bson import ObjectId
from fastapi.responses import StreamingResponse
import os
from datetime import datetime
from typing import Optional

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
knowledge_collection = db["knowledge_chunks"]
students_collection = db["students"]
timeline_collection = db["student_timeline"]
student_documents_collection = db["student_documents"]
applications_collection = db["student_applications"]
tasks_collection = db["student_tasks"]

embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# FastAPI App
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Auth Setup
SECRET_KEY = "change-this-secret-key-later"
ALGORITHM = "HS256"

# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"

security = HTTPBearer()

# ADMIN_USERNAME = "admin"
# ADMIN_PASSWORD_HASH = pwd_context.hash("admin123")


class ChatRequest(BaseModel):
    message: str
    session_id: str = "default-session"
    document_id: Optional[str] = None
    
class LoginRequest(BaseModel):
    username: str
    password: str


@app.get("/")
def home():
    return {"message": "AI Study Abroad Backend Running"}


@app.get("/")
def home():
    return {"message": "AI Study Abroad Backend Running"}


@app.post("/login")
def login(request: LoginRequest):
    if request.username != ADMIN_USERNAME or request.password != ADMIN_PASSWORD:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password"
        )

    token = create_token({
        "sub": request.username,
        "role": "admin"
    })

    return {
        "access_token": token,
        "token_type": "bearer"
    }


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

    chats_collection.insert_one(
        {
            "session_id": request.session_id,
            "user_message": request.message,
            "assistant_reply": reply,
            "created_at": datetime.utcnow(),
        }
    )

    return {"reply": reply}


# Pydantic Models
class StudentRequest(BaseModel):
    name: str
    phone: str = ""
    email: str = ""
    country: str = "India"
    course: str = ""
    university: str = ""
    status: str = "New Lead"
    notes: str = ""


class ApplicationRequest(BaseModel):
    student_id: str
    university: str
    course: str = ""
    country: str = "Italy"
    status: str = "Applied"
    notes: str = ""


class TaskRequest(BaseModel):
    student_id: str
    title: str
    description: str = ""
    due_date: str = ""
    status: str = "Pending"
    priority: str = "Medium"



# Auth Helper Functions
def create_token(data: dict):
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        return payload

    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@app.post("/chat-stream")
async def chat_stream(request: ChatRequest):
    def generate():
        previous_chats = list(
            chats_collection.find({"session_id": request.session_id})
            .sort("created_at", -1)
            .limit(5)
        )

        previous_chats.reverse()

        messages = [
            {
                "role": "system",
                "content": "You are an AI Study Abroad Assistant. Give practical, clear, student-friendly answers.",
            }
        ]

        for chat_item in previous_chats:
            messages.append({"role": "user", "content": chat_item["user_message"]})
            messages.append(
                {"role": "assistant", "content": chat_item["assistant_reply"]}
            )

        messages.append({"role": "user", "content": request.message})

        full_reply = ""

        stream = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.4,
            stream=True,
        )

        for chunk in stream:
            token = chunk.choices[0].delta.content

            if token:
                full_reply += token
                yield token

        chats_collection.insert_one(
            {
                "session_id": request.session_id,
                "user_message": request.message,
                "assistant_reply": full_reply,
                "created_at": datetime.utcnow(),
            }
        )

    return StreamingResponse(generate(), media_type="text/plain")


@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...), session_id: str = Form(...)):
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
            chunk_size=700, chunk_overlap=100
        )

        chunks = text_splitter.split_text(extracted_text)

        pdf_chunks_collection.delete_many({"session_id": session_id})

        for index, chunk in enumerate(chunks):
            embedding = embedding_model.encode(chunk).tolist()

            pdf_chunks_collection.insert_one(
                {
                    "session_id": session_id,
                    "source": file.filename,
                    "document_id": file.filename,
                    "chunk_index": index,
                    "text": chunk,
                    "embedding": embedding,
                    "created_at": datetime.utcnow(),
                }
            )

        chats_collection.insert_one(
            {
                "session_id": session_id,
                "user_message": f"Uploaded PDF: {file.filename}",
                "assistant_reply": f"PDF uploaded successfully: {file.filename}",
                "created_at": datetime.utcnow(),
            }
        )

        return {
            "message": "PDF uploaded and embedded successfully",
            "filename": file.filename,
            "document_id": file.filename,
            "session_id": session_id,
            "chunks_created": len(chunks),
        }

    except Exception as e:
        return {"error": str(e)}


@app.post("/ask-pdf")
async def ask_pdf(request: ChatRequest):
    try:
        chunks = list(pdf_chunks_collection.find({"session_id": request.session_id}))

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

            scored_chunks.append(
                {
                    "text": chunk["text"],
                    "score": similarity,
                    "source": chunk.get("source", "uploaded PDF"),
                }
            )

        scored_chunks = sorted(scored_chunks, key=lambda x: x["score"], reverse=True)
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
                    "content": "You answer questions strictly from uploaded PDF context only.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )

        reply = completion.choices[0].message.content

        sources_used = [
            {"source": chunk["source"], "score": float(chunk["score"])}
            for chunk in top_chunks
        ]

        chats_collection.insert_one(
            {
                "session_id": request.session_id,
                "user_message": request.message,
                "assistant_reply": reply,
                "sources_used": sources_used,
                "created_at": datetime.utcnow(),
            }
        )

        return {"reply": reply, "sources_used": sources_used}

    except Exception as e:
        return {"error": str(e)}


@app.post("/upload-knowledge")
async def upload_knowledge(file: UploadFile = File(...)):
    try:
        os.makedirs("knowledge_uploads", exist_ok=True)

        file_path = f"knowledge_uploads/{file.filename}"

        with open(file_path, "wb") as f:
            f.write(await file.read())

        pdf_reader = PdfReader(file_path)
        extracted_text = ""

        for page in pdf_reader.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=700, chunk_overlap=100
        )

        chunks = text_splitter.split_text(extracted_text)

        knowledge_collection.delete_many({"document_id": file.filename})

        for index, chunk in enumerate(chunks):
            embedding = embedding_model.encode(chunk).tolist()

            knowledge_collection.insert_one(
                {
                    "source": file.filename,
                    "document_id": file.filename,
                    "chunk_index": index,
                    "text": chunk,
                    "embedding": embedding,
                    "created_at": datetime.utcnow(),
                }
            )

        return {
            "message": "Knowledge document uploaded successfully",
            "filename": file.filename,
            "document_id": file.filename,
            "chunks_created": len(chunks),
        }

    except Exception as e:
        return {"error": str(e)}


@app.post("/ask-knowledge")
async def ask_knowledge(request: ChatRequest):
    try:
        if request.document_id:
            chunks = list(
                knowledge_collection.find({"document_id": request.document_id})
            )
        else:
            chunks = list(knowledge_collection.find())

        if not chunks:
            return {
                "reply": "No matching FLCS knowledge document found. Please upload a knowledge document first."
            }

        question_embedding = embedding_model.encode(request.message)

        scored_chunks = []

        for chunk in chunks:
            chunk_embedding = np.array(chunk["embedding"])

            similarity = np.dot(question_embedding, chunk_embedding) / (
                np.linalg.norm(question_embedding) * np.linalg.norm(chunk_embedding)
            )

            scored_chunks.append(
                {
                    "text": chunk["text"],
                    "score": similarity,
                    "source": chunk.get("source", "FLCS Knowledgebase"),
                }
            )

        scored_chunks = sorted(scored_chunks, key=lambda x: x["score"], reverse=True)
        top_chunks = scored_chunks[:6]

        context = "\n\n".join([chunk["text"] for chunk in top_chunks])

        prompt = f"""
You are FLCS AI Counselor.

Use ONLY the FLCS knowledgebase context below to answer the student's question.

If the answer is not available in the selected knowledge document, say:
"I could not find this in the selected FLCS knowledge document."

FLCS Knowledgebase Context:
{context}

Student Question:
{request.message}
"""

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are FLCS AI Counselor. Answer based only on the selected FLCS knowledge document context.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )

        reply = completion.choices[0].message.content

        sources_used = [
            {"source": chunk["source"], "score": float(chunk["score"])}
            for chunk in top_chunks
        ]

        chats_collection.insert_one(
            {
                "session_id": request.session_id,
                "user_message": request.message,
                "assistant_reply": reply,
                "sources_used": sources_used,
                "created_at": datetime.utcnow(),
            }
        )

        return {"reply": reply, "sources_used": sources_used}

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
                "last_updated": {"$first": "$created_at"},
            }
        },
        {"$sort": {"last_updated": -1}},
    ]

    sessions = list(chats_collection.aggregate(pipeline))

    return {
        "sessions": [
            {
                "session_id": item["_id"],
                "last_message": item.get("last_message", "Untitled Chat"),
                "last_updated": item["last_updated"].isoformat(),
            }
            for item in sessions
        ]
    }


@app.get("/knowledge-documents")
def get_knowledge_documents():
    pipeline = [
        {
            "$group": {
                "_id": "$document_id",
                "source": {"$first": "$source"},
                "chunks": {"$sum": 1},
                "uploaded_at": {"$max": "$created_at"},
            }
        },
        {"$sort": {"uploaded_at": -1}},
    ]

    docs = list(knowledge_collection.aggregate(pipeline))

    return {
        "documents": [
            {
                "document_id": doc["_id"],
                "source": doc["source"],
                "chunks": doc["chunks"],
                "uploaded_at": doc["uploaded_at"].isoformat(),
            }
            for doc in docs
        ]
    }


@app.delete("/knowledge-documents/{document_id}")
def delete_knowledge_document(document_id: str):
    result = knowledge_collection.delete_many({"document_id": document_id})

    return {
        "message": "Knowledge document deleted successfully",
        "deleted_chunks": result.deleted_count,
    }


@app.get("/chat-history/{session_id}")
def get_chat_history(session_id: str):
    chats = list(
        chats_collection.find({"session_id": session_id}, {"_id": 0}).sort(
            "created_at", 1
        )
    )

    return {"messages": chats}


@app.delete("/sessions/{session_id}")
def delete_session(session_id: str):
    chats_result = chats_collection.delete_many({"session_id": session_id})
    pdf_result = pdf_chunks_collection.delete_many({"session_id": session_id})

    return {
        "message": "Session deleted successfully",
        "deleted_chats": chats_result.deleted_count,
        "deleted_pdf_chunks": pdf_result.deleted_count,
    }


@app.post("/students")
def create_student(student: StudentRequest):
    student_data = student.dict()
    student_data["created_at"] = datetime.utcnow()
    student_data["updated_at"] = datetime.utcnow()

    result = students_collection.insert_one(student_data)

    return {
        "message": "Student created successfully",
        "student_id": str(result.inserted_id),
    }


@app.get("/students")
def get_students():
    students = list(students_collection.find().sort("created_at", -1))

    formatted_students = []

    for student in students:
        student["_id"] = str(student["_id"])
        formatted_students.append(student)

    return {"students": formatted_students}


@app.get("/students/{student_id}")
def get_student(student_id: str):
    student = students_collection.find_one({"_id": ObjectId(student_id)})

    if not student:
        return {"error": "Student not found"}

    student["_id"] = str(student["_id"])

    return {"student": student}


@app.put("/students/{student_id}")
def update_student(student_id: str, student: StudentRequest):
    update_data = student.dict()
    update_data["updated_at"] = datetime.utcnow()

    result = students_collection.update_one(
        {"_id": ObjectId(student_id)}, {"$set": update_data}
    )

    return {
        "message": "Student updated successfully",
        "modified_count": result.modified_count,
    }


@app.delete("/students/{student_id}")
def delete_student(student_id: str):
    result = students_collection.delete_one({"_id": ObjectId(student_id)})

    return {
        "message": "Student deleted successfully",
        "deleted_count": result.deleted_count,
    }


@app.get("/dashboard-stats")
def dashboard_stats():
    total_students = students_collection.count_documents({})
    offer_letters = students_collection.count_documents(
        {"status": "Offer Letter Received"}
    )
    visa_approved = students_collection.count_documents({"status": "Visa Approved"})
    pending = students_collection.count_documents({"status": "Pending"})

    return {
        "total_students": total_students,
        "offer_letters": offer_letters,
        "visa_approved": visa_approved,
        "pending": pending,
    }


class TimelineRequest(BaseModel):
    student_id: str
    title: str
    description: str = ""


@app.post("/student-timeline")
def add_timeline_event(event: TimelineRequest):
    event_data = event.dict()
    event_data["created_at"] = datetime.utcnow()

    timeline_collection.insert_one(event_data)

    return {"message": "Timeline event added successfully"}


@app.get("/student-timeline/{student_id}")
def get_timeline(student_id: str):
    events = list(
        timeline_collection.find({"student_id": student_id}, {"_id": 0}).sort(
            "created_at", -1
        )
    )

    return {"events": events}


@app.post("/student-documents/{student_id}")
async def upload_student_document(
    student_id: str, file: UploadFile = File(...), document_type: str = Form(...)
):
    try:
        os.makedirs("student_documents", exist_ok=True)

        file_path = f"student_documents/{student_id}_{file.filename}"

        with open(file_path, "wb") as f:
            f.write(await file.read())

        student_documents_collection.insert_one(
            {
                "student_id": student_id,
                "document_type": document_type,
                "filename": file.filename,
                "file_path": file_path,
                "uploaded_at": datetime.utcnow(),
            }
        )

        return {"message": "Document uploaded successfully", "filename": file.filename}

    except Exception as e:
        return {"error": str(e)}


@app.get("/student-documents/{student_id}")
def get_student_documents(student_id: str):
    documents = list(
        student_documents_collection.find({"student_id": student_id}, {"_id": 0}).sort(
            "uploaded_at", -1
        )
    )

    return {"documents": documents}


@app.post("/crm-chat")
def crm_chat(request: ChatRequest):
    try:
        students = list(students_collection.find({}, {"_id": 0}))

        documents = list(student_documents_collection.find({}, {"_id": 0}))

        timelines = list(timeline_collection.find({}, {"_id": 0}))

        applications = list(applications_collection.find({}, {"_id": 0}))

        tasks = list(tasks_collection.find({}, {"_id": 0}))

        crm_context = f"""
Students:
{students}

Documents:
{documents}

Timelines:
{timelines}

applications:
{applications}

Tasks:
{tasks}

"""

        prompt = f"""
You are FLCS CRM Assistant.

Use the CRM data below to answer the user's question.

Rules:
- Answer only from CRM data.
- If information is missing, say it is not available.
- Be concise and practical.
- Use bullet points when helpful.

CRM Data:
{crm_context}

User Question:
{request.message}
"""

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are FLCS CRM Assistant. You answer from student CRM data only.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )

        reply = completion.choices[0].message.content

        return {"reply": reply}

    except Exception as e:
        return {"error": str(e)}


@app.post("/student-applications")
def add_student_application(application: ApplicationRequest):
    application_data = application.dict()
    application_data["created_at"] = datetime.utcnow()
    application_data["updated_at"] = datetime.utcnow()

    result = applications_collection.insert_one(application_data)

    timeline_collection.insert_one(
        {
            "student_id": application.student_id,
            "title": f"Application added: {application.university}",
            "description": f"Course: {application.course} | Status: {application.status}",
            "created_at": datetime.utcnow(),
        }
    )

    return {
        "message": "Application added successfully",
        "application_id": str(result.inserted_id),
    }


@app.get("/student-applications/{student_id}")
def get_student_applications(student_id: str):
    applications = list(
        applications_collection.find({"student_id": student_id}).sort("created_at", -1)
    )

    formatted_applications = []

    for application in applications:
        application["_id"] = str(application["_id"])
        formatted_applications.append(application)

    return {"applications": formatted_applications}


@app.put("/student-applications/{application_id}")
def update_student_application(application_id: str, application: ApplicationRequest):
    update_data = application.dict()
    update_data["updated_at"] = datetime.utcnow()

    result = applications_collection.update_one(
        {"_id": ObjectId(application_id)}, {"$set": update_data}
    )

    timeline_collection.insert_one(
        {
            "student_id": application.student_id,
            "title": f"Application updated: {application.university}",
            "description": f"New Status: {application.status}",
            "created_at": datetime.utcnow(),
        }
    )

    return {
        "message": "Application updated successfully",
        "modified_count": result.modified_count,
    }


@app.delete("/student-applications/{application_id}")
def delete_student_application(application_id: str):
    result = applications_collection.delete_one({"_id": ObjectId(application_id)})

    return {
        "message": "Application deleted successfully",
        "deleted_count": result.deleted_count,
    }


@app.get("/application-stats")
def application_stats():
    total_applications = applications_collection.count_documents({})
    applied = applications_collection.count_documents({"status": "Applied"})
    under_evaluation = applications_collection.count_documents(
        {"status": "Under Evaluation"}
    )
    offer_letters = applications_collection.count_documents(
        {"status": "Offer Letter Received"}
    )
    visa_approved = applications_collection.count_documents({"status": "Visa Approved"})
    rejected = applications_collection.count_documents({"status": "Rejected"})

    return {
        "total_applications": total_applications,
        "applied": applied,
        "under_evaluation": under_evaluation,
        "offer_letters": offer_letters,
        "visa_approved": visa_approved,
        "rejected": rejected,
    }


@app.get("/all-applications")
def get_all_applications():
    applications = list(applications_collection.find())

    formatted_applications = []

    for application in applications:
        student = students_collection.find_one(
            {"_id": ObjectId(application["student_id"])}
        )

        formatted_applications.append(
            {
                "_id": str(application["_id"]),
                "student_id": application["student_id"],
                "student_name": student["name"] if student else "Unknown Student",
                "university": application.get("university", ""),
                "course": application.get("course", ""),
                "country": application.get("country", ""),
                "status": application.get("status", ""),
                "notes": application.get("notes", ""),
            }
        )

    return {"applications": formatted_applications}


@app.post("/student-tasks")
def create_task(task: TaskRequest):
    task_data = task.dict()
    task_data["created_at"] = datetime.utcnow()
    task_data["updated_at"] = datetime.utcnow()

    result = tasks_collection.insert_one(task_data)

    timeline_collection.insert_one(
        {
            "student_id": task.student_id,
            "title": f"Task added: {task.title}",
            "description": f"Priority: {task.priority} | Due: {task.due_date}",
            "created_at": datetime.utcnow(),
        }
    )

    return {"message": "Task created successfully", "task_id": str(result.inserted_id)}


@app.get("/student-tasks/{student_id}")
def get_student_tasks(student_id: str):
    tasks = list(
        tasks_collection.find({"student_id": student_id}).sort("created_at", -1)
    )

    formatted_tasks = []

    for task in tasks:
        task["_id"] = str(task["_id"])
        formatted_tasks.append(task)

    return {"tasks": formatted_tasks}


@app.put("/student-tasks/{task_id}")
def update_task(task_id: str, task: TaskRequest):
    update_data = task.dict()
    update_data["updated_at"] = datetime.utcnow()

    result = tasks_collection.update_one(
        {"_id": ObjectId(task_id)}, {"$set": update_data}
    )

    timeline_collection.insert_one(
        {
            "student_id": task.student_id,
            "title": f"Task updated: {task.title}",
            "description": f"Status: {task.status} | Priority: {task.priority}",
            "created_at": datetime.utcnow(),
        }
    )

    return {
        "message": "Task updated successfully",
        "modified_count": result.modified_count,
    }


@app.delete("/student-tasks/{task_id}")
def delete_task(task_id: str):
    result = tasks_collection.delete_one({"_id": ObjectId(task_id)})

    return {
        "message": "Task deleted successfully",
        "deleted_count": result.deleted_count,
    }


@app.get("/task-stats")
def task_stats():
    total_tasks = tasks_collection.count_documents({})
    pending_tasks = tasks_collection.count_documents({"status": "Pending"})
    in_progress_tasks = tasks_collection.count_documents({"status": "In Progress"})
    completed_tasks = tasks_collection.count_documents({"status": "Completed"})
    high_priority_tasks = tasks_collection.count_documents({"priority": "High"})

    return {
        "total_tasks": total_tasks,
        "pending_tasks": pending_tasks,
        "in_progress_tasks": in_progress_tasks,
        "completed_tasks": completed_tasks,
        "high_priority_tasks": high_priority_tasks,
    }


@app.get("/all-tasks")
def get_all_tasks():
    tasks = list(tasks_collection.find())

    formatted_tasks = []

    for task in tasks:
        student = students_collection.find_one({"_id": ObjectId(task["student_id"])})

        formatted_tasks.append(
            {
                "_id": str(task["_id"]),
                "student_id": task["student_id"],
                "student_name": student["name"] if student else "Unknown Student",
                "title": task.get("title", ""),
                "description": task.get("description", ""),
                "due_date": task.get("due_date", ""),
                "status": task.get("status", ""),
                "priority": task.get("priority", ""),
            }
        )

    return {"tasks": formatted_tasks}


@app.get("/urgent-task-stats")
def urgent_task_stats():
    today = datetime.utcnow().strftime("%Y-%m-%d")

    due_today = tasks_collection.count_documents(
        {"due_date": today, "status": {"$ne": "Completed"}}
    )

    overdue = tasks_collection.count_documents(
        {"due_date": {"$lt": today, "$ne": ""}, "status": {"$ne": "Completed"}}
    )

    return {"due_today": due_today, "overdue": overdue}
