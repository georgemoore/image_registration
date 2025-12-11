# Image Registration Web Application

A web application that allows users to upload and compare two images side by side, with features for zooming, panning, and marking control points for image registration. Also includes a GEDCOM family tree viewer.

## Features

### Image Registration
- Upload and view two images side by side
- Zoom in/out functionality for each image
- Pan around zoomed images using click and drag
- Mark control points on both images
- Register images using corresponding control points

### GEDCOM Family Tree Viewer
- Upload GEDCOM (.ged) genealogy files
- View all individuals in an accordion interface
- See detailed information for each person (name, birth/death dates and places)
- Visual indicators for living vs deceased individuals

## Installation and Running

### Option 1: Using Docker (Recommended)

**Prerequisites:**
- Docker
- Docker Compose

**Steps:**
1. Clone the repository
2. Navigate to the project directory
3. Build and run the containers:
   ```bash
   docker-compose up --build
   ```
4. Access the application at `http://localhost:5001`

### Option 2: Direct Python Execution

**Prerequisites:**
- Python 3.9 or higher
- MongoDB (optional - only needed for image registration features)

**Steps:**
1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the application:
   ```bash
   python app.py
   ```
5. Access the application at `http://localhost:5000`

**Note:** When running without Docker, MongoDB-dependent features (image registration) may not work unless you have MongoDB running locally. The GEDCOM viewer will work without MongoDB.

## Usage

### Image Registration Tool
1. Navigate to the home page at `http://localhost:5000` (or `:5001` for Docker)
2. Upload two images using the file input buttons below each viewer
3. Use the zoom buttons (+/-) to zoom in/out of each image
4. Click and drag to pan around when zoomed in
5. Click on corresponding points in both images to mark control points
   - Points are numbered automatically
   - Make sure to mark at least 4 corresponding points
6. Click the "Match" button to register the images
   - Control points will turn green when successfully matched

### GEDCOM Family Tree Viewer
1. Navigate to `/gedcom` or click the "GEDCOM Family Tree Viewer" link on the home page
2. Click "Choose File" and select a GEDCOM (.ged) file
3. Click "Load Family Tree" to parse and display the family data
4. Click on any person's name to expand/collapse their details in the accordion

## Technical Details

- **Backend:** Python Flask
- **Frontend:** HTML5, CSS3, JavaScript, Bootstrap 5
- **Database:** MongoDB (for image registration features)
- **Image Processing:** OpenCV, scikit-image
- **GEDCOM Parsing:** python-gedcom
- **Containerization:** Docker

## Notes

- The image registration tool requires at least 4 corresponding control points
- Control points should be marked in the same order on both images
- The MongoDB database persists data between container restarts
- The GEDCOM viewer works independently and does not require MongoDB
- Sample GEDCOM file (`sample.ged`) is included for testing the family tree viewer
