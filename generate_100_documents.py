import json
import random
from datetime import datetime, timedelta
import uuid

# Sample data for generating documents
tech_topics = [
    "Web Development", "Mobile Development", "Machine Learning", "Artificial Intelligence", 
    "Blockchain", "IoT", "Cloud Computing", "Data Science", "Computer Vision", 
    "Natural Language Processing", "Cybersecurity", "E-Learning", "E-commerce", 
    "Database Management", "Software Engineering", "Network Security", "Mobile Banking",
    "Inventory Management", "Social Media Analytics", "Virtual Reality", "Augmented Reality",
    "Automated Testing", "API Development", "Microservices", "DevOps", "Big Data",
    "Predictive Analytics", "Business Intelligence", "Digital Transformation", "Smart Cities"
]

first_names = [
    "Maria", "Jose", "Juan", "Ana", "Carlos", "Elena", "Miguel", "Carmen", "Roberto", "Sofia",
    "Antonio", "Patricia", "Luis", "Rosa", "Pedro", "Isabel", "Francisco", "Elena", "Manuel", "Teresa",
    "David", "Sarah", "Michael", "Lisa", "John", "Emily", "James", "Rachel", "Daniel", "Kevin",
    "Alex", "Maria Elena", "Jose Antonio", "Carmen", "Roberto", "Sofia", "Antonio", "Patricia"
]

last_names = [
    "Santos", "Cruz", "Reyes", "Villanueva", "Torres", "Mendoza", "Gutierrez", "Martinez", "Garcia", "Lopez",
    "Rodriguez", "Fernandez", "Perez", "Gonzalez", "Sanchez", "Ramirez", "Flores", "Rivera", "Diaz", "Morales",
    "Kim", "Park", "Lee", "Chen", "Wang", "Johnson", "Smith", "Brown", "Davis", "Wilson", "Miller", "Taylor"
]

advisers = [
    "Dr. Roberto Martinez", "Dr. Patricia Ramos", "Dr. Jennifer Lee", "Dr. Maria Garcia", "Dr. Roberto Dela Cruz",
    "Dr. Patricia Wong", "Dr. Carmen Villanueva", "Dr. Jennifer Martinez", "Dr. Michael Lee", "Dr. Roberto Villanueva",
    "Dr. Sarah Wilson", "Dr. Patricia Martinez", "Dr. Michael Wong", "Dr. Jennifer Chen", "Dr. Carmen Torres"
]

faculty_in_charge = [
    "Prof. Elena Gutierrez", "Prof. Miguel Torres", "Prof. David Kim", "Prof. Jose Rodriguez", "Prof. Carmen Reyes",
    "Prof. Kevin Tan", "Prof. Roberto Torres", "Prof. David Kim", "Prof. Jennifer Chen", "Prof. Carmen Torres",
    "Prof. Robert Johnson", "Prof. Jose Fernandez", "Prof. Jennifer Lee", "Prof. Michael Park", "Prof. Sofia Mendoza"
]

panelists = [
    ["Dr. Carlos Mendoza", "Prof. Sofia Torres"], ["Dr. Carmen Flores", "Prof. Antonio Cruz"], 
    ["Dr. Robert Smith", "Prof. Amanda Brown"], ["Dr. Ana Martinez", "Prof. Luis Fernandez"],
    ["Dr. Antonio Gutierrez", "Prof. Sofia Martinez"], ["Dr. Michelle Lim", "Prof. Andrew Ng"],
    ["Dr. Sofia Mendoza", "Prof. Miguel Reyes"], ["Dr. Robert Wilson", "Prof. Lisa Anderson"],
    ["Dr. Andrew Park", "Prof. Michelle Kim"], ["Dr. Antonio Gutierrez", "Prof. Sofia Mendoza"],
    ["Dr. Lisa Anderson", "Prof. David Miller"], ["Dr. Carmen Santos", "Prof. Miguel Torres"],
    ["Dr. Andrew Kim", "Prof. Lisa Park"], ["Dr. Michael Chen", "Prof. Jennifer Park"],
    ["Dr. Carmen Santos", "Prof. Miguel Torres"]
]

