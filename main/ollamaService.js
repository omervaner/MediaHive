/**
 * Ollama Service - Handles Ollama detection, model management, and settings
 */

const OLLAMA_ENDPOINT = 'http://localhost:11434';

// Vision models supported for captioning
const VISION_MODELS = [
  { id: 'qwen3-vl:2b', name: 'Very Fast (2B)', size: '~1.9 GB', ram: '4GB+', speed: 'Very Fast', quality: 'Basic' },
  { id: 'qwen3-vl:4b', name: 'Fast (4B)', size: '~3.3 GB', ram: '8GB+', speed: 'Fast', quality: 'Good' },
  { id: 'qwen3-vl:8b', name: 'Recommended (8B)', size: '~6.1 GB', ram: '16GB+', speed: 'Medium', quality: 'Better' },
  { id: 'qwen3-vl:32b', name: 'Maximum (32B)', size: '~20 GB', ram: '32GB+', speed: 'Slow', quality: 'Best' },
];

/**
 * Check if Ollama is running and get installed models
 * @returns {Promise<{running: boolean, models: Array, error?: string}>}
 */
async function checkOllamaStatus() {
  try {
    const response = await fetch(`${OLLAMA_ENDPOINT}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      return { running: false, models: [], error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const models = data.models || [];

    return {
      running: true,
      models: models.map(m => ({
        name: m.name,
        size: m.size,
        modifiedAt: m.modified_at,
      })),
    };
  } catch (error) {
    // Connection refused = Ollama not running
    if (error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED') {
      return { running: false, models: [], error: 'not_running' };
    }
    return { running: false, models: [], error: error.message };
  }
}

/**
 * Check if any supported vision model is installed
 * @param {Array} models - List of installed models
 * @returns {{hasVisionModel: boolean, installedVisionModels: Array}}
 */
function checkVisionModels(models) {
  const modelNames = models.map(m => m.name.toLowerCase());
  const installedVisionModels = VISION_MODELS.filter(vm =>
    modelNames.some(name => name.includes(vm.id.split(':')[0]) && name.includes(vm.id.split(':')[1]))
  );

  return {
    hasVisionModel: installedVisionModels.length > 0,
    installedVisionModels,
  };
}

/**
 * Pull (download) a model from Ollama with progress
 * @param {string} modelName - Model to pull (e.g., 'qwen3-vl:8b')
 * @param {function} onProgress - Progress callback
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function pullModel(modelName, onProgress = () => {}) {
  try {
    const response = await fetch(`${OLLAMA_ENDPOINT}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(Boolean);

      for (const line of lines) {
        try {
          const data = JSON.parse(line);

          if (data.error) {
            return { success: false, error: data.error };
          }

          // Progress update
          if (data.total && data.completed !== undefined) {
            onProgress({
              status: data.status || 'downloading',
              completed: data.completed,
              total: data.total,
              percent: Math.round((data.completed / data.total) * 100),
            });
          } else if (data.status) {
            onProgress({
              status: data.status,
              completed: 0,
              total: 0,
              percent: 0,
            });
          }
        } catch (parseError) {
          // Ignore JSON parse errors for incomplete chunks
        }
      }
    }

    return { success: true };
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED') {
      return { success: false, error: 'Ollama is not running' };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Delete a model from Ollama
 * @param {string} modelName - Model to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteModel(modelName) {
  try {
    const response = await fetch(`${OLLAMA_ENDPOINT}/api/delete`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName }),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get available vision models with their info
 * @returns {Array}
 */
function getVisionModelOptions() {
  return VISION_MODELS;
}

/**
 * Format bytes to human-readable string
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

module.exports = {
  checkOllamaStatus,
  checkVisionModels,
  pullModel,
  deleteModel,
  getVisionModelOptions,
  formatBytes,
  VISION_MODELS,
  OLLAMA_ENDPOINT,
};
