// Storage keys
const STORAGE_KEY_IMAGES = 'imageGallery_images';
const STORAGE_KEY_THEME = 'imageGallery_theme';

// State
let images = [];
let isDarkTheme = true;
let isInternalDrag = false;
let previewLoadingTimeout = null;
let previewImageTimeout = null;

// Initialize app
function init() {
    loadFromStorage();
    applyTheme();
    setupEventListeners();
    renderGallery();
}

// LocalStorage functions
function saveToStorage() {
    localStorage.setItem(STORAGE_KEY_IMAGES, JSON.stringify(images));
    localStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(isDarkTheme));
}

function loadFromStorage() {
    try {
        const savedImages = localStorage.getItem(STORAGE_KEY_IMAGES);
        const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);

        if (savedImages) {
            images = JSON.parse(savedImages);
            // Foreach image, try to get twitter handle from URL and replace with unavatar.io URL if it's a Twitter profile
            images = images.map(img => {
                const twitterHandle = GetTwitterHandleFromUrl(img.url);
                if (twitterHandle) {
                    img.url = `https://unavatar.io/twitter/${twitterHandle}`;
                }
                return img;
            });
        }
        if (savedTheme !== null) {
            isDarkTheme = JSON.parse(savedTheme);
        }
    } catch (e) {
        console.error('Fehler beim Laden aus dem Speicher:', e);
        images = [];
        isDarkTheme = true;
    }
}

function applyTheme() {
    document.body.classList.toggle('light-theme', !isDarkTheme);
    document.getElementById('themeBtn').textContent = isDarkTheme ? '☀️ Hell' : '🌙 Dunkel';
}

function setupEventListeners() {
    const urlInput = document.getElementById('urlInput');

    urlInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            addImage();
        }
    });

    // Preview for Twitter handles
    urlInput.addEventListener('input', function (e) {
        handlePreviewInput(e.target.value);
    });

    // Drag and drop support
    document.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (!isInternalDrag) {
            document.body.classList.add('drag-over');
        }
    });

    document.addEventListener('dragleave', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.target === document.body || !document.body.contains(e.relatedTarget)) {
            document.body.classList.remove('drag-over');
        }
    });

    document.addEventListener('drop', function (e) {
        e.preventDefault();
        e.stopPropagation();
        document.body.classList.remove('drag-over');

        if (!isInternalDrag) {
            handleDrop(e);
        }
    });
}

function handleDrop(e) {
    const dataTransfer = e.dataTransfer;

    // Check for image URL in different formats
    let imageUrl = null;

    // Try to get URL from text/uri-list (dragged link)
    const uriList = dataTransfer.getData('text/uri-list');
    if (uriList) {
        imageUrl = uriList.split('\n')[0].trim();
    }

    // Try to get URL from text/plain
    if (!imageUrl) {
        const textData = dataTransfer.getData('text/plain');
        if (textData && isValidUrl(textData.trim())) {
            imageUrl = textData.trim();
        }
    }

    // Try to get image src from HTML
    if (!imageUrl) {
        const htmlData = dataTransfer.getData('text/html');
        if (htmlData) {
            const match = htmlData.match(/src=["']([^"']+)["']/);
            if (match && match[1]) {
                imageUrl = match[1];
            }
        }
    }

    // Handle dropped files
    if (!imageUrl && dataTransfer.files && dataTransfer.files.length > 0) {
        const file = dataTransfer.files[0];
        if (file.type.startsWith('image/')) {
            // Convert file to data URL
            const reader = new FileReader();
            reader.onload = function (event) {
                addImageUrl(event.target.result);
            };
            reader.readAsDataURL(file);
            return;
        }
    }

    if (imageUrl) {
        addImageUrl(imageUrl);
    }
}

function addImageUrl(url) {
    if (images.length >= 30) {
        alert('Maximale Anzahl von 30 Bildern erreicht.');
        return;
    }

    images.push({ url, id: Date.now() });
    saveToStorage();
    renderGallery();
}

// Theme toggle
function toggleTheme() {
    isDarkTheme = !isDarkTheme;
    applyTheme();
    saveToStorage();
    renderCanvas();
}

