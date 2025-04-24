/**
 * Module for handling asynchronous processing tasks
 */
const activeCampaign = require("./active-campaign-api");

// Queue for storing pending tasks
const taskQueue = [];

// Flag to indicate if the processor is running
let isProcessing = false;

/**
 * Add a task to the queue and start processing if not already running
 * @param {Function} task - The task function to execute
 * @param {Object} data - Data to pass to the task
 */
function addTask(task, data) {
  console.log("Adding task to async queue:", data);
  taskQueue.push({ task, data });
  
  // Start processing if not already running
  if (!isProcessing) {
    processQueue();
  }
}

/**
 * Process tasks in the queue
 */
async function processQueue() {
  if (isProcessing || taskQueue.length === 0) {
    return;
  }
  
  isProcessing = true;
  console.log(`Starting async processing of ${taskQueue.length} tasks`);
  
  try {
    // Process the next task in the queue
    const { task, data } = taskQueue.shift();
    console.log("Processing task:", data);
    
    try {
      await task(data);
      console.log("Task completed successfully");
    } catch (taskError) {
      console.error("Error processing task:", taskError);
      // Continue processing other tasks even if one fails
    }
  } catch (error) {
    console.error("Error in queue processing:", error);
  } finally {
    isProcessing = false;
    
    // Continue processing if there are more tasks
    if (taskQueue.length > 0) {
      processQueue();
    } else {
      console.log("Async queue processing completed");
    }
  }
}

/**
 * Process lead in ActiveCampaign asynchronously
 * @param {Object} leadData - Lead data (email, name, phone)
 * @param {string} mockupUrl - URL of the mockup
 */
async function processLeadAsync(leadData, mockupUrl) {
  addTask(async (data) => {
    const { leadData, mockupUrl } = data;
    console.log("Processing lead in ActiveCampaign asynchronously...");
    
    try {
      await activeCampaign.processLeadWithMockup(leadData, mockupUrl);
      console.log("Lead processed in ActiveCampaign successfully");
    } catch (acError) {
      console.error("Error processing lead in ActiveCampaign:", acError);
      // We don't rethrow the error since this is async processing
    }
  }, { leadData, mockupUrl });
}

module.exports = {
  processLeadAsync,
  addTask,
};
