--- a/services/llmRouter.js
+++ b/services/llmRouter.js
@@ -42,76 +42,91 @@
 }
 
 export async function callLLM(message) {
- if (typeof message !== "string" || !message.trim()) {
-  throw new Error("callLLM requires a non-empty message string");
- }
-
- const { provider, model, endpoint, apiKey } = getBaseConfig();
- const prompt = message.trim();
-
- if (provider === "openai") {
-  const response = await axios.post(
-   endpoint,
-   {
-    model,
-    messages: [{ role: "user", content: prompt }],
-   },
-   {
-    headers: {
-     Authorization: `Bearer ${apiKey}`,
-     "Content-Type": "application/json",
-    },
-   },
-  );
-  const choice = response.data?.choices?.[0]?.message?.content;
-  if (!choice) {
-   throw new Error("OpenAI response did not include choices[0].message.content");
-  }
-  return { provider, model, endpoint, reply: choice };
- }
-
- if (provider === "gemini") {
-  const url = `${endpoint.replace(/\/$/, "")}/${model}:generateContent`;
-  const response = await axios.post(
-   url,
-   {
-    contents: [{ parts: [{ text: prompt }] }],
-   },
-   {
-    headers: {
-     "x-goog-api-key": apiKey,
-     "Content-Type": "application/json",
-    },
-   },
-  );
-  const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
-  if (!reply) {
-   throw new Error("Gemini response did not include candidates[0].content.parts[0].text");
-  }
-  return { provider, model, endpoint: url, reply };
- }
-
- // provider === "ollama"
- const url = `${endpoint.replace(/\/$/, "")}/api/generate`;
- const response = await axios.post(url, {
-  model,
-  prompt,
- });
- const reply = response.data?.response;
- if (!reply) {
-  throw new Error("Ollama response did not include response field");
- }
- return { provider, model, endpoint: url, reply };
+  if (typeof message !== "string" || !message.trim()) {
+    throw new Error("callLLM requires a non-empty message string");
+  }
+
+  const { provider, model, endpoint, apiKey } = getBaseConfig();
+  const prompt = message.trim();
+
+  try {
+    if (provider === "openai") {
+      const response = await axios.post(
+        endpoint,
+        {
+          model,
+          messages: [{ role: "user", content: prompt }],
+        },
+        {
+          headers: {
+            Authorization: `Bearer ${apiKey}`,
+            "Content-Type": "application/json",
+          },
+        },
+      );
+      const choice = response.data?.choices?.[0]?.message?.content;
+      if (!choice) {
+        console.error(`[PROVIDER-MALFORMED] ${provider} response missing required field 'choices[0].message.content'`, response.data);
+        throw new Error("OpenAI response did not include the generated content.");
+      }
+      return { provider, model, endpoint, reply: choice };
+    }
+
+    if (provider === "gemini") {
+      const url = `${endpoint.replace(/\/$/, "")}/${model}:generateContent`;
+      const response = await axios.post(
+        url,
+        {
+          contents: [{ parts: [{ text: prompt }] }],
+        },
+        {
+          headers: {
+            "x-goog-api-key": apiKey,
+            "Content-Type": "application/json",
+          },
+        },
+      );
+      const reply = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
+      if (!reply) {
+        console.error(`[PROVIDER-MALFORMED] ${provider} response missing required field 'candidates[0].content.parts[0].text'`, response.data);
+        throw new Error("Gemini response did not include the generated content.");
+      }
+      return { provider, model, endpoint: url, reply };
+    }
+
+    // provider === "ollama"
+    const url = `${endpoint.replace(/\/$/, "")}/api/generate`;
+    const response = await axios.post(url, {
+      model,
+      prompt,
+    });
+    const reply = response.data?.response;
+    if (!reply) {
+      console.error(`[PROVIDER-MALFORMED] ${provider} response missing required field 'response'`, response.data);
+      throw new Error("Ollama response did not include the generated content.");
+    }
+    return { provider, model, endpoint: url, reply };
+
+  } catch (error) {
+    if (axios.isAxiosError(error)) {
+      const status = error.response?.status || 'N/A';
+      const data = JSON.stringify(error.response?.data || error.response?.statusText || 'No response data', null, 2);
+      const url = error.config.url || endpoint;
+
+      console.error(`[PROVIDER-AXIOS-ERROR] Failed to call ${provider} (${url}). Status: ${status}. Data: ${data.substring(0, 1024)}`);
+      
+      throw new Error(`AI Provider API call failed: ${provider} returned HTTP ${status}. See logs for details.`);
+    }
+
+    console.error("[PROVIDER-CRITICAL-ERROR] Non-Axios error in callLLM:", error.stack || error);
+    throw new Error(`AI Provider call failed: ${error.message}.`);
+  }
 }// revised llmRouter.js content