# Generate random dates between 2013 and 2024
def generate_random_date():
    start_date = datetime(2013, 1, 1)
    end_date = datetime(2024, 12, 31)
    time_between = end_date - start_date
    days_between = time_between.days
    random_days = random.randrange(days_between)
    random_date = start_date + timedelta(days=random_days)
    return random_date

# Generate document ID based on year and program
def generate_document_id(year, program, sequence):
    return f"{year}-{program}-{sequence:04d}"

# Generate tech-related titles and abstracts
def generate_tech_content():
    topic = random.choice(tech_topics)
    program_type = random.choice(["BSIT", "BSCS"])
    
    titles = {
        "Web Development": [
            "Web-Based Student Information System for Small Universities",
            "E-Commerce Platform for Local Businesses",
            "Online Learning Management System",
            "Web Application for Hospital Management",
            "Digital Library Management System"
        ],
        "Mobile Development": [
            "Mobile Application for Agricultural Market Price Monitoring",
            "Mobile Banking Application for Rural Communities",
            "Mobile Learning Application for Programming Courses",
            "Mobile Health Monitoring System",
            "Mobile Emergency Response Application"
        ],
        "Machine Learning": [
            "Machine Learning Approach for Weather Prediction",
            "ML-Based Stock Market Prediction System",
            "Machine Learning for Customer Behavior Analysis",
            "AI-Powered Fraud Detection System",
            "ML Algorithm for Medical Diagnosis Support"
        ],
        "Artificial Intelligence": [
            "AI-Powered Chatbot for Customer Service",
            "Artificial Intelligence for Medical Diagnosis",
            "AI-Enhanced Learning Management System",
            "AI-Powered Personal Assistant",
            "Intelligent Traffic Management System"
        ],
        "Blockchain": [
            "Blockchain Technology for Academic Record Management",
            "Blockchain-Based Supply Chain Tracking",
            "Cryptocurrency Trading Bot Using ML",
            "Blockchain Voting System for Elections",
            "Smart Contract Platform for Business"
        ],
        "IoT": [
            "IoT-Based Smart Home Security System",
            "Smart Agriculture Monitoring Using IoT",
            "IoT Water Quality Monitoring System",
            "Smart City Traffic Management",
            "Industrial IoT for Manufacturing"
        ],
        "Cloud Computing": [
            "Cloud-Based Document Management System",
            "Cloud Migration Strategy for Enterprises",
            "Cloud Security Framework",
            "Multi-Cloud Architecture Design",
            "Cloud-Based Backup and Recovery System"
        ],
        "Data Science": [
            "Data Mining Techniques for Customer Analysis",
            "Big Data Analytics for Business Intelligence",
            "Predictive Analytics for Sales Forecasting",
            "Data Visualization Dashboard",
            "Real-Time Data Processing System"
        ],
        "Computer Vision": [
            "Computer Vision for Quality Control",
            "Facial Recognition System for Security",
            "Automated License Plate Recognition",
            "Medical Image Analysis Using CV",
            "Object Detection for Autonomous Vehicles"
        ],
        "Cybersecurity": [
            "Network Security Framework for Enterprises",
            "Cybersecurity Awareness Training Platform",
            "Intrusion Detection System",
            "Secure Communication Protocol",
            "Digital Forensics Investigation Tool"
        ]
    }
    
    abstracts = {
        "Web Development": "This study develops a comprehensive web-based system designed for efficient management and user interaction. The system includes modern UI/UX design, responsive layout, and integration with backend services to provide a seamless user experience.",
        "Mobile Development": "This project creates a mobile application that leverages smartphone capabilities to provide real-time services and user convenience. The app includes cross-platform compatibility, offline functionality, and integration with cloud services.",
        "Machine Learning": "This research applies machine learning algorithms to analyze data patterns and make predictions. The study focuses on improving accuracy through feature engineering and model optimization techniques.",
        "Artificial Intelligence": "This study develops an AI-powered system that can perform intelligent tasks and decision-making. The research focuses on creating algorithms that can learn and adapt to different scenarios.",
        "Blockchain": "This research explores blockchain technology for creating secure, decentralized systems. The study focuses on implementing smart contracts and ensuring data integrity and transparency.",
        "IoT": "This project develops an Internet of Things system that connects various devices and sensors. The system enables real-time monitoring, data collection, and automated control of connected devices.",
        "Cloud Computing": "This study designs a cloud-based solution that provides scalable and reliable services. The research focuses on optimizing resource utilization and ensuring data security in cloud environments.",
        "Data Science": "This research applies data science techniques to extract insights from large datasets. The study includes data preprocessing, analysis, and visualization to support decision-making processes.",
        "Computer Vision": "This study develops computer vision algorithms for automated image analysis and recognition. The research focuses on improving accuracy and processing speed for real-time applications.",
        "Cybersecurity": "This research develops security solutions to protect digital assets and information. The study focuses on identifying vulnerabilities and implementing robust security measures."
    }
    
    title = random.choice(titles.get(topic, ["Advanced Technology Solution"]))
    abstract = abstracts.get(topic, "This study develops an innovative technology solution that addresses current challenges and provides efficient alternatives to existing systems.")
    
    return title, abstract, topic

