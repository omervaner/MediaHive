# Phase 3: AI Captioning Integration

## Overview
Add AI-powered image captioning and tagging using Ollama + Qwen3-VL. Runs locally for privacy and unlimited usage.

---

## Step 1: Ollama Setup & Model Management

**Files:** `main/ollamaService.js` (NEW), `src/components/OllamaSetupDialog.jsx` (NEW)

**Goal:** First-run setup that detects Ollama, lets user choose and download a vision model with clear size warnings.

### Ollama Detection
```js
// main/ollamaService.js
async function checkOllamaStatus() {
  try {
    const response = await fetch('http://localhost:11434/api/tags');
    const data = await response.json();
    return {
      running: true,
      models: data.models || []
    };
  } catch (e) {
    return { running: false, models: [] };
  }
}

function hasVisionModel(models) {
  const visionModels = ['qwen3-vl:2b', 'qwen3-vl:4b', 'qwen3-vl:8b', 'qwen3-vl:32b'];
  return models.some(m => visionModels.some(v => m.name.includes(v)));
}
```

### Model Options (with download sizes!)

| Tier | Model | Download Size | RAM Required | Speed | Quality |
|------|-------|--------------|--------------|-------|---------|
| Very Fast | `qwen3-vl:2b` | ~1.9 GB | 4GB+ | Very Fast | Basic |
| Fast | `qwen3-vl:4b` | ~3.3 GB | 8GB+ | Fast | Good |
| Recommended | `qwen3-vl:8b` | ~6.1 GB | 16GB+ | Medium | Better |
| Maximum | `qwen3-vl:32b` | ~20 GB | 32GB+ | Slow | Best |

### Setup Dialog UI
```
┌─────────────────────────────────────────────────────────┐
│ 🧠 AI Captioning Setup                                  │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ MediaHive uses Ollama to run AI models locally.         │
│ Your images never leave your computer.                  │
│                                                         │
│ ⚠️  This will download a large model to your computer.  │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ○ Very Fast (2B)                         ~1.9 GB   │ │
│ │   Quick tagging, lower quality                     │ │
│ │   Works on: 4GB+ RAM                               │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ○ Fast (4B)                              ~3.3 GB   │ │
│ │   Good for quick tagging                           │ │
│ │   Works on: 8GB+ RAM                               │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ● Recommended (8B)                       ~6.1 GB   │ │
│ │   Best balance of speed and quality                │ │
│ │   Works on: 16GB+ RAM (M1/M2 Mac, RTX 3060+)       │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ○ Maximum (32B)                          ~20 GB    │ │
│ │   Highest quality captions                         │ │
│ │   Works on: 32GB+ RAM or RTX 4080+                 │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ [Cancel]                         [Download & Install]   │
│                                                         │
│ ────────────────────────────────────────────────────── │
│ ℹ️ Don't have Ollama? [Download Ollama] (ollama.com)    │
└─────────────────────────────────────────────────────────┘
```

### Model Download with Progress
```js
async function pullModel(modelName, onProgress) {
  const response = await fetch('http://localhost:11434/api/pull', {
    method: 'POST',
    body: JSON.stringify({ name: modelName, stream: true })
  });
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const lines = decoder.decode(value).split('\n');
    for (const line of lines) {
      if (!line) continue;
      const data = JSON.parse(line);
      if (data.total && data.completed) {
        onProgress({
          percent: (data.completed / data.total) * 100,
          downloaded: formatBytes(data.completed),
          total: formatBytes(data.total),
          status: data.status
        });
      }
    }
  }
}
```

### Download Progress UI
```
┌─────────────────────────────────────────────────────────┐
│ 📥 Downloading qwen3-vl:8b                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ████████████████░░░░░░░░░░░░░░  45%                    │
│                                                         │
│ 2.7 GB / 6.1 GB                                        │
│ Status: pulling manifest...                             │
│                                                         │
│ ⚠️  This may take several minutes depending on your     │
│    internet connection. Don't close the app.            │
│                                                         │
│                                          [Cancel]       │
└─────────────────────────────────────────────────────────┘
```

