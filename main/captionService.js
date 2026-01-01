/**
 * Caption Service - Generates captions and tags for images using Ollama
 */

const fs = require("fs").promises;
const path = require("path");

const DEFAULT_ENDPOINT = "http://localhost:11434";

// Per-image timeout in milliseconds based on model size
const MODEL_TIMEOUTS = {
  "qwen3-vl:2b": 60000,   // 60 seconds
  "qwen3-vl:4b": 90000,   // 90 seconds
  "qwen3-vl:8b": 120000,  // 120 seconds
  "qwen3-vl:32b": 180000, // 180 seconds
};

const DEFAULT_TIMEOUT = 120000; // 2 minutes default

function getTimeoutForModel(model) {
  return MODEL_TIMEOUTS[model] || DEFAULT_TIMEOUT;
}

// Track active requests for cancellation
const activeRequests = new Map();

/**
 * Generate a detailed caption for an image
 * @param {string} imagePath - Path to the image file
 * @param {object} options - Options
 * @param {string} options.model - Model to use (e.g., 'qwen3-vl:4b')
 * @param {string} options.endpoint - Ollama endpoint
 * @param {string} options.prompt - Custom prompt (optional)
 * @param {string} options.requestId - Unique ID for cancellation
 * @returns {Promise<{success: boolean, caption?: string, error?: string, cancelled?: boolean}>}
 */
async function generateCaption(imagePath, options = {}) {
  const {
    model,
    endpoint = DEFAULT_ENDPOINT,
    prompt = "Write a brief natural caption for this image in 1-2 sentences. Describe the main subject, style, and setting. No headers, no bullet points, no markdown formatting - just plain text.",
    requestId,
    timeout,
  } = options;

  if (!model) {
    return { success: false, error: "No model specified" };
  }

  // Create AbortController for this request with timeout
  const controller = new AbortController();
  const timeoutMs = timeout || getTimeoutForModel(model);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (requestId) {
    activeRequests.set(requestId, controller);
  }

  try {
    // Read image as base64
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString("base64");

    const response = await fetch(`${endpoint}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
            images: [base64Image],
          },
        ],
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error };
    }

    const caption = data.message?.content?.trim();
    if (!caption) {
      return { success: false, error: "No caption generated" };
    }

    return { success: true, caption };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      // Check if this was a user cancel or a timeout
      const wasUserCancel = requestId && !activeRequests.has(requestId);
      if (wasUserCancel) {
        return { success: false, error: "Cancelled", cancelled: true };
      }
      return { success: false, error: "Request timed out", timedOut: true };
    }
    if (error.code === "ECONNREFUSED" || error.cause?.code === "ECONNREFUSED") {
      return { success: false, error: "Ollama is not running" };
    }
    if (error.code === "ENOENT") {
      return { success: false, error: "Image file not found" };
    }
    return { success: false, error: error.message };
  } finally {
    clearTimeout(timeoutId);
    if (requestId) {
      activeRequests.delete(requestId);
    }
  }
}

/**
 * Generate tags for an image
 * @param {string} imagePath - Path to the image file
 * @param {object} options - Options
 * @param {string} options.model - Model to use
 * @param {string} options.endpoint - Ollama endpoint
 * @param {string} options.requestId - Unique ID for cancellation
 * @returns {Promise<{success: boolean, tags?: string[], error?: string, cancelled?: boolean}>}
 */
async function generateTags(imagePath, options = {}) {
  const {
    model,
    endpoint = DEFAULT_ENDPOINT,
    requestId,
    timeout,
  } = options;

  if (!model) {
    return { success: false, error: "No model specified" };
  }

  // Create AbortController for this request with timeout
  const controller = new AbortController();
  const timeoutMs = timeout || getTimeoutForModel(model);
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (requestId) {
    activeRequests.set(requestId, controller);
  }

  try {
    const imageBuffer = await fs.readFile(imagePath);
    const base64Image = imageBuffer.toString("base64");

    const response = await fetch(`${endpoint}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content:
              "List tags for this image as comma-separated values. Include: subject, style, mood, colors, composition, lighting. Be specific. Example format: woman, portrait, photorealistic, warm lighting, shallow depth of field, professional photo",
            images: [base64Image],
          },
        ],
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const data = await response.json();

    if (data.error) {
      return { success: false, error: data.error };
    }

    const rawTags = data.message?.content?.trim();
    if (!rawTags) {
      return { success: false, error: "No tags generated" };
    }

    // Parse comma-separated tags and clean them up
    const tags = rawTags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0 && t.length < 50); // Filter out empty and overly long tags

    return { success: true, tags };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      const wasUserCancel = requestId && !activeRequests.has(requestId);
      if (wasUserCancel) {
        return { success: false, error: "Cancelled", cancelled: true };
      }
      return { success: false, error: "Request timed out", timedOut: true };
    }
    if (error.code === "ECONNREFUSED" || error.cause?.code === "ECONNREFUSED") {
      return { success: false, error: "Ollama is not running" };
    }
    if (error.code === "ENOENT") {
      return { success: false, error: "Image file not found" };
    }
    return { success: false, error: error.message };
  } finally {
    clearTimeout(timeoutId);
    if (requestId) {
      activeRequests.delete(requestId);
    }
  }
}

