import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAppData } from '../hooks/useAppData';
import { DownloadIcon, PencilIcon, CheckIcon, ClipboardListIcon as ClipboardIcon, UploadIcon } from './icons';
import * as geminiService from '../services/geminiService';

// This function finds image placeholders and injects uploader UI and a script into the HTML.
const processHtmlForImageUploads = (html: string): string => {
    if (!html) return '';

    const imagePlaceholderRegex = /\[Gambar: (.*?)\]/g;
    let matchIndex = 0;

    // Replace placeholders with the interactive component
    const processedHtml = html.replace(imagePlaceholderRegex, (match, description) => {
        const uploaderId = `image-uploader-${matchIndex++}`;
        const escapedDescription = description.replace(/'/g, "\\'"); // Escape single quotes for JS strings
        
        return `
            <div id="${uploaderId}" class="image-uploader-container" style="border: 2px dashed #9ca3af; border-radius: 12px; padding: 20px; text-align: center; background-color: #f9fafb; margin: 1rem 0; page-break-inside: avoid;">
                
                <!-- This part is for the final image or the generated prompt -->
                <div id="result-container-${uploaderId}" style="display:none;"></div>
                
                <!-- This part is the initial prompt with buttons -->
                <div id="prompt-container-${uploaderId}">
                    <div style="color: #6b7280; margin-bottom: 15px;">
                         <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 10px auto;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        <p style="font-weight: 600; font-size: 1rem;">Saran Gambar:</p>
                        <p style="font-style: italic; font-size: 0.9rem;">"${description}"</p>
                    </div>
                    <div style="display: flex; justify-content: center; align-items: center; gap: 10px; flex-wrap: wrap;">
                        <label for="image-input-${uploaderId}" style="display: inline-flex; align-items:center; gap: 8px; padding: 8px 16px; background-color: #0d9488; color: white; font-weight: 600; border-radius: 8px; cursor: pointer; transition: background-color 0.2s;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            Upload
                        </label>
                        <input type="file" id="image-input-${uploaderId}" accept="image/*" style="display:none;" onchange="handleImageUpload(event, '${uploaderId}')">

                        <button onclick="handleGenerateImage(event, '${uploaderId}', '${escapedDescription}')" style="display: inline-flex; align-items:center; gap: 8px; padding: 8px 16px; background-color: #4338ca; color: white; font-weight: 600; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; border: none;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436A6.75 6.75 0 019.75 22.5a.75.75 0 01-.75-.75v-4.131A15.838 15.838 0 016.382 15H2.25a.75.75 0 01-.75-.75 6.75 6.75 0 017.815-6.666zM15 6.75a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" /><path d="M5.26 17.242a.75.75 0 10-1.06-1.06 7.5 7.5 0 00-1.964 5.304.75.75 0 00.75.75h3.105a7.5 7.5 0 005.304-1.964.75.75 0 10-1.06-1.06 6 6 0 01-4.243 1.557 6 6 0 01-1.557-4.243z" /></svg>
                            Generate Gambar
                        </button>
                        
                        <button onclick="handleGeneratePrompt(event, '${uploaderId}', '${escapedDescription}')" style="display: inline-flex; align-items:center; gap: 8px; padding: 8px 16px; background-color: #64748b; color: white; font-weight: 600; border-radius: 8px; cursor: pointer; transition: background-color 0.2s; border: none;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                            Buat Prompt
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    // If placeholders were found, inject the handling scripts
    if (matchIndex > 0) {
        const script = `
            <script>
                // --- Functions to communicate with the parent React app ---
                function handleGenerateImage(event, uploaderId, description) {
                    event.preventDefault();
                    const promptContainer = document.getElementById('prompt-container-' + uploaderId);
                    if (promptContainer) {
                        promptContainer.innerHTML = '<p style="color: #64748b; font-weight: 600; animation: pulse 1.5s infinite;">AI sedang membuat gambar...</p>';
                    }
                    window.parent.postMessage({ type: 'generateImage', uploaderId: uploaderId, description: description }, '*');
                }

                function handleGeneratePrompt(event, uploaderId, description) {
                    event.preventDefault();
                    const promptContainer = document.getElementById('prompt-container-' + uploaderId);
                    if (promptContainer) {
                        promptContainer.innerHTML = '<p style="color: #64748b; font-weight: 600; animation: pulse 1.5s infinite;">AI sedang membuat prompt...</p>';
                    }
                    window.parent.postMessage({ type: 'generateDetailedPrompt', uploaderId: uploaderId, description: description }, '*');
                }

                // --- Function to handle local file upload ---
                function handleImageUpload(event, uploaderId) {
                    const file = event.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const resultContainer = document.getElementById('result-container-' + uploaderId);
                        const promptContainer = document.getElementById('prompt-container-' + uploaderId);
                        if(resultContainer && promptContainer) {
                            resultContainer.innerHTML = '<img src="' + e.target.result + '" style="max-width:100%; max-height: 400px; border-radius: 8px; margin: 0 auto;" />';
                            resultContainer.style.display = 'block';
                            promptContainer.style.display = 'none';
                        }
                    };
                    reader.readAsDataURL(file);
                }

                // --- Listener for messages from the parent React app ---
                window.addEventListener('message', (event) => {
                    const { type, uploaderId, data, error } = event.data;
                    if (!uploaderId) return;

                    const resultContainer = document.getElementById('result-container-' + uploaderId);
                    const promptContainer = document.getElementById('prompt-container-' + uploaderId);
                    
                    if (!resultContainer || !promptContainer) return;

                    if (error) {
                        promptContainer.innerHTML = '<p style="color: #dc2626; font-weight: 600;">Error: ' + error + '</p>';
                        return;
                    }
                    
                    switch(type) {
                        case 'imageGenerated':
                            resultContainer.innerHTML = '<img src="data:image/png;base64,' + data + '" style="max-width:100%; max-height: 400px; border-radius: 8px; margin: 0 auto;" />';
                            resultContainer.style.display = 'block';
                            promptContainer.style.display = 'none';
                            break;
                        case 'promptGenerated':
                            resultContainer.innerHTML = \`
                                <div style="text-align: left;">
                                    <p style="font-weight: 600; font-size: 1rem; color: #334155;">Prompt Detail (AI):</p>
                                    <textarea readonly style="width: 100%; height: 120px; margin-top: 8px; padding: 8px; border: 1px solid #cbd5e1; border-radius: 8px; font-family: monospace; font-size: 0.85rem; background-color: #f1f5f9;">\${data}</textarea>
                                </div>
                            \`;
                            resultContainer.style.display = 'block';
                            promptContainer.style.display = 'none';
                            break;
                    }
                });

                // Add simple pulse animation for loading text
                const style = document.createElement('style');
                style.innerHTML = '@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }';
                document.head.appendChild(style);
            </script>
        `;
        return processedHtml.replace('</body>', script + '</body>');
    }

    return html;
};


export const HtmlPreviewView: React.FC = () => {
    const { htmlPreviewState, hideHtmlPreview, showAlert } = useAppData();
    
    const isTabView = htmlPreviewState && Array.isArray(htmlPreviewState.content);
    const initialIndex = htmlPreviewState?.activeIndex || 0;

    const [activeTabIndex, setActiveTabIndex] = useState(initialIndex);
    
    const activeHtmlContent = isTabView 
        ? (htmlPreviewState.content as { html: string }[])[activeTabIndex]?.html || ''
        : (htmlPreviewState?.content as string) || '';

    const [editedHtml, setEditedHtml] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [copySuccess, setCopySuccess] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        const handleMessage = async (event: MessageEvent) => {
            if (event.source !== iframeRef.current?.contentWindow) {
                return;
            }

            const { type, uploaderId, description } = event.data;
            if (!uploaderId || !description) return;
            
            setIsGenerating(true);
            try {
                if (type === 'generateImage') {
                    const base64Image = await geminiService.generateImageFromPrompt(description);
                    iframeRef.current?.contentWindow?.postMessage({ type: 'imageGenerated', uploaderId, data: base64Image }, '*');
                } else if (type === 'generateDetailedPrompt') {
                    const detailedPrompt = await geminiService.generateImagePrompt(description);
                    iframeRef.current?.contentWindow?.postMessage({ type: 'promptGenerated', uploaderId, data: detailedPrompt }, '*');
                }
            } catch (e) {
                const message = e instanceof Error ? e.message : "Terjadi kesalahan";
                iframeRef.current?.contentWindow?.postMessage({ type: 'error', uploaderId, error: message }, '*');
            } finally {
                setIsGenerating(false);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, []);

    // Effect to process and update content when tab changes or initial content loads
    useEffect(() => {
        setIsEditing(false); // Always exit edit mode on content change
        // Process HTML to add uploaders before setting it to state
        const processed = processHtmlForImageUploads(activeHtmlContent);
        setEditedHtml(processed);
    }, [activeHtmlContent]);

    // This effect writes the full HTML content to the iframe whenever the `editedHtml` state changes.
    useEffect(() => {
        const iframe = iframeRef.current;
        if (iframe?.contentWindow) {
            const doc = iframe.contentWindow.document;
            doc.open();
            doc.write(editedHtml);
            doc.close();
        }
    }, [editedHtml]);

    // This effect toggles the contentEditable state of the iframe body.
    // It runs when isEditing changes OR when editedHtml changes (to re-apply after a rewrite).
    useEffect(() => {
        const iframe = iframeRef.current;
        // Check if body exists before trying to modify it.
        if (iframe?.contentWindow?.document?.body) {
            const body = iframe.contentWindow.document.body;
            body.contentEditable = isEditing ? 'true' : 'false';
            if (isEditing) {
                try {
                    body.focus();
                } catch (e) {
                    console.warn("Could not focus iframe body:", e);
                }
            }
        }
    }, [isEditing, editedHtml]);


    const handleCopyToClipboard = () => {
        const iframeDoc = iframeRef.current?.contentWindow?.document;
        // Get the latest content, which includes Base64 images if uploaded
        const contentToCopy = iframeDoc ? iframeDoc.documentElement.outerHTML : editedHtml;

        navigator.clipboard.writeText(contentToCopy).then(() => {
            setCopySuccess('Berhasil Disalin!');
            setTimeout(() => setCopySuccess(''), 2000);
        }).catch(err => {
            setCopySuccess('Gagal Menyalin');
        });
    };

    const handlePrint = () => {
        const iframeDoc = iframeRef.current?.contentWindow?.document;
        const contentToPrint = iframeDoc ? iframeDoc.documentElement.outerHTML : editedHtml;

        if (!contentToPrint) {
            showAlert({ title: 'Konten Kosong', message: 'Tidak ada konten untuk dicetak.' });
            return;
        }

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(contentToPrint);
            printWindow.document.close();
            
            const style = printWindow.document.createElement('style');
            style.textContent = '@media print { .no-print { display: none !important; } }';
            printWindow.document.head.appendChild(style);
            
            const messageDiv = printWindow.document.createElement('div');
            messageDiv.className = 'no-print';
            messageDiv.innerHTML = `
                <div style="position: fixed; top: 10px; left: 50%; transform: translateX(-50%); background-color: #f0fdfa; border: 1px solid #99f6e4; padding: 15px; border-radius: 8px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); z-index: 9999; font-family: sans-serif; width: 90%; max-width: 600px;">
                    <strong style="font-size: 16px; color: #134e4a;">Siap untuk Mencetak</strong>
                    <p style="margin: 8px 0 12px 0; font-size: 14px; color: #115e59;">Gunakan tombol di bawah, atau fungsi cetak browser (Ctrl/Cmd + P) untuk menyimpan sebagai PDF atau mencetak langsung.</p>
                    <button onclick="window.print()" style="background-color: #0d9488; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; transition: background-color 0.2s;">
                        Cetak Halaman Ini
                    </button>
                </div>
            `;
            if (printWindow.document.body) {
                printWindow.document.body.prepend(messageDiv);
            }
            
            printWindow.focus();
        } else {
             showAlert({
                title: 'Pop-up Diblokir',
                message: 'Gagal membuka jendela cetak. Mohon izinkan pop-up untuk situs ini.'
            });
        }
    };

    const handleDownloadHtml = () => {
        const iframeDoc = iframeRef.current?.contentWindow?.document;
        const contentToDownload = iframeDoc ? iframeDoc.documentElement.outerHTML : editedHtml;

        if (!contentToDownload) {
            showAlert({ title: 'Konten Kosong', message: 'Tidak ada konten untuk diunduh.' });
            return;
        }
        
        const activeTitle = isTabView ? (htmlPreviewState.content as { title: string }[])[activeTabIndex].title : '';
        let fileName = (isTabView ? activeTitle : 'materi-pembelajaran').replace(/\s+/g, '-').toLowerCase() + '.html';

        if (activeTitle.includes('RPP Lengkap')) {
            try {
                const parser = new DOMParser();
                const doc = parser.parseFromString(contentToDownload, 'text/html');
                const subject = doc.querySelector('meta[name="subject"]')?.getAttribute('content');
                const meetingNumber = doc.querySelector('meta[name="meeting-number"]')?.getAttribute('content');
                
                if (subject && meetingNumber) {
                    const cleanSubject = subject.replace(/\s+/g, '_').toLowerCase();
                    fileName = `rpp_${cleanSubject}_pertemuan-${meetingNumber}.html`;
                } else {
                    fileName = `rpp-lengkap.html`;
                }
            } catch (e) {
                console.error("Error parsing RPP HTML for filename:", e);
                fileName = `rpp-lengkap.html`;
            }
        }

        const blob = new Blob([contentToDownload], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const toggleEditMode = () => {
        if (isEditing) {
            // LEAVING edit mode: read the current state from the iframe and save it.
            const iframeDoc = iframeRef.current?.contentWindow?.document;
            if (iframeDoc?.body) {
                const currentFullHtml = iframeDoc.documentElement.outerHTML;
                setEditedHtml(currentFullHtml); // This will trigger the useEffects to rewrite and lock the iframe.
            }
        }
        // For both entering and leaving, we just toggle the state. The useEffects handle the DOM.
        setIsEditing(prev => !prev);
    };

    const handlePasteFromClipboard = async () => {
        try {
            const text = await navigator.clipboard.readText();
            // Process the pasted HTML for any image placeholders it might contain
            const processedText = processHtmlForImageUploads(text);
            setEditedHtml(processedText);
             // Automatically enter edit mode to allow further refinement.
            setIsEditing(true); 
            showAlert({ title: "Berhasil", message: "Konten dari clipboard telah ditempel. Mode edit diaktifkan." });
        } catch (err) {
            showAlert({ title: "Gagal", message: "Tidak dapat membaca dari clipboard. Pastikan Anda telah memberikan izin." });
        }
    };

    const ActionButton: React.FC<{ onClick: () => void; children: React.ReactNode; className?: string; }> = ({ onClick, children, className = '' }) => (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 text-left p-3 rounded-lg transition-colors text-slate-700 hover:bg-slate-100 ${className}`}
        >
            {children}
        </button>
    );

    return (
        <div className="h-full flex flex-col bg-slate-100">
            {/* Header with Tabs */}
            <header className="flex-shrink-0 bg-white border-b border-slate-200 flex justify-between items-center">
                <nav className="flex-grow flex items-center p-4">
                     <h2 className="text-xl font-bold text-slate-800 mr-6">Pratinjau Dokumen</h2>
                     {isTabView && (
                         <div className="flex items-center gap-2 border-l pl-4">
                             {(htmlPreviewState.content as { title: string }[]).map((tab, index) => (
                                 <button
                                     key={index}
                                     onClick={() => setActiveTabIndex(index)}
                                     className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
                                         activeTabIndex === index
                                             ? 'bg-teal-600 text-white shadow-sm'
                                             : 'text-slate-600 hover:bg-slate-100'
                                     }`}
                                 >
                                     {tab.title}
                                 </button>
                             ))}
                         </div>
                     )}
                </nav>
                 <button onClick={hideHtmlPreview} className="text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-2 rounded-lg mr-4">
                    &larr; Kembali ke Aplikasi
                </button>
            </header>

            <div className="h-full flex flex-grow min-h-0">
                {/* Side Panel */}
                <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 p-4 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-700">Aksi Dokumen</h3>
                    <p className="text-sm text-slate-500 mt-1">
                        Aksi berikut berlaku untuk tab <strong className="text-teal-700">{isTabView ? (htmlPreviewState.content as {title: string}[])[activeTabIndex].title : 'aktif'}</strong>.
                    </p>
                    
                    <nav className="flex flex-col gap-2 mt-6">
                        <ActionButton
                            onClick={toggleEditMode}
                            className={isEditing ? 'bg-teal-50 text-teal-800 font-semibold hover:bg-teal-100' : ''}
                        >
                            {isEditing ? <CheckIcon className="h-5 w-5 text-teal-600 flex-shrink-0" /> : <PencilIcon className="h-5 w-5 text-slate-500 flex-shrink-0" />}
                            <span className="flex-grow">{isEditing ? 'Kunci & Simpan Edit' : 'Aktifkan Mode Edit'}</span>
                        </ActionButton>
                        <ActionButton onClick={handlePasteFromClipboard}>
                            <ClipboardIcon className="h-5 w-5 text-slate-500 flex-shrink-0" />
                            <span className="flex-grow">Tempel dari Clipboard</span>
                        </ActionButton>
                        <ActionButton onClick={handleCopyToClipboard}>
                            <ClipboardIcon className="h-5 w-5 text-slate-500 flex-shrink-0" />
                            <span className="flex-grow min-w-0 truncate" title={copySuccess || 'Salin Konten HTML'}>{copySuccess || 'Salin Konten HTML'}</span>
                        </ActionButton>
                         <ActionButton onClick={handleDownloadHtml}>
                            <DownloadIcon className="h-5 w-5 text-slate-500 flex-shrink-0" />
                            <span className="flex-grow">Unduh File HTML</span>
                        </ActionButton>
                        <ActionButton onClick={handlePrint}>
                            <DownloadIcon className="h-5 w-5 text-slate-500 flex-shrink-0" />
                            <span className="flex-grow">Cetak / Simpan PDF</span>
                        </ActionButton>
                    </nav>
                </aside>
                
                {/* Main Content */}
                <main className="flex-grow p-4 overflow-auto">
                    <div className="w-full h-full bg-white shadow-lg">
                        <iframe
                            ref={iframeRef}
                            className="w-full h-full border-0"
                            title="Pratinjau Dokumen HTML"
                        />
                    </div>
                </main>
            </div>
        </div>
    );
};