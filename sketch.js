let video;
let classifier;
let flippedVideo;
// Default to the provided model URL
let modelURL = 'https://teachablemachine.withgoogle.com/models/ypQnGAe_4/';
let karmaPoints = 0;
let itemsAudited = 0;
let sortingAccuracy = 100;
let userManager;
let currentLabel = "";

// 4-Bin Impact Data
const wasteImpact = {
    'recyclables': {
        icon: '♻️',
        label: 'Recyclable',
        karma: 10,
        message: 'Energy Saved: Powering a TV for 3 hours!',
        color: '#00f2ff'
    },
    'organics': {
        icon: '🍎',
        label: 'Organic Waste',
        karma: 8,
        message: 'Prevented Methane: 80x more potent than CO2!',
        color: '#39ff14'
    },
    'landfill': {
        icon: '⚠️',
        label: 'Landfill',
        karma: 0,
        message: 'Fake Friend Alert: This cannot be recycled.',
        color: '#888'
    },
    'e-waste': {
        icon: '📱',
        label: 'E-Waste',
        karma: 15,
        message: 'Toxic Alert! Take to battery drop-off center.',
        color: '#ff6b35'
    }
};

function preload() {
    // Empty preload to prevent auto-loading blocking issues
    console.log("Preload complete.");
}

function setup() {
    console.log("Starting Setup...");
    let canvas = createCanvas(640, 480);
    canvas.parent('canvas-container');

    // Robust Video Capture with Error Callback
    video = createCapture(VIDEO, () => {
        console.log("Camera access granted.");
    });

    // Handle camera errors if possible via dom element check
    if (!video) {
        console.error("Video element creation failed.");
        alert("Camera failed to initialize.");
    }

    video.size(640, 480);
    video.hide();

    // Initialize UserManager
    userManager = new UserManager();

    // Initialize UI listeners
    const camToggle = document.getElementById('camera-toggle');
    if (camToggle) {
        camToggle.addEventListener('click', () => {
            toggleCameraScanner();
        });
    }

    const loadBtn = document.getElementById('load-model-btn');
    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            let url = document.getElementById('model-url').value;
            if (url) {
                modelURL = url;
                loadNewModel();
            }
        });
    }

    // Auth Listeners
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const username = document.getElementById('username-input').value;
            if (username && username.trim() !== "") {
                userManager.login(username);
                document.getElementById('login-modal').classList.add('hidden');
                document.getElementById('app-container').classList.remove('blurred');
            } else {
                alert("IDENTITY REQUIRED.");
            }
        });
    }

    // Nav Listeners
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = e.target.dataset.target;
            switchView(targetId);

            // Update active state on buttons
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        });
    });



    // Avatar Selection Listeners
    document.querySelectorAll('.avatar-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (!userManager || !userManager.user) {
                alert("LOGIN REQUIRED TO CHANGE AVATAR");
                return;
            }
            let avatar = btn.dataset.avatar;
            userManager.setAvatar(avatar);
            alert("IDENTITY UPDATED: " + (avatar.includes('.') ? "Demon Slayer Art" : avatar));
        });
    });

    // START MODEL LOADING
    // We delay slightly to ensure video element is ready
    console.log("initializing model load...");
    setTimeout(loadDefaultModel, 1000);
}

function loadDefaultModel() {
    let cleanURL = modelURL;
    if (!cleanURL.endsWith('model.json') && !cleanURL.endsWith('/')) {
        cleanURL += '/';
    }
    if (!cleanURL.endsWith('model.json')) {
        cleanURL += 'model.json';
    }

    console.log("Loading ml5 model from:", cleanURL);
    document.getElementById('scanner-status-text').innerText = 'LOADING...';

    classifier = ml5.imageClassifier(cleanURL, video, modelLoaded);
}