/**
 * Generate both caption and tags for an image
 * @param {string} imagePath - Path to the image file
 * @param {object} options - Options
 * @returns {Promise<{success: boolean, caption?: string, tags?: string[], error?: string, cancelled?: boolean}>}
 */
async function generateCaptionAndTags(imagePath, options = {}) {
  const { requestId } = options;

  // Create a shared controller for both requests
  const controller = new AbortController();
  if (requestId) {
    activeRequests.set(requestId, controller);
  }

  try {
    const captionResult = await generateCaption(imagePath, { ...options, requestId: null });
    if (!captionResult.success) {
      return captionResult;
    }

    // Check if cancelled before starting tags
    if (controller.signal.aborted) {
      return { success: false, error: "Cancelled", cancelled: true };
    }

    const tagsResult = await generateTags(imagePath, { ...options, requestId: null });
    if (!tagsResult.success) {
      // Return caption even if tags failed (unless cancelled)
      if (tagsResult.cancelled) {
        return tagsResult;
      }
      return {
        success: true,
        caption: captionResult.caption,
        tags: [],
        tagsError: tagsResult.error,
      };
    }

    return {
      success: true,
      caption: captionResult.caption,
      tags: tagsResult.tags,
    };
  } finally {
    if (requestId) {
      activeRequests.delete(requestId);
    }
  }
}

/**
 * Cancel an active caption request
 * @param {string} requestId - The request ID to cancel
 * @returns {{success: boolean}}
 */
function cancelRequest(requestId) {
  const controller = activeRequests.get(requestId);
  if (controller) {
    controller.abort();
    activeRequests.delete(requestId);
    return { success: true };
  }
  return { success: false, error: "Request not found" };
}

// Track active batch operations
const activeBatchOps = new Map();

/**
 * Process a batch of images for captioning
 * @param {Array} files - Array of {fullPath, name, fingerprint} objects
 * @param {object} options - Options
 * @param {string} options.model - Model to use
 * @param {string} options.endpoint - Ollama endpoint
 * @param {boolean} options.generateCaptions - Whether to generate captions
 * @param {boolean} options.generateTags - Whether to generate tags
 * @param {boolean} options.overwrite - Whether to overwrite existing captions
 * @param {string} options.batchId - Unique batch ID for cancellation
 * @param {function} options.onProgress - Progress callback
 * @returns {Promise<{success: boolean, results: Array, completed: number, failed: number, cancelled: boolean}>}
 */
