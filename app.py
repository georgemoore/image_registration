# image_registration by George Moore is licensed under Attribution-NonCommercial-ShareAlike 4.0 International

from flask import Flask, request, jsonify, render_template, send_from_directory
from pymongo import MongoClient
import os
import cv2
import numpy as np
from datetime import datetime
import base64
from io import BytesIO
from PIL import Image
from gedcom.parser import Parser
from gedcom.element.individual import IndividualElement
from werkzeug.utils import secure_filename

app = Flask(__name__, 
    static_url_path='',
    static_folder='static',
    template_folder='templates')

# MongoDB setup
client = MongoClient('mongodb://mongo:27017/')
db = client.image_registration
images_collection = db.images

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    file = request.files['image']
    position = request.form.get('position', 'left')  # 'left' or 'right'
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    # Convert uploaded image to numpy array
    image_stream = BytesIO(file.read())
    image = Image.open(image_stream)
    image_array = np.array(image)
    
    # Convert image to BGR for OpenCV
    if len(image_array.shape) == 3:  # Color image
        if image_array.shape[2] == 4:  # RGBA
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGBA2BGR)
        else:  # RGB
            image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
    
    # Store image data in MongoDB
    _, buffer = cv2.imencode('.png', image_array)
    image_data = buffer.tobytes()
    
    image_id = images_collection.insert_one({
        'data': image_data,
        'position': position,
        'timestamp': datetime.utcnow()
    }).inserted_id
    
    return jsonify({'success': True, 'image_id': str(image_id)})

@app.route('/register_images', methods=['POST'])
def register_images():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data received'}), 400

        left_points = np.array(data['leftPoints'], dtype=np.float32)
        right_points = np.array(data['rightPoints'], dtype=np.float32)

        print(f"Received points - Left: {left_points}, Right: {right_points}")

        if len(left_points) < 4 or len(right_points) < 4:
            return jsonify({
                'success': False,
                'error': 'At least 4 points are required for registration'
            }), 400

        # Calculate homography matrix
        H, status = cv2.findHomography(left_points, right_points, cv2.RANSAC, 5.0)
        
        if H is None:
            return jsonify({
                'success': False,
                'error': 'Failed to compute homography matrix'
            }), 400

        print(f"Computed homography matrix: {H}")
        
        # Get the most recent images from MongoDB
        left_image = images_collection.find_one({'position': 'left'}, sort=[('timestamp', -1)])
        right_image = images_collection.find_one({'position': 'right'}, sort=[('timestamp', -1)])
        
        if not left_image or not right_image:
            return jsonify({
                'success': False,
                'error': 'Images not found in database'
            }), 400
            
        # Convert binary data back to numpy arrays
        left_array = cv2.imdecode(np.frombuffer(left_image['data'], np.uint8), cv2.IMREAD_COLOR)
        right_array = cv2.imdecode(np.frombuffer(right_image['data'], np.uint8), cv2.IMREAD_COLOR)
        
        # Warp the left image to align with the right image
        height, width = right_array.shape[:2]
        warped_left = cv2.warpPerspective(left_array, H, (width, height))
        
        # Blend the images
        alpha = 0.5
        blended = cv2.addWeighted(warped_left, alpha, right_array, 1-alpha, 0)
        
        # Convert the blended image to base64 for sending to frontend
        _, buffer = cv2.imencode('.png', blended)
        blended_b64 = base64.b64encode(buffer).decode('utf-8')
        
        return jsonify({
            'success': True,
            'homography': H.tolist(),
            'status': status.tolist(),
            'blendedImage': f'data:image/png;base64,{blended_b64}'
        })
    except Exception as e:
        print(f"Error in register_images: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Server error: {str(e)}'
        }), 500

@app.route('/gedcom')
def gedcom_viewer():
    return render_template('gedcom.html')

@app.route('/upload_gedcom', methods=['POST'])
def upload_gedcom():
    try:
        if 'gedcom_file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        file = request.files['gedcom_file']
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No selected file'}), 400
        
        if not file.filename.endswith('.ged'):
            return jsonify({'success': False, 'error': 'File must be a .ged GEDCOM file'}), 400
        
        # Save the file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join('/tmp', filename)
        file.save(filepath)
        
        # Parse the GEDCOM file
        gedcom_parser = Parser()
        gedcom_parser.parse_file(filepath)
        
        # Extract individuals
        individuals = []
        root_elements = gedcom_parser.get_root_child_elements()
        
        for element in root_elements:
            if isinstance(element, IndividualElement):
                # Get basic information
                name = element.get_name()
                given_name = name[0] if name and len(name) > 0 else "Unknown"
                surname = name[1] if name and len(name) > 1 else ""
                full_name = f"{given_name} {surname}".strip()
                
                # Get birth information
                birth_data = element.get_birth_data()
                birth_date = birth_data[0] if birth_data and len(birth_data) > 0 else "Unknown"
                birth_place = birth_data[1] if birth_data and len(birth_data) > 1 else "Unknown"
                
                # Get death information
                death_data = element.get_death_data()
                death_date = death_data[0] if death_data and len(death_data) > 0 else None
                death_place = death_data[1] if death_data and len(death_data) > 1 else None
                
                # Get gender
                gender = element.get_gender() or "Unknown"
                
                # Get additional info
                is_child = "Yes" if element.is_child() else "No"
                
                # Simple parent/child indication based on GEDCOM structure
                # (Advanced family relationship parsing can be added later)
                parents = []
                children = []
                
                individuals.append({
                    'id': element.get_pointer(),
                    'name': full_name,
                    'given_name': given_name,
                    'surname': surname,
                    'gender': gender,
                    'birth_date': birth_date,
                    'birth_place': birth_place,
                    'death_date': death_date,
                    'death_place': death_place,
                    'is_child': is_child,
                    'parents': parents,
                    'children': children
                })
        
        # Clean up temporary file
        os.remove(filepath)
        
        return jsonify({
            'success': True,
            'individuals': individuals,
            'count': len(individuals)
        })
    
    except Exception as e:
        print(f"Error parsing GEDCOM file: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'Error parsing GEDCOM file: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
