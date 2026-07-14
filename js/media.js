let cropperInstance = null;
let cropType = '';

function triggerSmartUpload(type) {
    let inputId = type === 'main' ? 'p-photo-hidden' : 'p-fruit-photo-hidden';
    const inputEl = document.getElementById(inputId);
    if (inputEl) inputEl.click();
}

function handleSmartUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({icon: 'error', title: 'File non valido', text: 'Per favore seleziona un\'immagine valida (JPG, PNG).', confirmButtonColor: '#2e7d32'});
        } else {
            alert('File non valido.');
        }
        event.target.value = '';
        return;
    }

    if (typeof Cropper === 'undefined') {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'info',
                title: 'Modalità Offline',
                text: 'Lo strumento di ritaglio avanzato non è disponibile. La foto verrà ridimensionata automaticamente.',
                toast: true,
                position: 'top-end',
                timer: 4000,
                showConfirmButton: false
            });
        }
        
        compressImageAsync(file).then(blob => {
            if (window.smartCropBlobs && window.smartCropBlobs[type] && typeof revokeBlob === 'function') {
                revokeBlob(window.smartCropBlobs[type]);
            }
            if (window.smartCropBlobs) window.smartCropBlobs[type] = blob;
            
            const preview = document.getElementById('preview-' + type);
            const placeholder = document.getElementById('placeholder-' + type);
            const removeBtn = document.getElementById('remove-btn-' + type);
            
            if (preview && placeholder && removeBtn) {
                if(preview.src && preview.src.startsWith('blob:')) {
                    URL.revokeObjectURL(preview.src);
                }
                const newUrl = URL.createObjectURL(blob);
                blob._url = newUrl;
                preview.src = newUrl;
                preview.style.display = 'block';
                placeholder.style.display = 'none';
                removeBtn.style.display = 'block';
            }
            
            if(type === 'main') mainPhotoRemoved = false;
            if(type === 'fruit') fruitPhotoRemoved = false;
            
            isFormDirty = true;
        }).catch(err => {
            console.error(err);
        });
        
        event.target.value = '';
        return;
    }

    cropType = type;
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const img = document.getElementById('cropper-img');
        if (!img) return;

        img.onload = () => {
            const modal = document.getElementById('cropper-modal');
            if (modal) modal.style.display = 'flex';
            
            document.body.style.overflow = 'hidden';

            if (cropperInstance) { cropperInstance.destroy(); }
            
            try {
                cropperInstance = new Cropper(img, {
                    aspectRatio: 1, 
                    viewMode: 1,    
                    dragMode: 'move', 
                    autoCropArea: 1,
                    cropBoxMovable: false,
                    cropBoxResizable: false,
                    guides: false,
                    center: false,
                    highlight: false,
                    background: false,
                    toggleDragModeOnDblclick: false
                });
            } catch (err) {
                console.error(err);
                closeCropper();
            }
        };

        img.onerror = () => {
            if (typeof Swal !== 'undefined') Swal.fire({icon: 'error', title: 'Errore', text: 'Impossibile leggere l\'immagine.', confirmButtonColor: '#d32f2f'});
            closeCropper();
        };

        img.src = e.target.result;
    };
    
    reader.onerror = () => {
        if (typeof Swal !== 'undefined') Swal.fire({icon: 'error', title: 'Errore di Lettura', text: 'File danneggiato o inaccessibile.', confirmButtonColor: '#d32f2f'});
        event.target.value = '';
    };

    reader.readAsDataURL(file);
}

function closeCropper() {
    const modal = document.getElementById('cropper-modal');
    if (modal) modal.style.display = 'none';
    
    document.body.style.overflow = '';

    if (cropperInstance) {
        cropperInstance.destroy();
        cropperInstance = null;
    }
    
    const img = document.getElementById('cropper-img');
    if (img) {
        img.src = '';
        img.onload = null;
        img.onerror = null;
    }
    
    const pPhotoHidden = document.getElementById('p-photo-hidden');
    const pFruitPhotoHidden = document.getElementById('p-fruit-photo-hidden');
    if (pPhotoHidden) pPhotoHidden.value = '';
    if (pFruitPhotoHidden) pFruitPhotoHidden.value = '';
}