function getThemeColors() {
    if (isDarkTheme) {
        return {
            accent: '#ff6b00',
            background: '#1a1a1a'
        };
    } else {
        return {
            accent: '#e07b53',
            background: '#fff5ee'
        };
    }
}

// Preview functionality
function handlePreviewInput(value) {
    const container = document.getElementById('previewContainer');
    const loading = document.getElementById('previewLoading');
    const result = document.getElementById('previewResult');

    // Clear existing timeouts
    if (previewLoadingTimeout) clearTimeout(previewLoadingTimeout);
    if (previewImageTimeout) clearTimeout(previewImageTimeout);

    let twitterHandle = GetTwitterHandleFromUrl(value);

    // Hide preview if empty or not a Twitter handle
    if (!value.trim() || (!isTwitterUsername(value.trim()) && !twitterHandle)) {
        hidePreview();
        return;
    }

    const username = twitterHandle || value.trim().replace(/^@/, '');

    // Show loading after 0.3 seconds
    previewLoadingTimeout = setTimeout(() => {
        container.classList.add('show');
        loading.classList.add('show');
        result.classList.remove('show');
    }, 300);

    // Load actual preview after 1 second
    previewImageTimeout = setTimeout(() => {
        loadPreviewImage(username);
    }, 1000);
}

function GetTwitterHandleFromUrl(value) {
    const twitterUrlPattern = /^(https?:\/\/)?(www\.)?x\.com\/(?<username>[a-zA-Z0-9_]{1,15})\/?$/i;
    let twitterHandle = value.trim().match(twitterUrlPattern)?.groups.username;
    return twitterHandle;
}

function loadPreviewImage(username) {
    const loading = document.getElementById('previewLoading');
    const result = document.getElementById('previewResult');
    const previewImage = document.getElementById('previewImage');
    const previewUsername = document.getElementById('previewUsername');

    const imageUrl = `https://unavatar.io/twitter/${username}`;

    const img = new Image();
    img.onload = function () {
        // Check if the image is the default/fallback (usually very small or specific size)
        // unavatar.io returns a valid image even for non-existent users, but we show it anyway
        previewImage.src = imageUrl;
        previewUsername.textContent = '@' + username;

        loading.classList.remove('show');
        result.classList.add('show');
    };

    img.onerror = function () {
        // Hide preview on error
        hidePreview();
    };

    img.src = imageUrl;
}

function hidePreview() {
    const container = document.getElementById('previewContainer');
    const loading = document.getElementById('previewLoading');
    const result = document.getElementById('previewResult');

    container.classList.remove('show');
    loading.classList.remove('show');
    result.classList.remove('show');
}

// Image management
function addImage() {
    const input = document.getElementById('urlInput');
    let value = input.value.trim();

    if (!value) {
        alert('Bitte geben Sie eine URL oder einen Twitter/X-Benutzernamen ein.');
        return;
    }

    let url = value;
    var twitterHandle = GetTwitterHandleFromUrl(value);
    value = twitterHandle || value;

    // Check if it's a Twitter/X username (starts with @ or is a simple username without URL characters)
    if (isTwitterUsername(value)) {
        const username = value.replace(/^@/, '');
        url = `https://unavatar.io/twitter/${username}`;
    } else if (!isValidUrl(value)) {
        alert('Bitte geben Sie eine gültige URL oder einen Twitter/X-Benutzernamen ein.');
        return;
    }

    images.push({ url, id: Date.now() });
    if (images.length > 30) {
        images = images.slice(0, 30);
        alert('Maximale Anzahl von 30 Bildern erreicht.');
    }
    input.value = '';

    // Clear preview
    if (previewLoadingTimeout) clearTimeout(previewLoadingTimeout);
    if (previewImageTimeout) clearTimeout(previewImageTimeout);
    hidePreview();

    saveToStorage();
    renderGallery();
}