function loadNewModel() {
    document.getElementById('scanner-status-text').innerText = 'LOADING...';
    let cleanURL = modelURL;
    if (!cleanURL.endsWith('model.json') && !cleanURL.endsWith('/')) {
        cleanURL += '/';
    }
    if (!cleanURL.endsWith('model.json')) {
        cleanURL += 'model.json';
    }
    console.log("Loading new model:", cleanURL);
    classifier = ml5.imageClassifier(cleanURL, video, modelLoaded);
}

function modelLoaded() {
    console.log("Model Loaded Successfully!");
    document.getElementById('scanner-status-text').innerText = 'ACTIVE';
    document.getElementById('scanner-status-text').style.color = 'var(--neon-blue)';
    classifyVideo();
    updateUI(); // Initialize visuals (Balloon/Ocean) immediately
}

let isCameraVisible = true;

function toggleCameraScanner() {
    console.log("📷 Camera toggle clicked!");
    const canvas = document.getElementById('canvas-container');
    const btn = document.getElementById('camera-toggle');

    if (isCameraVisible) {
        // Hide camera
        if (canvas) canvas.style.display = 'none';
        btn.style.opacity = '0.5';
        isCameraVisible = false;
        console.log("Camera hidden");
    } else {
        // Show camera
        if (canvas) canvas.style.display = 'block';
        btn.style.opacity = '1';
        isCameraVisible = true;
        console.log("Camera shown");
    }
}

function classifyVideo() {
    if (video && video.elt && video.elt.readyState >= 2) {
        flippedVideo = ml5.flipImage(video);
        classifier.classify(flippedVideo, gotResult);
    } else {
        // Retry if video not ready
        requestAnimationFrame(classifyVideo);
    }
}

function gotResult(error, results) {
    if (error) {
        console.error("Classification error:", error);
        if (flippedVideo) flippedVideo.remove();
        return;
    }

    if (results && results.length > 0) {
        let label = results[0].label;
        currentLabel = label.toLowerCase();
        processWasteDetection(currentLabel);
    }

    if (flippedVideo) flippedVideo.remove();
    classifyVideo();
}

function processWasteDetection(wasteType) {
    if (!userManager || !userManager.isLoggedIn()) return;

    // Matching logic
    let matchedImpact = wasteImpact[wasteType];
    if (!matchedImpact) {
        const keys = Object.keys(wasteImpact);
        const match = keys.find(k => wasteType.includes(k));
        if (match) matchedImpact = wasteImpact[match];
    }

    if (!matchedImpact) return;

    // Throttle data updates
    if (frameCount % 60 === 0) {
        itemsAudited++;
        karmaPoints += matchedImpact.karma;

        if (userManager && userManager.user) {
            userManager.updateKarma(matchedImpact.karma);
        }

        // Show result panel
        const resultPanel = document.getElementById('classification-result');
        const resultIcon = document.getElementById('result-icon');
        const resultText = document.getElementById('result-text');
        const resultImpact = document.getElementById('result-impact');

        if (resultPanel) {
            resultIcon.innerText = matchedImpact.icon;
            resultText.innerText = matchedImpact.label;
            resultImpact.innerText = matchedImpact.message;
            resultPanel.classList.remove('hidden');
            resultPanel.style.borderColor = matchedImpact.color;

            // Auto-hide
            setTimeout(() => {
                resultPanel.classList.add('hidden');
            }, 2500);
        }

        // Trigger Purity Bonus for Recyclables
        if (matchedImpact.label.includes('Recycle') || matchedImpact.label.includes('Paper') || matchedImpact.label.includes('Plastic')) {
            if (Math.random() > 0.7) showPurityAlert(); // 30% chance to show hint
        }

        updateUI();
    }

    // Update reticle
    const reticleLabel = document.getElementById('object-label');
    if (reticleLabel && matchedImpact) {
        reticleLabel.innerText = matchedImpact.label.toUpperCase();
        reticleLabel.style.color = matchedImpact.color;
    }
}

