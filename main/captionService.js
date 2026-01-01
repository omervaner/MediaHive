/**
 * Caption Service - Generates captions and tags for images using Ollama
 */

const fs = require("fs").promises;
const path = require("path");

const DEFAULT_ENDPOINT = "http://localhost:11434";

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
    prompt = "Describe this image in detail for AI training. Focus on the subject, style, composition, lighting, colors, and any notable elements. Be concise but thorough.",
    requestId,
  } = options;

  if (!model) {
    return { success: false, error: "No model specified" };
  }

  // Create AbortController for this request
  const controller = new AbortController();
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
    if (error.name === "AbortError") {
      return { success: false, error: "Cancelled", cancelled: true };
    }
    if (error.code === "ECONNREFUSED" || error.cause?.code === "ECONNREFUSED") {
      return { success: false, error: "Ollama is not running" };
    }
    if (error.code === "ENOENT") {
      return { success: false, error: "Image file not found" };
    }
    return { success: false, error: error.message };
  } finally {
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
  } = options;

  if (!model) {
    return { success: false, error: "No model specified" };
  }

  // Create AbortController for this request
  const controller = new AbortController();
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
    if (error.name === "AbortError") {
      return { success: false, error: "Cancelled", cancelled: true };
    }
    if (error.code === "ECONNREFUSED" || error.cause?.code === "ECONNREFUSED") {
      return { success: false, error: "Ollama is not running" };
    }
    if (error.code === "ENOENT") {
      return { success: false, error: "Image file not found" };
    }
    return { success: false, error: error.message };
  } finally {
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

module.exports = {
  generateCaption,
  generateTags,
  generateCaptionAndTags,
  cancelRequest,
  DEFAULT_ENDPOINT,
};