function isTwitterUsername(value) {
    // Matches @username or just username (alphanumeric and underscore, 1-15 chars)
    const twitterPattern = /^@?[a-zA-Z0-9_]{1,15}$/;
    return twitterPattern.test(value) && !value.includes('.');
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

// Load image with CORS fallback
function loadImageWithFallback(url, callback) {
    // For external avatar services, skip CORS attempt as they often don't support it
    const skipCorsUrls = ['unavatar.io', 'twitter.com', 'pbs.twimg.com'];
    const shouldSkipCors = skipCorsUrls.some(domain => url.includes(domain));

    const img = new Image();

    if (!shouldSkipCors) {
        // Try with crossOrigin for clipboard support
        img.crossOrigin = 'anonymous';
    }

    img.onload = function () {
        callback(img);
    };

    img.onerror = function () {
        // If CORS was attempted, retry without it
        if (!shouldSkipCors) {
            const imgNoCors = new Image();
            imgNoCors.onload = function () {
                callback(imgNoCors);
            };
            imgNoCors.onerror = function () {
                callback(null);
            };
            // Add timestamp to bust cache for the retry
            const separator = url.includes('?') ? '&' : '?';
            imgNoCors.src = url + separator + '_t=' + Date.now();
        } else {
            callback(null);
        }
    };

    img.src = url;
}

function removeImage(id) {
    images = images.filter(img => img.id !== id);
    saveToStorage();
    renderGallery();
}

function clearAll() {
    if (images.length === 0) return;
    if (confirm('Möchten Sie wirklich alle Bilder löschen?')) {
        images = [];
        saveToStorage();
        renderGallery();
    }
}

// Canvas export
async function copyCanvasToClipboard() {
    const canvas = document.getElementById('imageCanvas');
    const includeBackground = document.getElementById('includeBackground').checked;

    if (images.length === 0) {
        alert('Keine Bilder vorhanden zum Kopieren.');
        return;
    }

    let exportCanvas = canvas;
    try {
        if (!includeBackground) {
            exportCanvas = document.createElement('canvas');
            exportCanvas.width = canvas.width;
            exportCanvas.height = canvas.height;
            const exportCtx = exportCanvas.getContext('2d');
            exportCtx.drawImage(canvas, 0, 0);
        }

        const blob = await new Promise((resolve, reject) => {
            try {
                exportCanvas.toBlob((b) => {
                    if (b) {
                        resolve(b);
                    } else {
                        reject(new Error('Blob creation failed'));
                    }
                }, 'image/png');
            } catch (e) {
                reject(e);
            }
        });

        if (!navigator.clipboard || !navigator.clipboard.write) {
            throw new Error('ClipboardAPI not supported');
        }

        await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob })
        ]);

        showCopySuccess();
    } catch (err) {
        console.error('Fehler beim Kopieren:', err);

        if (err.name === 'SecurityError' || (err.message && err.message.toLowerCase().includes('tainted'))) {
            alert('Kopieren fehlgeschlagen: Einige Bilder (z.B. Twitter-Profilbilder) können aus Sicherheitsgründen nicht exportiert werden. Bitte speichern Sie das Canvas manuell über Rechtsklick.');
            return;
        }

        if (!navigator.clipboard || !navigator.clipboard.write || err.name === 'NotAllowedError' || err.name === 'TypeError') {
            // Fallback: Download the PNG file instead of clipboard copy
            downloadCanvasAsPng(exportCanvas, 'twitter-kreis.png');
            alert('Zwischenablage nicht verfügbar. Das Bild wurde stattdessen heruntergeladen.');
            return;
        }

        alert('Kopieren fehlgeschlagen. Möglicherweise wird diese Funktion von Ihrem Browser nicht unterstützt.');
    }
}

function showCanvasAsPng() {
    const canvas = document.getElementById('imageCanvas');
    const includeBackground = document.getElementById('includeBackground').checked;

    if (images.length === 0) {
        alert('Keine Bilder vorhanden zum Anzeigen.');
        return;
    }

    let exportCanvas = canvas;
    if (!includeBackground) {
        exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const exportCtx = exportCanvas.getContext('2d');
        exportCtx.drawImage(canvas, 0, 0);
    }

    try {
        const dataUrl = exportCanvas.toDataURL('image/png');
        displayCanvasPreview(dataUrl);
    } catch (err) {
        console.error('Canvas als PNG anzeigen fehlgeschlagen:', err);
        if (err.name === 'SecurityError' || (err.message && err.message.toLowerCase().includes('tainted'))) {
            alert('Das Canvas konnte aufgrund von CORS/Sicherheitsbeschränkungen nicht als PNG angezeigt werden. Bitte speichern Sie es manuell per Rechtsklick.');
        } else {
            alert('Das Canvas konnte nicht als PNG angezeigt werden. Bitte versuchen Sie es erneut.');
        }
    }
}