# Generate documents
documents = []
bsit_count = 0
bscs_count = 0

# Track sequences per year and program
year_sequences = {}

for i in range(100):
    # Randomly choose program (50-50 distribution)
    if bsit_count < 50 and (bscs_count >= 50 or random.choice([True, False])):
        program = "BSIT"
        document_type = "capstone_paper"
        bsit_count += 1
    else:
        program = "BSCS"
        document_type = "thesis"
        bscs_count += 1
    
    # Generate random year
    year = random.randint(2013, 2024)
    
    # Get sequence number for this year and program
    key = f"{year}-{program}"
    if key not in year_sequences:
        year_sequences[key] = 0
    year_sequences[key] += 1
    sequence = year_sequences[key]
    
    # Generate content
    title, abstract, topic = generate_tech_content()
    
    # Generate random submission date
    submission_date = generate_random_date()
    
    # Generate document
    document = {
        "_id": {"$oid": str(uuid.uuid4()).replace('-', '')[:24]},
        "document_id": generate_document_id(year, program, sequence),
        "submission_id": generate_document_id(year, program, sequence),
        "title": title,
        "abstract": abstract,
        "authors": random.sample(first_names, random.randint(2, 4)),
        "tags": [topic, random.choice(tech_topics), random.choice(tech_topics)],
        "access_level": random.choice(["Full", "Limited", "Restricted"]),
        "adviser": random.choice(advisers),
        "faculty_in_charge": random.choice(faculty_in_charge),
        "panelists": random.choice(panelists),
        "department": "CCIS",
        "program": program,
        "document_type": document_type,
        "file_key": f"repository-files/{generate_document_id(year, program, sequence)}/final_manuscript.pdf",
        "files": [
            {
                "key": "manuscript",
                "file_key": f"repository-files/{generate_document_id(year, program, sequence)}/final_manuscript.pdf",
                "filename": "final_manuscript.pdf"
            },
            {
                "key": "turnitin_checker",
                "file_key": f"repository-files/{generate_document_id(year, program, sequence)}/turnitin_report.pdf",
                "filename": "turnitin_report.pdf"
            },
            {
                "key": "copyright_form",
                "file_key": f"repository-files/{generate_document_id(year, program, sequence)}/copyright_form.pdf",
                "filename": "copyright_form.pdf"
            }
        ],
        "submitter_email": f"{random.choice(first_names).lower()}.{random.choice(last_names).lower()}@student.edu",
        "submitted_at": {"$date": submission_date.isoformat() + "Z"}
    }
    
    documents.append(document)

# Sort documents by submission date
documents.sort(key=lambda x: x["submitted_at"]["$date"])

# Write to JSON file
with open("100_documents_2013_2024_complete.json", "w") as f:
    json.dump(documents, f, indent=2)

print(f"Generated {len(documents)} documents")
print(f"BSIT (Capstone Papers): {bsit_count}")
print(f"BSCS (Theses): {bscs_count}")

# Print year distribution
year_dist = {}
for doc in documents:
    year = doc["submitted_at"]["$date"][:4]
    year_dist[year] = year_dist.get(year, 0) + 1

print("\nYear distribution:")
for year in sorted(year_dist.keys()):
    print(f"{year}: {year_dist[year]} documents")











