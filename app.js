/**
 * PDF Merge & Compress - REAL PDF Compression using PDF.js + jsPDF
 * 
 * How it works:
 * 1. PDF.js renders each page to a canvas at configurable DPI
 * 2. Canvas is exported as compressed JPEG with configurable quality
 * 3. jsPDF creates a new PDF from the compressed images
 * 
 * This provides REAL compression, not just structural optimization!
 * All processing happens 100% in the browser.
 */

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const processingSection = document.getElementById('processing-section');
const resultSection = document.getElementById('result-section');
const errorSection = document.getElementById('error-section');

const fileNameEl = document.getElementById('file-name');
const fileSizeEl = document.getElementById('file-size');
const optionBtns = document.querySelectorAll('.option-btn');
const compressBtn = document.getElementById('compress-btn');
const progressContainer = document.getElementById('progress-container');
const progressFill = document.getElementById('progress-fill');
const currentPageEl = document.getElementById('current-page');
const totalPagesEl = document.getElementById('total-pages');

const originalSizeEl = document.getElementById('original-size');
const newSizeEl = document.getElementById('new-size');
const savingsEl = document.getElementById('savings');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');
const errorResetBtn = document.getElementById('error-reset-btn');
const errorMessage = document.getElementById('error-message');

// Custom controls
const customToggle = document.getElementById('custom-toggle');
const customSliders = document.getElementById('custom-sliders');
const dpiSlider = document.getElementById('dpi-slider');
const qualitySlider = document.getElementById('quality-slider');
const dpiValue = document.getElementById('dpi-value');
const qualityValue = document.getElementById('quality-value');

// State
let currentFile = null;
let compressedPdfBlob = null;
let compressionLevel = 'medium';
let useCustomSettings = false;
let customDpi = 120;
let customQuality = 75;

// Compression presets - 5 levels from minimal to maximum
const COMPRESSION_SETTINGS = {
    minimal: {
        dpi: 200,
        quality: 0.90,
        description: 'Minimal compression - best quality'
    },
    low: {
        dpi: 150,
        quality: 0.85,
        description: 'Low compression - high quality'
    },
    medium: {
        dpi: 120,
        quality: 0.75,
        description: 'Balanced compression'
    },
    high: {
        dpi: 96,
        quality: 0.60,
        description: 'High compression'
    },
    maximum: {
        dpi: 72,
        quality: 0.50,
        description: 'Maximum compression - smallest size'
    }
};

// Utility Functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showSection(section) {
    uploadSection.classList.add('hidden');
    processingSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    errorSection.classList.add('hidden');
    section.classList.remove('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    showSection(errorSection);
}

function updateProgress(current, total) {
    currentPageEl.textContent = current;
    totalPagesEl.textContent = total;
    const percent = (current / total) * 100;
    progressFill.style.width = `${percent}%`;
}

function reset() {
    currentFile = null;
    compressedPdfBlob = null;
    compressionLevel = 'medium';
    useCustomSettings = false;

    // Reset compression options
    optionBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.level === 'medium');
    });

    // Reset custom sliders
    dpiSlider.value = 120;
    qualitySlider.value = 75;
    dpiValue.textContent = '120 DPI';
    qualityValue.textContent = '75%';
    customSliders.classList.add('hidden');
    customToggle.classList.remove('open');

    // Reset button state
    const btnText = compressBtn.querySelector('.btn-text');
    const btnLoader = compressBtn.querySelector('.btn-loader');
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
    compressBtn.disabled = false;
    progressContainer.classList.add('hidden');
    progressFill.style.width = '0%';

    showSection(uploadSection);
}

// Convert DPI to scale factor (PDF.js uses 72 DPI as base)
function dpiToScale(dpi) {
    return dpi / 72;
}

// Drag and Drop Handlers
dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// File Handling
function handleFile(file) {
    // Validate file type
    if (file.type !== 'application/pdf') {
        showError('Please select a valid PDF file.');
        return;
    }

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
        showError('File size exceeds 100MB limit. Please select a smaller file.');
        return;
    }

    currentFile = file;
    fileNameEl.textContent = file.name;
    fileSizeEl.textContent = formatFileSize(file.size);
    showSection(processingSection);
}

// Compression Preset Options
optionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        optionBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        compressionLevel = btn.dataset.level;
        useCustomSettings = false;

        // Update sliders to match preset
        const settings = COMPRESSION_SETTINGS[compressionLevel];
        if (settings) {
            dpiSlider.value = settings.dpi;
            qualitySlider.value = Math.round(settings.quality * 100);
            dpiValue.textContent = `${settings.dpi} DPI`;
            qualityValue.textContent = `${Math.round(settings.quality * 100)}%`;
        }
    });
});

// Custom Settings Toggle
customToggle.addEventListener('click', () => {
    customSliders.classList.toggle('hidden');
    customToggle.classList.toggle('open');
});

