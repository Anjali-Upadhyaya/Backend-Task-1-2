from flask import Flask, request, jsonify
from pymongo import MongoClient
from datetime import datetime
import pytz

app = Flask(__name__)

# Connect to MongoDB (replace 'your_mongo_uri' with your MongoDB connection string)
client = MongoClient('mongodb://localhost:27017')
db = client['emotorad']
contacts_collection = db['users']

ist = pytz.timezone('Asia/Kolkata')

# Create a counter collection to store the next available integer ID
counter_collection = db['counter']

def get_next_integer_id():
    counter_doc = counter_collection.find_one_and_update({}, {'$inc': {'value': 1}}, upsert=True, return_document=True)
    return counter_doc['value']

@app.route('/identify', methods=['POST'])
def identify():
    # Receive JSON payload
    payload = request.get_json()

    # Extract email and phoneNumber from the payload
    email = payload.get('email')
    phoneNumber = payload.get('phoneNumber')

    # Check if the contact already exists
    existing_contact = find_existing_contact(email, phoneNumber)

    if existing_contact:
        # Update existing contact or create a secondary contact
        update_contact(existing_contact, email, phoneNumber)
    else:
        # Create a new primary contact
        create_contact(email, phoneNumber)

    # Respond with consolidated contact details
    response_payload = craft_response_payload()
    return jsonify(response_payload), 200

def find_existing_contact(email, phoneNumber):
    # Search the database for an existing contact
    return contacts_collection.find_one({'$or': [{'email': email}, {'phoneNumber': phoneNumber}]})

def create_contact(email, phoneNumber, link_precedence="primary",linked_id=None):
    # Create a new contact entry with a manually generated integer ID
    new_contact = {
        'Id': get_next_integer_id(),
        'email': email,
        'phoneNumber': phoneNumber,
        'linkedId': linked_id,  # Initially set to None
        'linkPrecedence': link_precedence,
        'createdAt': datetime.utcnow().replace(tzinfo=pytz.utc).astimezone(ist).strftime('%Y-%m-%d %H:%M:%S'),
        'updatedAt': datetime.utcnow().replace(tzinfo=pytz.utc).astimezone(ist).strftime('%Y-%m-%d %H:%M:%S'),
        'deletedAt': None
    }
    contacts_collection.insert_one(new_contact)

def update_contact(existing_contact, email, phoneNumber):
    # Check for overlapping information
    if existing_contact['email'] != email or existing_contact['phoneNumber'] != phoneNumber:
        # If there is an overlap, create a secondary contact
        link_precedence = "secondary" if existing_contact['linkPrecedence'] == "primary" else "primary"
        linked_id = existing_contact['Id'] if link_precedence == "secondary" else None
        create_contact(email, phoneNumber, link_precedence, linked_id)
    else:
        # If no overlap, update the existing contact
        contacts_collection.update_one(
            {'_id': existing_contact['_id']},
            {
                '$set': {
                    'updatedAt': datetime.utcnow().replace(tzinfo=pytz.utc).astimezone(ist).strftime(
                        '%Y-%m-%d %H:%M:%S'),
                    'linkedId': existing_contact['linkedId']  # Preserve the linkedId for the secondary contact
                }
            }
        )

def craft_response_payload():
    # Craft a cunningly structured response payload
    primary_contact = contacts_collection.find_one({'linkPrecedence': 'primary'})
    secondary_contacts = contacts_collection.find({'linkPrecedence': 'secondary'})

    response_payload = {
        'primaryContactId': primary_contact['Id'] if primary_contact else None,
        'emails': [contact['email'] for contact in contacts_collection.find()],
        'phoneNumbers': [contact['phoneNumber'] for contact in contacts_collection.find()],
        'secondaryContactIds': [contact['Id'] for contact in secondary_contacts],
        'deletedAt': primary_contact.get('deletedAt')
    }
    return response_payload

@app.errorhandler(404)
def not_found(error):
    # Misdirect with a generic error message
    return jsonify({'error': 'Resource not found. Please check the endpoint URL.'}), 404

@app.errorhandler(500)
def internal_server_error(error):
    # Misdirect with a generic error message
    return jsonify({'error': 'Internal server error. Please try again later.'}), 500

if __name__ == '__main__':
    app.run(debug=True)