### Settings Storage
```js
// Store in app settings
{
  ollama: {
    model: 'qwen3-vl:8b',  // selected model
    endpoint: 'http://localhost:11434'  // allow custom
  }
}
```

### IPC Handlers
```js
// main.js
ipcMain.handle('ollama:check', () => checkOllamaStatus());
ipcMain.handle('ollama:pull', (_, model) => pullModel(model));
ipcMain.handle('ollama:get-model', () => settings.get('ollama.model'));
ipcMain.handle('ollama:set-model', (_, model) => settings.set('ollama.model', model));
```

---

## Step 2: Caption Service

**Files:** `main/captionService.js` (NEW)

**Goal:** Generate captions and tags for images using the selected Ollama model.

### Caption Generation
```js
// main/captionService.js
const fs = require('fs').promises;

async function generateCaption(imagePath, options = {}) {
  const model = options.model || settings.get('ollama.model') || 'qwen3-vl:8b';
  
  // Read image as base64
  const imageBuffer = await fs.readFile(imagePath);
  const base64Image = imageBuffer.toString('base64');
  
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: options.prompt || 'Describe this image in detail for AI training. Focus on the subject, style, composition, lighting, and any notable elements.',
        images: [base64Image]
      }],
      stream: false
    })
  });
  
  const data = await response.json();
  return data.message.content;
}

async function generateTags(imagePath, options = {}) {
  const model = options.model || settings.get('ollama.model') || 'qwen3-vl:8b';
  
  const imageBuffer = await fs.readFile(imagePath);
  const base64Image = imageBuffer.toString('base64');
  
  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: 'List tags for this image as comma-separated values. Include: subject, style, mood, colors, composition, lighting. Example format: woman, portrait, photorealistic, warm lighting, shallow depth of field, professional photo',
        images: [base64Image]
      }],
      stream: false
    })
  });
  
  const data = await response.json();
  // Parse comma-separated tags
  const rawTags = data.message.content;
  return rawTags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
}
```

### Batch Processing with Progress
```js
async function batchCaption(files, options = {}) {
  const results = [];
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      const caption = await generateCaption(file.fullPath, options);
      const tags = options.includeTags ? await generateTags(file.fullPath, options) : null;
      
      results.push({
        path: file.fullPath,
        caption,
        tags,
        success: true
      });
    } catch (error) {
      results.push({
        path: file.fullPath,
        error: error.message,
        success: false
      });
    }
    
    // Send progress
    if (options.onProgress) {
      options.onProgress({
        current: i + 1,
        total: files.length,
        currentFile: file.name,
        percent: ((i + 1) / files.length) * 100
      });
    }
  }
  
  return results;
}
```

### IPC Handlers
```js
// main.js
ipcMain.handle('caption:single', async (_, imagePath) => {
  return generateCaption(imagePath);
});

ipcMain.handle('caption:tags', async (_, imagePath) => {
  return generateTags(imagePath);
});

ipcMain.handle('caption:batch', async (event, files, options) => {
  return batchCaption(files, {
    ...options,
    onProgress: (progress) => {
      event.sender.send('caption:progress', progress);
    }
  });
});
```

---

## Step 3: Batch Captioning UI

**Files:** `src/components/BatchCaptionDialog.jsx` (NEW), `src/components/HeaderBar.jsx`

**Goal:** UI for batch captioning with progress and results.

### HeaderBar Addition
```jsx
// Add to HeaderBar.jsx
<button 
  onClick={handleBatchCaption}
  disabled={!hasVisibleImages || !ollamaReady}
  title={!ollamaReady ? 'Setup AI first' : 'Caption all visible images'}
>
  🧠 Caption
</button>
```