function confirmCropper() {
    if (!cropperInstance) return;
    
    const canvas = cropperInstance.getCroppedCanvas({
        width: typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.IMG_MAX_DIMENSION : 1200, 
        height: typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.IMG_MAX_DIMENSION : 1200,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
    });

    if (!canvas) {
        closeCropper();
        return;
    }
    
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const exportQuality = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.IMG_QUALITY_HIGH : 0.72;

    canvas.toBlob((blob) => {
        if (!blob) {
            closeCropper();
            return;
        }

        if (window.smartCropBlobs && window.smartCropBlobs[cropType] && typeof revokeBlob === 'function') {
            revokeBlob(window.smartCropBlobs[cropType]);
        }

        if (window.smartCropBlobs) window.smartCropBlobs[cropType] = blob;
        
        const preview = document.getElementById('preview-' + cropType);
        const placeholder = document.getElementById('placeholder-' + cropType);
        const removeBtn = document.getElementById('remove-btn-' + cropType);
        
        if (preview && placeholder && removeBtn) {
            if(preview.src && preview.src.startsWith('blob:')) {
                URL.revokeObjectURL(preview.src);
            }
            const newUrl = URL.createObjectURL(blob);
            blob._url = newUrl;
            preview.src = newUrl;
            preview.style.display = 'block';
            placeholder.style.display = 'none';
            removeBtn.style.display = 'block';
        }
        
        if(cropType === 'main') mainPhotoRemoved = false;
        if(cropType === 'fruit') fruitPhotoRemoved = false;
        
        isFormDirty = true;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.width = 0;
        canvas.height = 0;

        closeCropper();
    }, 'image/webp', exportQuality);
}

function removeSmartPhoto(event, type) {
    if (event) event.stopPropagation(); 
    
    if(window.smartCropBlobs && window.smartCropBlobs[type]) {
        if(typeof revokeBlob === 'function') revokeBlob(window.smartCropBlobs[type]);
        window.smartCropBlobs[type] = null;
    }
    
    const preview = document.getElementById('preview-' + type);
    if (preview) {
        if (preview.src && preview.src.startsWith('blob:')) {
            URL.revokeObjectURL(preview.src);
        }
        preview.src = '';
        preview.style.display = 'none';
    }
    
    const placeholder = document.getElementById('placeholder-' + type);
    const removeBtn = document.getElementById('remove-btn-' + type);
    if (placeholder) placeholder.style.display = 'flex';
    if (removeBtn) removeBtn.style.display = 'none';
    
    if(type === 'main') {
        mainPhotoRemoved = true;
        const inMain = document.getElementById('p-photo-hidden');
        if(inMain) inMain.value = '';
    }
    if(type === 'fruit') {
        fruitPhotoRemoved = true;
        const inFruit = document.getElementById('p-fruit-photo-hidden');
        if(inFruit) inFruit.value = '';
    }
    
    isFormDirty = true;
}