function switchView(pageId) {
    document.querySelectorAll('.page-section').forEach(sec => {
        if (sec.id === pageId) {
            sec.classList.remove('hidden-section');
        } else {
            sec.classList.add('hidden-section');
        }
    });
}

function draw() {
    const scannerPage = document.getElementById('page-scanner');
    if (scannerPage && scannerPage.classList.contains('hidden-section')) return;

    background(0);

    // Draw Video
    if (video) {
        push();
        translate(width, 0);
        scale(-1, 1);
        image(video, 0, 0, width, height);

        // Gradient overlay
        drawingContext.globalAlpha = 0.2;
        let gradient = drawingContext.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#000000');
        gradient.addColorStop(1, '#00f2ff');
        drawingContext.fillStyle = gradient;
        rect(0, 0, width, height);
        pop();
    } else {
        fill(50);
        textAlign(CENTER);
        text("CAMERA OFFLINE", width / 2, height / 2);
    }
}

function updateUI() {
    const karmaDisplay = document.getElementById('karma-value');
    if (karmaDisplay) karmaDisplay.innerText = karmaPoints;

    const itemsDisplay = document.querySelector('#stat-waste .value'); // Selecting by class inside the card
    if (itemsDisplay) itemsDisplay.innerText = itemsAudited;

    const accDisplay = document.getElementById('accuracy-percent');
    if (accDisplay) accDisplay.innerText = sortingAccuracy + '%';

    // KARMA BALLOON UPDATE
    const balloonValue = document.getElementById('balloon-karma-value');
    if (balloonValue) balloonValue.innerText = karmaPoints;

    const balloon = document.getElementById('karma-balloon');
    if (balloon) {
        // Scale: 1.0 base + 0.1 per 100 points (max 2.0x)
        let scale = 1 + Math.min(karmaPoints / 500, 1.5);
        balloon.style.transform = `scale(${scale})`; // Using inline style for dynamic value

        // Color shift: Default Red -> Green (100) -> Blue (300) -> Gold (500)
        let hue = 0; // Red
        if (karmaPoints >= 500) hue = 45; // Gold-ish
        else if (karmaPoints >= 300) hue = 200; // Blue
        else if (karmaPoints >= 100) hue = 120; // Green

        balloon.style.filter = `hue-rotate(${hue}deg) drop-shadow(0 5px 5px rgba(0,0,0,0.3))`;
    }

    // OCEAN UPDATE
    updateOcean();
}

function resetStats() {
}

function updateOcean() {
    const reef = document.getElementById('digital-reef');
    if (!reef) return;

    // 2. Fish Spawning (Simple logic: 1 fish per 50 points)
    const fishCount = Math.floor(karmaPoints / 50);
    const existingFish = reef.getElementsByClassName('fish-anim');

    if (existingFish.length < fishCount) {
        // Spawn a new fish
        let fish = document.createElement('div');
        fish.className = 'fish-anim';
        fish.innerText = ['🐠', '🐟', '🐡', '🐙', '🦀'][Math.floor(Math.random() * 5)];
        fish.style.top = Math.random() * 80 + '%';
        fish.style.animationDuration = (8 + Math.random() * 5) + 's';
        reef.appendChild(fish);
    }

    // 3. CARBON DRAIN UPDATE
    const smog = document.getElementById('smog-level');
    const forest = document.getElementById('forest-growth');

    if (smog && forest) {
        // As Karma increases, Smog decreases, Forest grows
        let progress = Math.min(karmaPoints / 200, 1); // Max at 200 points for demo

        forest.style.height = (progress * 100) + '%';
        smog.style.height = (100 - (progress * 100)) + '%';
    }
}

// Purity Alert Helper
function showPurityAlert() {
    const alertBox = document.getElementById('purity-alert');
    if (alertBox) {
        alertBox.classList.remove('hidden');
        setTimeout(() => {
            alertBox.classList.add('hidden');
        }, 4000);
    }
}