async function batchCaption(files, options = {}) {
  const {
    model,
    endpoint = DEFAULT_ENDPOINT,
    generateCaptions = true,
    generateTags: doTags = true,
    overwrite = false,
    batchId,
    onProgress,
  } = options;

  if (!model) {
    return { success: false, error: "No model specified", results: [], completed: 0, failed: 0 };
  }

  // Create AbortController for batch
  const controller = new AbortController();
  if (batchId) {
    activeBatchOps.set(batchId, controller);
  }

  const results = [];
  let completed = 0;
  let failed = 0;

  try {
    for (let i = 0; i < files.length; i++) {
      // Check if cancelled
      if (controller.signal.aborted) {
        return {
          success: false,
          cancelled: true,
          results,
          completed,
          failed,
          stoppedAt: i,
        };
      }

      const file = files[i];
      const requestId = `batch-${batchId}-${i}`;

      // Send progress update (starting this file)
      // current = completed count (matches percent semantics)
      if (onProgress) {
        onProgress({
          current: i,
          total: files.length,
          percent: Math.round((i / files.length) * 100),
          currentFile: file.name,
          currentPath: file.fullPath,
          status: "processing",
          completed,
          failed,
        });
      }

      console.log("[DEBUG captionService] Processing file", i + 1, "of", files.length, {
        name: file.name,
        fingerprint: file.fingerprint?.slice(0, 20),
        hasFingerprint: !!file.fingerprint,
      });

      try {
        let caption = null;
        let tags = null;

        if (generateCaptions && doTags) {
          // Generate both
          const result = await generateCaptionAndTags(file.fullPath, {
            model,
            endpoint,
            requestId,
          });
          if (result.cancelled) {
            return {
              success: false,
              cancelled: true,
              results,
              completed,
              failed,
              stoppedAt: i,
            };
          }
          if (result.success) {
            caption = result.caption;
            tags = result.tags;
          } else {
            throw new Error(result.error);
          }
        } else if (generateCaptions) {
          // Caption only
          const result = await generateCaption(file.fullPath, { model, endpoint, requestId });
          if (result.cancelled) {
            return {
              success: false,
              cancelled: true,
              results,
              completed,
              failed,
              stoppedAt: i,
            };
          }
          if (result.success) {
            caption = result.caption;
          } else {
            throw new Error(result.error);
          }
        } else if (doTags) {
          // Tags only
          const result = await generateTags(file.fullPath, { model, endpoint, requestId });
          if (result.cancelled) {
            return {
              success: false,
              cancelled: true,
              results,
              completed,
              failed,
              stoppedAt: i,
            };
          }
          if (result.success) {
            tags = result.tags;
          } else {
            throw new Error(result.error);
          }
        }

        results.push({
          path: file.fullPath,
          name: file.name,
          fingerprint: file.fingerprint,
          caption,
          tags,
          success: true,
        });
        completed++;

        console.log("[DEBUG captionService] File completed successfully:", {
          name: file.name,
          fingerprint: file.fingerprint?.slice(0, 20),
          captionLength: caption?.length,
          tagsCount: tags?.length,
          tags: tags?.slice(0, 3),
        });

        // Send progress with result
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: files.length,
            percent: Math.round(((i + 1) / files.length) * 100),
            currentFile: file.name,
            currentPath: file.fullPath,
            status: "completed",
            completed,
            failed,
            lastResult: { caption, tags, success: true },
          });
        }
      } catch (error) {
        results.push({
          path: file.fullPath,
          name: file.name,
          fingerprint: file.fingerprint,
          error: error.message,
          success: false,
        });
        failed++;

        if (onProgress) {
          onProgress({
            current: i + 1,
            total: files.length,
            percent: Math.round(((i + 1) / files.length) * 100),
            currentFile: file.name,
            currentPath: file.fullPath,
            status: "failed",
            completed,
            failed,
            lastResult: { error: error.message, success: false },
          });
        }
      }
    }

    return {
      success: true,
      results,
      completed,
      failed,
      cancelled: false,
    };
  } finally {
    if (batchId) {
      activeBatchOps.delete(batchId);
    }
  }
}

/**
 * Cancel an active batch operation
 * @param {string} batchId - The batch ID to cancel
 * @returns {{success: boolean}}
 */
function cancelBatch(batchId) {
  const controller = activeBatchOps.get(batchId);
  if (controller) {
    controller.abort();
    activeBatchOps.delete(batchId);
    return { success: true };
  }
  return { success: false, error: "Batch not found" };
}

module.exports = {
  generateCaption,
  generateTags,
  generateCaptionAndTags,
  cancelRequest,
  batchCaption,
  cancelBatch,
  getTimeoutForModel,
  MODEL_TIMEOUTS,
  DEFAULT_ENDPOINT,
};