function openImageModal(src, label, plantId = null) {
    try { let parsedUrl = new URL(src); if (parsedUrl.hostname === 'via.placeholder.com') return; } catch (e) {}

    let modal = document.getElementById('fullscreen-image-modal');
    if (!modal) {
        modal = document.createElement('div'); 
        modal.id = 'fullscreen-image-modal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.95)';
        modal.style.zIndex = '100000';
        modal.style.display = 'flex';
        modal.style.flexDirection = 'column';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.className = 'animate__animated animate__fadeIn';
        modal.style.animationDuration = '0.3s';
        
        modal.onclick = function(e) { 
            if(e.target === modal) {
                modal.style.display = 'none'; 
                document.body.style.overflow = ''; 
            }
        };

        const img = document.createElement('img'); 
        img.id = 'fullscreen-image-element';
        img.style.maxWidth = '95%';
        img.style.maxHeight = '80%';
        img.style.borderRadius = '8px';
        img.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
        
        img.onerror = function() {
            this.onerror = null;
            this.src = typeof OFFLINE_PLACEHOLDER !== 'undefined' ? OFFLINE_PLACEHOLDER : '';
        };
        
        const title = document.createElement('div'); 
        title.id = 'fullscreen-image-title';
        title.style.color = 'white';
        title.style.marginTop = '15px';
        title.style.fontSize = '16px';
        title.style.fontWeight = 'bold';
        title.style.textAlign = 'center';
        title.style.padding = '0 15px';

        const btnContainer = document.createElement('div');
        btnContainer.style.position = 'absolute';
        btnContainer.style.top = '20px';
        btnContainer.style.right = '20px';
        btnContainer.style.display = 'flex';
        btnContainer.style.gap = '10px';

        const goToPlantBtn = document.createElement('button');
        goToPlantBtn.id = 'fullscreen-goto-btn';
        goToPlantBtn.innerText = '🌿 Vai alla pianta';
        goToPlantBtn.className = 'btn btn-primary';
        goToPlantBtn.style.margin = '0';

        const closeBtn = document.createElement('button'); 
        closeBtn.innerText = '✖ Chiudi'; 
        closeBtn.className = 'btn btn-grey'; 
        closeBtn.style.margin = '0';
        closeBtn.onclick = function() { 
            modal.style.display = 'none'; 
            document.body.style.overflow = ''; 
        };

        btnContainer.appendChild(goToPlantBtn);
        btnContainer.appendChild(closeBtn);

        modal.appendChild(img); 
        modal.appendChild(title); 
        modal.appendChild(btnContainer); 
        document.body.appendChild(modal);
    }
    
    document.getElementById('fullscreen-image-element').src = src; 
    document.getElementById('fullscreen-image-title').innerText = label;
    
    const gotoBtn = document.getElementById('fullscreen-goto-btn');
    if (plantId) {
        gotoBtn.style.display = 'block';
        gotoBtn.onclick = function() {
            modal.style.display = 'none'; 
            document.body.style.overflow = ''; 
            if (typeof navigateTo === 'function') navigateTo('plant-detail', plantId); 
        };
    } else {
        gotoBtn.style.display = 'none'; 
    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; 
}

function renderGallery() {
    const grid = document.getElementById('gallery-grid'); 
    if (!grid) return;
    
    grid.innerHTML = '';
    let allPhotos = [];
    
    if (typeof plantsDatabase !== 'undefined' && Array.isArray(plantsDatabase)) {
        plantsDatabase.forEach(p => {
            if(p.photo) allPhotos.push({ src: p.photo, label: p.name + " (Intera)", plantId: p.id });
            if(p.fruitPhoto) allPhotos.push({ src: p.fruitPhoto, label: p.name + " (Frutto)", plantId: p.id });
            if(p.logs && Array.isArray(p.logs)) {
                p.logs.forEach(log => {
                    if(log.photos && Array.isArray(log.photos) && log.photos.length > 0) {
                        log.photos.forEach((ph) => { 
                            let logDateStr = typeof formatDateIt === 'function' ? formatDateIt(log.date) : log.date;
                            allPhotos.push({ src: ph, label: p.name + ` (Diario: ${logDateStr})`, plantId: p.id }); 
                        });
                    }
                });
            }
        });
    }
    
    if (typeof wishlist !== 'undefined' && Array.isArray(wishlist)) {
        wishlist.forEach(w => {
            if(w.photo) allPhotos.push({ src: w.photo, label: w.name + " (Wishlist)", plantId: null });
        });
    }
    
    if(allPhotos.length === 0) {
        grid.innerHTML = '<p style="color: #555; grid-column: 1/-1; text-align:center;">Nessuna foto salvata nel database.</p>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    const fallbackSrc = typeof OFFLINE_PLACEHOLDER !== 'undefined' ? OFFLINE_PLACEHOLDER : '';

    allPhotos.forEach(photoObj => {
        const div = document.createElement('div'); 
        div.style.position = 'relative'; 
        div.style.cursor = 'pointer';
        
        let imgSrc = (typeof getImageUrl === 'function') ? getImageUrl(photoObj.src) : photoObj.src;
        let safeLabel = escapeHTML(photoObj.label);

        div.innerHTML = `
            <img src="${imgSrc}" onerror="this.onerror=null; this.src='${fallbackSrc}';" style="width:100%; height:150px; object-fit:cover; border-radius:6px; border:1px solid #ccc;" title="${safeLabel}" alt="Foto">
            <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.6); color:white; font-size:11px; padding:6px; border-bottom-left-radius:6px; border-bottom-right-radius:6px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${safeLabel}
            </div>
        `;
        div.onclick = () => { openImageModal(imgSrc, photoObj.label.replace(/&#39;/g, "\\'"), photoObj.plantId); };
        fragment.appendChild(div);
    });
    grid.appendChild(fragment);
}

function startScanner() { 
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (typeof Swal !== 'undefined') {
            return Swal.fire({
                icon: 'error',
                title: 'Fotocamera Bloccata',
                text: 'Il tuo browser sta bloccando l\'accesso alla fotocamera. Assicurati di non essere in modalità incognito e di aver concesso i permessi.',
                confirmButtonColor: '#d32f2f'
            });
        }
        return;
    }

    if(html5QrcodeScanner) return; 
    
    try {
        if (typeof Html5QrcodeScanner !== 'undefined') {
            html5QrcodeScanner = new Html5QrcodeScanner("reader", { fps: 10, qrbox: {width: 250, height: 250} }, false); 
            html5QrcodeScanner.render(onScanSuccess, onScanFailure); 
        } else {
            throw new Error("Libreria Scanner mancante");
        }
    } catch(e) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning', 
                title: 'Scanner Offline', 
                text: 'La libreria dello Scanner QR non è stata caricata. Collegati a internet e riavvia l\'app per abilitarla.', 
                confirmButtonColor: '#f57f17'
            });
        }
    }
}