function displayCanvasPreview(dataUrl) {
    const previewContainer = document.getElementById('pngPreviewContainer');
    previewContainer.innerHTML = `
        <div class="png-preview-box">
            <h3>PNG-Vorschau</h3>
            <img src="${dataUrl}" alt="Canvas PNG-Vorschau" style="max-width:100%; display:block; margin: 10px 0;">
            <a class="btn btn-secondary" href="${dataUrl}" download="twitter-kreis.png">PNG herunterladen</a>
        </div>
    `;
}

function showCopySuccess() {
    const successMsg = document.getElementById('copySuccess');
    successMsg.classList.add('show');
    setTimeout(() => {
        successMsg.classList.remove('show');
    }, 2000);
}

function downloadCanvasAsPng(canvas, fileName) {
    try {
        canvas.toBlob((blob) => {
            if (!blob) {
                alert('Das Bild konnte nicht erstellt werden.');
                return;
            }

            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(link.href);
        }, 'image/png');
    } catch (e) {
        console.error('Download-Fallback fehlgeschlagen:', e);
        alert('Das Bild konnte nicht exportiert werden. Bitte verwenden Sie die Browser-Rechtsklick-Funktion, um das Bild manuell zu speichern.');
    }
}

// Error handling for images
function handleImageError(imgElement, cardElement) {
    const wrapper = imgElement.parentElement;
    const errorOverlay = document.createElement('div');
    errorOverlay.className = 'error-overlay';
    errorOverlay.textContent = 'Bild konnte nicht geladen werden';
    wrapper.appendChild(errorOverlay);
    imgElement.style.display = 'none';
}

// Gallery rendering
function renderGallery() {
    const gallery = document.getElementById('gallery');
    const emptyState = document.getElementById('emptyState');

    if (images.length === 0) {
        gallery.innerHTML = '';
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';

        gallery.innerHTML = images.map((img, index) => `
            <div class="image-item" data-id="${img.id}" data-index="${index}" draggable="true">
                <span class="drag-handle">☰</span>
                <span class="item-number">${index + 1}</span>
                <img class="item-thumbnail" src="${img.url}" alt="Bild" onerror="this.style.display='none'">
                <span class="item-url" title="${img.url}">${img.url}</span>
                <div class="item-actions">
                    <button class="btn-move" onclick="moveImage(${index}, -1)" ${index === 0 ? 'disabled' : ''} title="Nach oben">▲</button>
                    <button class="btn-move" onclick="moveImage(${index}, 1)" ${index === images.length - 1 ? 'disabled' : ''} title="Nach unten">▼</button>
                    <button class="btn-remove" onclick="removeImage(${img.id})" title="Entfernen">✕</button>
                </div>
            </div>
        `).join('');

        setupListDragAndDrop();
    }

    renderCanvas();
}

function moveImage(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= images.length) return;

    const temp = images[index];
    images[index] = images[newIndex];
    images[newIndex] = temp;

    saveToStorage();
    renderGallery();
}

function setupListDragAndDrop() {
    const items = document.querySelectorAll('.image-item');
    let draggedItem = null;

    items.forEach(item => {
        item.addEventListener('dragstart', function (e) {
            draggedItem = this;
            isInternalDrag = true;
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', this.dataset.index);
        });

        item.addEventListener('dragend', function () {
            this.classList.remove('dragging');
            items.forEach(i => i.classList.remove('drag-over'));
            draggedItem = null;
            isInternalDrag = false;
        });

        item.addEventListener('dragover', function (e) {
            e.preventDefault();
            if (draggedItem && draggedItem !== this) {
                this.classList.add('drag-over');
            }
        });

        item.addEventListener('dragleave', function () {
            this.classList.remove('drag-over');
        });

        item.addEventListener('drop', function (e) {
            e.preventDefault();
            e.stopPropagation();
            this.classList.remove('drag-over');

            if (draggedItem && draggedItem !== this) {
                const fromIndex = parseInt(draggedItem.dataset.index);
                const toIndex = parseInt(this.dataset.index);

                const movedItem = images.splice(fromIndex, 1)[0];
                images.splice(toIndex, 0, movedItem);

                saveToStorage();
                renderGallery();
            }
        });
    });
}

