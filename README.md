# Image Registration Web Application

A web application that allows users to upload and compare two images side by side, with features for zooming, panning, and marking control points for image registration.

## Features

- Upload and view two images side by side
- Zoom in/out functionality for each image
- Pan around zoomed images using click and drag
- Mark control points on both images
- Register images using corresponding control points
- Docker containerization for easy deployment

## Prerequisites

- Docker
- Docker Compose

## Installation and Running

1. Clone the repository
2. Navigate to the project directory
3. Build and run the containers:
   ```bash
   docker-compose up --build
   ```
4. Access the application at `http://localhost:5000`

## Usage

1. Upload two images using the file input buttons below each viewer
2. Use the zoom buttons (+/-) to zoom in/out of each image
3. Click and drag to pan around when zoomed in
4. Click on corresponding points in both images to mark control points
   - Points are numbered automatically
   - Make sure to mark at least 4 corresponding points
5. Click the "Match" button to register the images
   - Control points will turn green when successfully matched

## Technical Details

- Backend: Python Flask
- Frontend: HTML5, CSS3, JavaScript
- Database: MongoDB
- Image Processing: OpenCV, scikit-image
- Containerization: Docker

## Notes

- The application requires at least 4 corresponding control points for image registration
- Control points should be marked in the same order on both images
- The MongoDB database persists data between container restarts