function onScanSuccess(decodedText, decodedResult) {
    try {
        let data = JSON.parse(decodedText);
        if(data && data.plant_id) {
            if (html5QrcodeScanner) {
                html5QrcodeScanner.clear().then(() => {
                    html5QrcodeScanner = null; 
                    processScanData(data.plant_id);
                }).catch(() => {
                    html5QrcodeScanner = null;
                    processScanData(data.plant_id);
                });
            } else {
                processScanData(data.plant_id);
            }
        } else { 
            throw new Error("Formato errato"); 
        }
    } catch(e) { 
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'warning', 
                title: 'Codice non valido', 
                text: 'Questo QR non appartiene a questo gestionale.', 
                confirmButtonColor: '#f57f17'
            });
        }
    }
}

function processScanData(plantId) {
    const exists = typeof plantsDatabase !== 'undefined' ? plantsDatabase.find(p => p.id == plantId) : null;
    if(exists) { 
        if(typeof navigateTo === 'function') navigateTo('plant-detail', plantId); 
    } else { 
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error', 
                title: 'Non trovata!', 
                text: 'Questa pianta non è presente nel database. Forse è stata eliminata o sei in un giardino diverso.', 
                confirmButtonColor: '#2e7d32'
            }).then(() => { if(typeof navigateTo === 'function') navigateTo('dashboard'); });
        }
    }
}

function onScanFailure(error) {}

window.addEventListener('popstate', () => {
    if(html5QrcodeScanner) {
        try {
            html5QrcodeScanner.clear().catch(e => {});
        } catch(e) {}
        html5QrcodeScanner = null;
    }
});

function compressImageAsync(file) {
    return new Promise(async (resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) {
            return reject(new Error('File non valido per la compressione'));
        }

        const MAX_DIM = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.IMG_MAX_DIMENSION : 1200;
        const threshold = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.IMG_COMPRESSION_THRESHOLD : 2000000;
        const qLow = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.IMG_QUALITY_LOW : 0.60;
        const qHigh = typeof APP_CONFIG !== 'undefined' ? APP_CONFIG.IMG_QUALITY_HIGH : 0.72;
        
        const targetQuality = file.size > threshold ? qLow : qHigh;

        try {
            if (window.createImageBitmap) {
                const bitmap = await window.createImageBitmap(file, { imageOrientation: 'from-image' });
                const imgWidth = bitmap.width;
                const imgHeight = bitmap.height;
                const ratio = Math.min(1, MAX_DIM / Math.max(imgWidth, imgHeight));
                const width = Math.max(1, Math.round(imgWidth * ratio));
                const height = Math.max(1, Math.round(imgHeight * ratio));

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    bitmap.close();
                    return reject(new Error('Impossibile creare il canvas di elaborazione'));
                }

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(bitmap, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    ctx.clearRect(0, 0, width, height);
                    canvas.width = 0;
                    canvas.height = 0;
                    bitmap.close();

                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('Errore durante la creazione del WebP'));
                    }
                }, 'image/webp', targetQuality);

            } else {
                const reader = new FileReader();
                reader.onload = function (event) {
                    const img = new Image();

                    img.onload = function () {
                        const imgWidth = img.naturalWidth || img.width;
                        const imgHeight = img.naturalHeight || img.height;
                        const ratio = Math.min(1, MAX_DIM / Math.max(imgWidth, imgHeight));
                        const width = Math.max(1, Math.round(imgWidth * ratio));
                        const height = Math.max(1, Math.round(imgHeight * ratio));

                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');

                        if (!ctx) {
                            img.onload = null;
                            img.onerror = null;
                            img.src = '';
                            return reject(new Error('Impossibile creare il canvas di elaborazione'));
                        }

                        ctx.fillStyle = '#ffffff';
                        ctx.fillRect(0, 0, width, height);
                        ctx.drawImage(img, 0, 0, width, height);

                        canvas.toBlob((blob) => {
                            ctx.clearRect(0, 0, width, height);
                            canvas.width = 0;
                            canvas.height = 0;

                            img.onload = null;
                            img.onerror = null;
                            img.src = '';

                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(new Error('Errore durante la creazione del WebP'));
                            }
                        }, 'image/webp', targetQuality);
                    };

                    img.onerror = function () {
                        reject(new Error("L'immagine è danneggiata e non può essere ridimensionata"));
                    };

                    img.src = event.target.result;
                };

                reader.onerror = function () {
                    reject(new Error('Errore di lettura dal dispositivo'));
                };

                reader.readAsDataURL(file);
            }
        } catch (error) {
            console.error("Errore imprevisto durante la compressione:", error);
            reject(error);
        }
    });
}