### Batch Caption Dialog
```
┌─────────────────────────────────────────────────────────┐
│ 🧠 Batch Caption                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Source: 47 images (currently visible)                   │
│ Model: qwen3-vl:8b                    [Change Model]    │
│                                                         │
│ Options:                                                │
│ ☑ Generate detailed captions                           │
│ ☑ Generate tags                                        │
│ ☐ Overwrite existing captions                          │
│                                                         │
│ Estimated time: ~5-10 minutes (6 sec/image)            │
│                                                         │
│ [Cancel]                              [Start Caption]   │
└─────────────────────────────────────────────────────────┘
```

### Progress View
```
┌─────────────────────────────────────────────────────────┐
│ 🧠 Captioning in Progress                               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ████████████████░░░░░░░░░░░░░░  23/47 (49%)            │
│                                                         │
│ Current: 20250412_0208_Medieval Warrior Battle.png     │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [thumbnail]  A dramatic portrait of a medieval      │ │
│ │              warrior in ornate armor, standing     │ │
│ │              against a stormy sky...               │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ✓ 22 completed  ✗ 1 failed                             │
│                                                         │
│                                     [Stop] [Background] │
└─────────────────────────────────────────────────────────┘
```

---

## Step 4: Caption Display & Editing

**Files:** `src/components/CaptionPanel.jsx` (NEW), `src/components/MediaCard.jsx`

**Goal:** Show captions on hover/selection, allow editing.

### MediaCard Enhancement
```jsx
// Show caption indicator on cards that have AI captions
{file.aiCaption && (
  <div className="caption-indicator" title={file.aiCaption}>
    🧠
  </div>
)}
```

### Caption in Details Panel
When an image is selected, show caption in the details panel at bottom:

```
┌─────────────────────────────────────────────────────────┐
│ DETAILS  1 CLIP                                         │
├─────────────────────────────────────────────────────────┤
│ 20250412_0208_Medieval Warrior Battle.png              │
│ 1024 × 1536 • 2.3 MB • PNG                             │
│                                                         │
│ TAGS                                        [SAVE] [X]  │
│ [warrior] [portrait] [medieval] [armor] [dramatic]     │
│ (suggested by AI - Save to keep, X to discard)         │
│                                                         │
│ AI CAPTION                                              │
│ A dramatic portrait of a medieval warrior in ornate    │
│ armor, standing against a stormy sky with lightning... │
│ [Copy] [Regenerate]                                    │
└─────────────────────────────────────────────────────────┘
```

### CRITICAL: Tags UX Flow
**DO NOT show AI tags separately below caption.** Instead:
1. AI generates caption + tags together
2. Caption displays in AI CAPTION section
3. Tags appear in the existing TAGS section as **suggested/pending** (different styling)
4. User clicks **Save** → tags get permanently added to file
5. Or clicks **Discard/X** → tags cleared, nothing saved

This keeps all tags in one place and gives user control.

---

## Step 5: Storage

**Storage:** File objects in memory (no DB changes initially)

```js
// Add to file object
{
  ...existingFields,
  aiCaption: "A dramatic portrait...",
  aiTags: ["warrior", "portrait", "medieval"],
  captionModel: "qwen3-vl:8b",
  captionDate: "2025-01-01T12:00:00Z"
}
```

Later: Add DB columns if persistence across sessions is needed.

---

## Trigger Points

User can trigger AI captioning from:

1. **HeaderBar button** → Caption all visible/filtered images
2. **Right-click context menu** → "Generate Caption" for selected
3. **Details panel** → "Generate" button for single image
4. **Export dialog** → "Generate captions before export" option

---

## Error Handling

```js
// Handle common errors gracefully
try {
  await generateCaption(path);
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    showError('Ollama is not running. Please start Ollama and try again.');
  } else if (error.message.includes('model not found')) {
    showError('Model not installed. Go to Settings > AI to download.');
  } else {
    showError(`Caption failed: ${error.message}`);
  }
}
```