// Canvas rendering
function renderCanvas() {
    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');
    const canvasEmpty = document.getElementById('canvasEmpty');
    const colors = getThemeColors();

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (images.length === 0) {
        canvas.style.display = 'none';
        canvasEmpty.style.display = 'block';
        return;
    }

    canvas.style.display = 'block';
    canvasEmpty.style.display = 'none';

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Size configuration
    const centerRadius = 100;
    const innerCircleRadius = 70;
    const outerCircleRadius = 45;
    const innerOrbitRadius = 220;
    const outerOrbitRadius = 360;

    // Max images per ring
    const maxInnerRing = 8;
    const maxOuterRing = 21;

    // Load and draw all images (max 30)
    const imagesToRender = images.slice(0, 30);
    const loadedImages = [];
    let loadedCount = 0;

    imagesToRender.forEach((imgData, index) => {
        loadImageWithFallback(imgData.url, (img) => {
            loadedImages[index] = img;
            loadedCount++;
            if (loadedCount === imagesToRender.length) {
                drawAllImages();
            }
        });
    });

    function drawAllImages() {
        // Redraw background
        ctx.fillStyle = colors.background;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw center image (first image)
        if (loadedImages[0]) {
            drawCircularImage(ctx, loadedImages[0], centerX, centerY, centerRadius);

            // Draw border for center
            ctx.beginPath();
            ctx.arc(centerX, centerY, centerRadius + 3, 0, Math.PI * 2);
            ctx.strokeStyle = colors.accent;
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        // Inner ring: images 2-9 (indices 1-8)
        const innerRingImages = loadedImages.slice(1, 1 + maxInnerRing);
        const innerCount = innerRingImages.length;
        const innerAngleStep = innerCount > 0 ? (Math.PI * 2) / innerCount : 0;
        // Offset inner ring by half its own step so images don't start at top
        const innerOffset = innerAngleStep / 2;

        if (innerCount > 0) {
            innerRingImages.forEach((img, index) => {
                if (img) {
                    const angle = innerAngleStep * index - Math.PI / 2 + innerOffset;
                    const x = centerX + Math.cos(angle) * innerOrbitRadius;
                    const y = centerY + Math.sin(angle) * innerOrbitRadius;

                    drawCircularImage(ctx, img, x, y, innerCircleRadius);

                    ctx.beginPath();
                    ctx.arc(x, y, innerCircleRadius + 2, 0, Math.PI * 2);
                    ctx.strokeStyle = colors.accent;
                    ctx.lineWidth = 3;
                    ctx.stroke();
                }
            });
        }

        // Outer ring: images 10-30 (indices 9-29)
        const outerRingImages = loadedImages.slice(1 + maxInnerRing, 1 + maxInnerRing + maxOuterRing);
        const outerCount = outerRingImages.length;
        const outerAngleStep = outerCount > 0 ? (Math.PI * 2) / outerCount : 0;
        // Offset outer ring by half its own step, ensuring it doesn't align with inner ring
        const outerOffset = outerAngleStep / 2;

        if (outerCount > 0) {
            outerRingImages.forEach((img, index) => {
                if (img) {
                    const angle = outerAngleStep * index - Math.PI / 2 + outerOffset;
                    const x = centerX + Math.cos(angle) * outerOrbitRadius;
                    const y = centerY + Math.sin(angle) * outerOrbitRadius;

                    drawCircularImage(ctx, img, x, y, outerCircleRadius);

                    ctx.beginPath();
                    ctx.arc(x, y, outerCircleRadius + 2, 0, Math.PI * 2);
                    ctx.strokeStyle = colors.accent;
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            });
        }
    }
}

function drawCircularImage(ctx, img, x, y, radius) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Calculate dimensions to cover the circle
    const size = radius * 2;
    const aspectRatio = img.width / img.height;
    let drawWidth, drawHeight, offsetX, offsetY;

    if (aspectRatio > 1) {
        drawHeight = size;
        drawWidth = size * aspectRatio;
        offsetX = x - drawWidth / 2;
        offsetY = y - radius;
    } else {
        drawWidth = size;
        drawHeight = size / aspectRatio;
        offsetX = x - radius;
        offsetY = y - drawHeight / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    ctx.restore();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);