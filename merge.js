/**
 * TinyPDF - PDF Merge Feature
 * 
 * Merges multiple PDFs into one WITHOUT any compression or quality loss.
 * Uses pdf-lib which preserves the original PDF structure and content.
 * 
 * All processing happens 100% in the browser.
 */

// DOM Elements
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const filesSection = document.getElementById('files-section');
const resultSection = document.getElementById('result-section');
const errorSection = document.getElementById('error-section');

const filesList = document.getElementById('files-list');
const addMoreBtn = document.getElementById('add-more-btn');
const totalFilesEl = document.getElementById('total-files');
const totalSizeEl = document.getElementById('total-size');
const mergeBtn = document.getElementById('merge-btn');

const mergedCountEl = document.getElementById('merged-count');
const totalPagesEl = document.getElementById('total-pages');
const finalSizeEl = document.getElementById('final-size');
const downloadBtn = document.getElementById('download-btn');
const resetBtn = document.getElementById('reset-btn');
const errorResetBtn = document.getElementById('error-reset-btn');
const errorMessage = document.getElementById('error-message');

// State
let pdfFiles = [];
let mergedPdfBlob = null;
let mergedPageCount = 0;

// Utility Functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showSection(section) {
    uploadSection.classList.remove('hidden');
    filesSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    errorSection.classList.add('hidden');

    if (section === filesSection) {
        uploadSection.classList.add('hidden');
        filesSection.classList.remove('hidden');
    } else if (section === resultSection) {
        uploadSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
    } else if (section === errorSection) {
        uploadSection.classList.add('hidden');
        errorSection.classList.remove('hidden');
    }
}

function showError(message) {
    errorMessage.textContent = message;
    showSection(errorSection);
}

function reset() {
    pdfFiles = [];
    mergedPdfBlob = null;
    mergedPageCount = 0;
    filesList.innerHTML = '';
    updateTotals();

    // Reset button state
    const btnText = mergeBtn.querySelector('.btn-text');
    const btnLoader = mergeBtn.querySelector('.btn-loader');
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
    mergeBtn.disabled = false;

    showSection(uploadSection);
}

function updateTotals() {
    const totalSize = pdfFiles.reduce((sum, file) => sum + file.size, 0);
    totalFilesEl.textContent = `${pdfFiles.length} file${pdfFiles.length !== 1 ? 's' : ''}`;
    totalSizeEl.textContent = `${formatFileSize(totalSize)} total`;

    // Disable merge button if less than 2 files
    mergeBtn.disabled = pdfFiles.length < 2;
}

// Render file list
function renderFileList() {
    filesList.innerHTML = '';

    pdfFiles.forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'file-item';
        li.draggable = true;
        li.dataset.index = index;

        li.innerHTML = `
            <div class="drag-handle">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                </svg>
            </div>
            <div class="file-item-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="2"/>
                    <path d="M14 2v6h6" stroke="currentColor" stroke-width="2"/>
                </svg>
            </div>
            <div class="file-item-info">
                <div class="file-item-name" title="${file.name}">${file.name}</div>
                <div class="file-item-size">${formatFileSize(file.size)}</div>
            </div>
            <div class="file-item-order">${index + 1}</div>
            <button class="remove-file-btn" data-index="${index}" title="Remove file">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        `;

        filesList.appendChild(li);
    });

    // Add event listeners for drag and drop reordering
    setupDragAndDrop();

    // Add event listeners for remove buttons
    document.querySelectorAll('.remove-file-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.dataset.index);
            pdfFiles.splice(index, 1);
            renderFileList();
            updateTotals();

            if (pdfFiles.length === 0) {
                showSection(uploadSection);
            }
        });
    });

    updateTotals();
}

// Drag and drop reordering
function setupDragAndDrop() {
    const items = filesList.querySelectorAll('.file-item');
    let draggedItem = null;

    items.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            item.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            items.forEach(i => i.classList.remove('drag-over'));
            draggedItem = null;
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (item !== draggedItem) {
                item.classList.add('drag-over');
            }
        });

        item.addEventListener('dragleave', () => {
            item.classList.remove('drag-over');
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            item.classList.remove('drag-over');

            if (draggedItem && item !== draggedItem) {
                const fromIndex = parseInt(draggedItem.dataset.index);
                const toIndex = parseInt(item.dataset.index);

                // Reorder the array
                const [movedFile] = pdfFiles.splice(fromIndex, 1);
                pdfFiles.splice(toIndex, 0, movedFile);

                renderFileList();
            }
        });
    });
}

// Handle file selection
function handleFiles(files) {
    const validFiles = Array.from(files).filter(file => {
        if (file.type !== 'application/pdf') {
            console.warn(`Skipping non-PDF file: ${file.name}`);
            return false;
        }
        return true;
    });

    if (validFiles.length === 0) {
        if (pdfFiles.length === 0) {
            showError('Please select valid PDF files.');
        }
        return;
    }

    pdfFiles.push(...validFiles);
    renderFileList();
    showSection(filesSection);
}

// Dropzone events
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
    handleFiles(e.dataTransfer.files);
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    fileInput.value = ''; // Reset so same files can be selected again
});

// Add more button
addMoreBtn.addEventListener('click', () => fileInput.click());

// Merge PDFs
mergeBtn.addEventListener('click', async () => {
    if (pdfFiles.length < 2) return;

    const btnText = mergeBtn.querySelector('.btn-text');
    const btnLoader = mergeBtn.querySelector('.btn-loader');

    btnText.classList.add('hidden');
    btnLoader.classList.remove('hidden');
    mergeBtn.disabled = true;

    try {
        const result = await mergePdfs(pdfFiles);
        mergedPdfBlob = result.blob;
        mergedPageCount = result.pageCount;

        // Update result stats
        mergedCountEl.textContent = pdfFiles.length;
        totalPagesEl.textContent = mergedPageCount;
        finalSizeEl.textContent = formatFileSize(mergedPdfBlob.size);

        showSection(resultSection);
    } catch (error) {
        console.error('Merge error:', error);
        showError(`Unable to merge PDFs: ${error.message}`);
    }
});

/**
 * Merge PDFs using pdf-lib
 * This preserves the original quality - no compression or conversion!
 */
async function mergePdfs(files) {
    const { PDFDocument } = PDFLib;

    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();

    let totalPages = 0;

    // Process each file in order
    for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();

        try {
            // Load the source PDF
            const sourcePdf = await PDFDocument.load(arrayBuffer, {
                ignoreEncryption: true
            });

            // Copy all pages from source to merged document
            const pageIndices = sourcePdf.getPageIndices();
            const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndices);

            // Add each copied page to the merged document
            copiedPages.forEach(page => {
                mergedPdf.addPage(page);
            });

            totalPages += pageIndices.length;
        } catch (error) {
            throw new Error(`Failed to process "${file.name}": ${error.message}`);
        }
    }

    // Save the merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });

    return {
        blob: blob,
        pageCount: totalPages
    };
}

// Download handler
downloadBtn.addEventListener('click', () => {
    if (!mergedPdfBlob) return;

    const url = URL.createObjectURL(mergedPdfBlob);
    const link = document.createElement('a');

    // Generate filename based on first file
    const baseName = pdfFiles[0]?.name.replace(/\.pdf$/i, '') || 'document';
    link.download = `${baseName}_merged.pdf`;
    link.href = url;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
});

// Reset handlers
resetBtn.addEventListener('click', reset);
errorResetBtn.addEventListener('click', reset);

// Prevent default drag behaviors on the window
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.body.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});

console.log('TinyPDF Merge initialized. No compression - original quality preserved!');