---

## CRITICAL: Generation UX Requirements

Caption generation can take 1-5+ minutes depending on model size and hardware.

### Required UI Elements During Generation:

1. **Cancel Button** - MUST have abort capability next to 'Generating...'
   - Aborts the fetch request immediately
   - Returns UI to idle state

2. **Elapsed Timer** - Show time since generation started
   - Display: "Generating... (45s)" 
   - Updates every second
   - Helps user know it's not frozen

3. **Timeout Warning** - After 3 minutes:
   - Show: "Taking too long? Try a smaller model in Settings."
   - Don't auto-cancel, just warn

4. **Hard Timeout** - After 5 minutes:
   - Auto-cancel with error message
   - Suggest switching to smaller model

```
┌─────────────────────────────────────────────────────────┐
│ AI CAPTION                                              │
│                                                         │
│ ○ Generating... (1m 23s)              [Cancel]         │
│                                                         │
│ ⚠️ Taking longer than expected.                         │
│    Try a smaller model in Settings for faster results. │
└─────────────────────────────────────────────────────────┘
```

---

## Implementation Order

1. **Ollama detection & setup dialog** - Get the connection working first
2. **Model download with progress** - User picks and downloads model
3. **Single image caption** - Test with one image
4. **Batch processing** - Add progress UI
5. **Storage & display** - Show captions in UI
6. **Integration with export** - Use AI captions in dataset export

---

## Settings Page - Model Management

### CRITICAL: Model Storage Management

Models are LARGE (3-20GB each). Users need to:
- See which models are downloaded
- Know disk space used
- Delete models they don't need
- Switch between downloaded models WITHOUT re-downloading

### Settings UI

```
┌─────────────────────────────────────────────────────────┐
│ ⚙️ Settings                                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 🧠 AI Captioning                                        │
│ ─────────────────                                       │
│ Status: ✓ Ollama running                               │
│                                                         │
│ Active Model: qwen3-vl:4b               [Change]       │
│                                                         │
│ Downloaded Models:                                      │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ● qwen3-vl:4b    3.3 GB    Fast      [Delete]      │ │
│ │ ○ qwen3-vl:8b    6.1 GB    Better    [Delete]      │ │
│ └─────────────────────────────────────────────────────┘ │
│ Total: 9.4 GB used                                      │
│                                                         │
│ [Download Another Model]                                │
│                                                         │
│ ───────────────────────────────────────────────────────│
│ Advanced                                                │
│ Ollama Endpoint: [http://localhost:11434]              │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Model Management Backend

Add to `main/ollamaService.js`:

```js
// List downloaded vision models with sizes
async function listDownloadedModels() {
  const response = await fetch('http://localhost:11434/api/tags');
  const data = await response.json();
  
  // Filter to vision models only
  const visionModels = data.models.filter(m => 
    m.name.includes('qwen3-vl') || m.name.includes('llava')
  );
  
  return visionModels.map(m => ({
    name: m.name,
    size: m.size,  // bytes
    sizeFormatted: formatBytes(m.size),
    modified: m.modified_at
  }));
}

// Delete a model
async function deleteModel(modelName) {
  const response = await fetch('http://localhost:11434/api/delete', {
    method: 'DELETE',
    body: JSON.stringify({ name: modelName })
  });
  return response.ok;
}
```

### IPC Handlers

```js
ipcMain.handle('ollama:list-models', () => listDownloadedModels());
ipcMain.handle('ollama:delete-model', (_, model) => deleteModel(model));
```

### UX Notes

1. **Switching models** - If user clicks a different downloaded model, just switch (no download needed)
2. **Change button** - Opens model picker, shows which are already downloaded vs need download
3. **Delete confirmation** - "Delete qwen3-vl:8b? This will free 6.1 GB of disk space."
4. **Can't delete active** - Disable delete button on currently active model
5. **Radio selection** - Clicking a downloaded model row makes it active immediately
