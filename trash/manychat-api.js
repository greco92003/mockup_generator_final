const fetch = require("node-fetch");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// ManyChat API configuration
const MC_API = "https://api.manychat.com";
const MC_KEY = process.env.MANYCHAT_API_KEY;
const FIELD_NAME = "mockup_url";

// This should be copied from the ManyChat Flow URL
// Example: If your flow URL is https://admin.manychat.com/fb/flows/content20250419123456_mockup
// Then FLOW_NS would be 'content20250419123456_mockup'
const FLOW_NS = process.env.MANYCHAT_FLOW_NS || "content20250420010052_915525";
const FLOW_STEP = process.env.MANYCHAT_STEP || "mockup";

/**
 * Ensures a subscriber exists in ManyChat or creates one
 * @param {string} email - Email of the subscriber
 * @param {string} phone - Phone number (with country code)
 * @param {string} name - Name of the subscriber
 * @returns {Promise<number>} - Subscriber ID
 */
async function ensureSubscriber(email, phone, name = "") {
  try {
    // First try to find subscriber by email
    const searchRes = await fetch(`${MC_API}/fb/subscriber/findByEmail`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MC_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const searchData = await searchRes.json();

    // If subscriber exists, return the ID
    if (
      searchData.status === "success" &&
      searchData.data &&
      searchData.data.id
    ) {
      console.log(`Subscriber found with ID: ${searchData.data.id}`);
      return searchData.data.id;
    }

    // If not found, create a new subscriber
    console.log("Subscriber not found, creating new one...");

    // Split name into first and last name
    let firstName = name;
    let lastName = "";

    if (name && name.includes(" ")) {
      const nameParts = name.split(" ");
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(" ");
    }

    const createRes = await fetch(`${MC_API}/fb/subscriber/createSubscriber`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MC_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone, // Required for WhatsApp
        email, // Required for our use case
        first_name: firstName,
        last_name: lastName,
      }),
    });

    const createData = await createRes.json();

    if (
      createData.status !== "success" ||
      !createData.data ||
      !createData.data.id
    ) {
      throw new Error(
        `Failed to create subscriber: ${JSON.stringify(createData)}`
      );
    }

    console.log(`New subscriber created with ID: ${createData.data.id}`);
    return createData.data.id;
  } catch (error) {
    console.error("Error in ensureSubscriber:", error);
    throw error;
  }
}

/**
 * Sets a custom field value for a subscriber
 * @param {number} subscriberId - ManyChat subscriber ID
 * @param {string} fieldName - Name of the custom field
 * @param {string} fieldValue - Value to set
 */
async function setCustomField(subscriberId, fieldName, fieldValue) {
  try {
    const res = await fetch(`${MC_API}/fb/subscriber/setCustomField`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MC_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subscriber_id: subscriberId,
        field_name: fieldName,
        field_value: fieldValue,
      }),
    });

    const data = await res.json();

    if (data.status !== "success") {
      throw new Error(`Failed to set custom field: ${JSON.stringify(data)}`);
    }

    console.log(
      `Custom field ${fieldName} set to ${fieldValue} for subscriber ${subscriberId}`
    );
  } catch (error) {
    console.error("Error in setCustomField:", error);
    throw error;
  }
}

/**
 * Triggers a flow for a subscriber
 * @param {number} subscriberId - ManyChat subscriber ID
 * @param {string} flowNs - Flow namespace (from URL)
 * @param {string} flowStep - Optional flow step name
 */
async function triggerFlow(subscriberId, flowNs, flowStep = null) {
  try {
    // Prepare request body
    const requestBody = {
      subscriber_id: subscriberId,
      flow_ns: flowNs,
    };

    // Add flow step if provided
    if (flowStep) {
      requestBody.flow_step = flowStep;
    }

    const res = await fetch(`${MC_API}/fb/sending/sendFlow`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MC_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await res.json();

    if (data.status !== "success") {
      throw new Error(`Failed to trigger flow: ${JSON.stringify(data)}`);
    }

    console.log(
      `Flow ${flowNs}${
        flowStep ? " (step: " + flowStep + ")" : ""
      } triggered for subscriber ${subscriberId}`
    );
  } catch (error) {
    console.error("Error in triggerFlow:", error);
    throw error;
  }
}

/**
 * Sends a mockup to a lead via ManyChat
 * @param {string} email - Email of the lead
 * @param {string} phone - Phone number with country code (e.g., +5511999999999)
 * @param {string} name - Name of the lead
 * @param {string} mockupUrl - URL of the mockup image
 */
async function sendMockupToManyChat(email, phone, name, mockupUrl) {
  try {
    if (!MC_KEY) {
      throw new Error("MANYCHAT_API_KEY not set in environment variables");
    }

    if (!FLOW_NS) {
      throw new Error("MANYCHAT_FLOW_NS not set in environment variables");
    }

    // Ensure subscriber exists
    const subscriberId = await ensureSubscriber(email, phone, name);

    // Set mockup URL in custom field
    await setCustomField(subscriberId, FIELD_NAME, mockupUrl);

    // Trigger flow to send mockup
    await triggerFlow(subscriberId, FLOW_NS, FLOW_STEP);

    return {
      success: true,
      subscriber_id: subscriberId,
      message: "Mockup sent successfully",
    };
  } catch (error) {
    console.error("Error sending mockup to ManyChat:", error);
    throw error;
  }
}

module.exports = {
  sendMockupToManyChat,
  ensureSubscriber,
  setCustomField,
  triggerFlow,
};

// Example usage:
// sendMockupToManyChat(
//   'email@example.com',
//   '+5511999999999',
//   'John Doe',
//   'https://example.com/mockup.png'
// ).then(console.log).catch(console.error);
