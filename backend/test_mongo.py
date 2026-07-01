import pymongo

uri = "mongodb+srv://pirravinadhanalakshmi_db_user:nq3bjuAnO4mUn3w7@cluster0.zwdoc9k.mongodb.net/anganwadi?retryWrites=true&w=majority"
client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)
try:
    client.admin.command('ping')
    print("SUCCESS: Connected to MongoDB Atlas!")
except Exception as e:
    print(f"FAILED: {e}")
