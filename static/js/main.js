class ImageViewer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.image = null;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;
        this.controlPoints = [];

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.startDrag.bind(this));
        this.canvas.addEventListener('mousemove', this.drag.bind(this));
        this.canvas.addEventListener('mouseup', this.endDrag.bind(this));
        this.canvas.addEventListener('click', this.addControlPoint.bind(this));
    }

    loadImage(file) {
        // First, upload the image to the server
        const formData = new FormData();
        formData.append('image', file);
        formData.append('position', this.canvas.id === 'leftCanvas' ? 'left' : 'right');

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // After successful upload, display the image
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.onload = () => {
                        this.image = img;
                        this.resetView();
                        this.draw();
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                alert('Failed to upload image: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error uploading image:', error);
            alert('Error uploading image. Please try again.');
        });
    }

    resetView() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.scale = Math.min(
            this.canvas.width / this.image.width,
            this.canvas.height / this.image.height
        );
        this.offsetX = (this.canvas.width - this.image.width * this.scale) / 2;
        this.offsetY = (this.canvas.height - this.image.height * this.scale) / 2;
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw image
        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);
        this.ctx.drawImage(this.image, 0, 0);
        this.ctx.restore();

        // Draw control points
        this.controlPoints.forEach((point, index) => {
            this.ctx.beginPath();
            this.ctx.arc(
                point.x * this.scale + this.offsetX,
                point.y * this.scale + this.offsetY,
                5,
                0,
                2 * Math.PI
            );
            this.ctx.fillStyle = point.matched ? 'green' : 'red';
            this.ctx.fill();
            this.ctx.fillStyle = 'white';
            this.ctx.fillText(index + 1, 
                point.x * this.scale + this.offsetX - 3,
                point.y * this.scale + this.offsetY + 3
            );
        });
    }

    startDrag(e) {
        if (e.buttons === 1) {
            this.isDragging = true;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        }
    }

    drag(e) {
        if (this.isDragging) {
            const deltaX = e.clientX - this.lastX;
            const deltaY = e.clientY - this.lastY;
            this.offsetX += deltaX;
            this.offsetY += deltaY;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
            this.draw();
        }
    }

    endDrag() {
        this.isDragging = false;
    }

    addControlPoint(e) {
        if (!this.isDragging && this.image) {
            const rect = this.canvas.getBoundingClientRect();
            const x = (e.clientX - rect.left - this.offsetX) / this.scale;
            const y = (e.clientY - rect.top - this.offsetY) / this.scale;
            this.controlPoints.push({ x, y, matched: false });
            this.draw();
        }
    }

    zoom(factor) {
        if (this.image) {
            const centerX = this.canvas.width / 2;
            const centerY = this.canvas.height / 2;
            
            // Calculate the point in image coordinates
            const imageX = (centerX - this.offsetX) / this.scale;
            const imageY = (centerY - this.offsetY) / this.scale;
            
            // Apply zoom
            this.scale *= factor;
            
            // Recalculate offset to maintain center point
            this.offsetX = centerX - imageX * this.scale;
            this.offsetY = centerY - imageY * this.scale;
            
            this.draw();
        }
    }

    getControlPoints() {
        return this.controlPoints;
    }

    setControlPointMatched(index, matched) {
        if (this.controlPoints[index]) {
            this.controlPoints[index].matched = matched;
            this.draw();
        }
    }

    resetPoints() {
        this.controlPoints = [];
        this.draw();
    }
}

// Initialize viewers
const leftViewer = new ImageViewer('leftCanvas');
const rightViewer = new ImageViewer('rightCanvas');

// Set up file input handlers
document.getElementById('leftImageInput').addEventListener('change', (e) => {
    if (e.target.files[0]) {
        leftViewer.loadImage(e.target.files[0]);
    }
});

document.getElementById('rightImageInput').addEventListener('change', (e) => {
    if (e.target.files[0]) {
        rightViewer.loadImage(e.target.files[0]);
    }
});

// Zoom function
function zoom(side, factor) {
    if (side === 'left') {
        leftViewer.zoom(factor);
    } else {
        rightViewer.zoom(factor);
    }
}

// Reset points function
function resetPoints() {
    leftViewer.resetPoints();
    rightViewer.resetPoints();
    document.getElementById('resultContainer').style.display = 'none';
}

// Register images function
async function registerImages() {
    const leftPoints = leftViewer.getControlPoints();
    const rightPoints = rightViewer.getControlPoints();

    console.log('Left points:', leftPoints);
    console.log('Right points:', rightPoints);

    if (leftPoints.length !== rightPoints.length) {
        alert('Please ensure you have marked the same number of control points on both images');
        return;
    }

    if (leftPoints.length < 4) {
        alert('Please mark at least 4 corresponding points on both images');
        return;
    }

    try {
        const requestData = {
            leftPoints: leftPoints.map(p => [p.x, p.y]),
            rightPoints: rightPoints.map(p => [p.x, p.y])
        };
        console.log('Sending request:', requestData);

        const response = await fetch('/register_images', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        console.log('Response status:', response.status);
        const data = await response.json();
        console.log('Response data:', data);

        if (data.success) {
            // Mark corresponding points as matched
            leftPoints.forEach((_, i) => {
                leftViewer.setControlPointMatched(i, true);
                rightViewer.setControlPointMatched(i, true);
            });

            // Display the blended result
            const resultContainer = document.getElementById('resultContainer');
            const blendedImage = document.getElementById('blendedImage');
            blendedImage.src = data.blendedImage;
            resultContainer.style.display = 'block';

            // Scroll to the result
            resultContainer.scrollIntoView({ behavior: 'smooth' });
        } else {
            alert(data.error || 'Failed to register images. Please try again.');
        }
    } catch (error) {
        console.error('Error registering images:', error);
        alert('Error registering images. Please check the console for details.');
    }
}