// Custom Sliders
dpiSlider.addEventListener('input', () => {
    customDpi = parseInt(dpiSlider.value);
    dpiValue.textContent = `${customDpi} DPI`;
    useCustomSettings = true;

    // Deactivate presets when using custom
    optionBtns.forEach(b => b.classList.remove('active'));
});

qualitySlider.addEventListener('input', () => {
    customQuality = parseInt(qualitySlider.value);
    qualityValue.textContent = `${customQuality}%`;
    useCustomSettings = true;

    // Deactivate presets when using custom
    optionBtns.forEach(b => b.classList.remove('active'));
});

// Get current compression settings
function getCurrentSettings() {
    if (useCustomSettings) {
        return {
            dpi: customDpi,
            quality: customQuality / 100,
            scale: dpiToScale(customDpi)
        };
    }

    const preset = COMPRESSION_SETTINGS[compressionLevel];
    return {
        dpi: preset.dpi,
        quality: preset.quality,
        scale: dpiToScale(preset.dpi)
    };
}

// PDF Compression using PDF.js + jsPDF
compressBtn.addEventListener('click', async () => {
    if (!currentFile) return;

    const btnText = compressBtn.querySelector('.btn-text');
    const btnLoader = compressBtn.querySelector('.btn-loader');

    // Show loading state
    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    compressBtn.disabled = true;
    progressContainer.classList.remove('hidden');

    try {
        const arrayBuffer = await currentFile.arrayBuffer();
        const settings = getCurrentSettings();
        compressedPdfBlob = await compressPdfWithRendering(arrayBuffer, settings);

        // Calculate stats
        const originalSize = currentFile.size;
        const newSize = compressedPdfBlob.size;
        const savedPercent = Math.round((1 - newSize / originalSize) * 100);

        originalSizeEl.textContent = formatFileSize(originalSize);
        newSizeEl.textContent = formatFileSize(newSize);

        if (savedPercent > 0) {
            savingsEl.textContent = `${savedPercent}%`;
            savingsEl.style.color = '';
        } else {
            savingsEl.textContent = `+${Math.abs(savedPercent)}% (larger)`;
            savingsEl.style.color = 'var(--error)';
        }

        showSection(resultSection);
    } catch (error) {
        console.error('Compression error:', error);
        showError(`Unable to process the PDF file: ${error.message}`);
    }
});

/**
 * Real PDF compression by rendering pages and recompressing as JPEG
 * This actually reduces file size significantly!
 */
async function compressPdfWithRendering(arrayBuffer, settings) {
    // Load the PDF with PDF.js
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    totalPagesEl.textContent = numPages;

    // Create jsPDF instance - we'll set size based on first page
    const { jsPDF } = window.jspdf;
    let pdf = null;

    // Process each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        updateProgress(pageNum, numPages);

        const page = await pdfDoc.getPage(pageNum);

        // Get page dimensions at the specified scale
        const viewport = page.getViewport({ scale: settings.scale });

        // Create canvas to render the page
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render the page to canvas
        await page.render({
            canvasContext: context,
            viewport: viewport
        }).promise;

        // Convert canvas to JPEG data URL with compression
        const imgData = canvas.toDataURL('image/jpeg', settings.quality);

        // Calculate page dimensions in mm for jsPDF
        // PDF.js uses 72 DPI as base, so we need to convert
        const pdfWidth = (viewport.width / settings.scale) * 25.4 / 72;  // Convert to mm
        const pdfHeight = (viewport.height / settings.scale) * 25.4 / 72;

        if (pageNum === 1) {
            // Initialize PDF with first page dimensions
            const orientation = pdfWidth > pdfHeight ? 'landscape' : 'portrait';
            pdf = new jsPDF({
                orientation: orientation,
                unit: 'mm',
                format: [pdfWidth, pdfHeight]
            });
        } else {
            // Add new page with correct dimensions
            const orientation = pdfWidth > pdfHeight ? 'landscape' : 'portrait';
            pdf.addPage([pdfWidth, pdfHeight], orientation);
        }

        // Add the compressed image to the PDF page
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

        // Small delay to prevent UI freezing on large documents
        if (pageNum % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    // Get the compressed PDF as blob
    const pdfBlob = pdf.output('blob');

    return pdfBlob;
}

// Download Handler
downloadBtn.addEventListener('click', () => {
    if (!compressedPdfBlob) return;

    const url = URL.createObjectURL(compressedPdfBlob);
    const link = document.createElement('a');

    // Generate filename
    const originalName = currentFile.name.replace(/\.pdf$/i, '');
    link.download = `${originalName}_compressed.pdf`;
    link.href = url;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
});

// Reset Handlers
resetBtn.addEventListener('click', reset);
errorResetBtn.addEventListener('click', reset);

// Prevent default drag behaviors on the window
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.body.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});

console.log('PDF Merge & Compress initialized with REAL compression using PDF.js + jsPDF');
console.log('5 presets + custom DPI/Quality sliders available');
console.log('All processing happens 100% locally in your browser.');
