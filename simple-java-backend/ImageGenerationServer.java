import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.*;
import java.net.*;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.SimpleDateFormat;
import java.time.format.DateTimeFormatter;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.*;
import java.util.concurrent.Executors;

public class ImageGenerationServer {

    private static final String ACCESS_KEY = System.getenv("VOLCENGINE_ACCESS_KEY_ID");
    private static final String SECRET_KEY = System.getenv("VOLCENGINE_SECRET_ACCESS_KEY");
    private static final String REQ_KEY = "jimeng_t2i_v40";
    private static final String HOST = "visual.volcengineapi.com";
    private static final String SERVICE_NAME = "imagex";
    private static final String ACTION = "CVSync2AsyncSubmitTask";
    private static final String VERSION = "2022-08-31";

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        server.createContext("/api/generate-image", new GenerateImageHandler());
        server.createContext("/api/health", new HealthHandler());
        server.setExecutor(Executors.newFixedThreadPool(4));
        server.start();

        System.out.println("🚀 Java Image Generation Server started on http://localhost:8080");
        System.out.println("📍 Available endpoints:");
        System.out.println("   POST /api/generate-image");
        System.out.println("   GET  /api/health");
    }

    static class GenerateImageHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            // CORS headers
            exchange.getResponseHeaders().add("Access-Control-Allow-Origin", "*");
            exchange.getResponseHeaders().add("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
            exchange.getResponseHeaders().add("Access-Control-Allow-Headers", "Content-Type");

            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(200, 0);
                exchange.close();
                return;
            }

            if (!"POST".equals(exchange.getRequestMethod())) {
                sendErrorResponse(exchange, 405, "Method not allowed");
                return;
            }

            try {
                // Read request body
                String requestBody = readRequestBody(exchange);
                System.out.println("📥 Received request: " + requestBody);

                // Parse JSON manually (simple parsing)
                String prompt = extractPromptFromJson(requestBody);
                if (prompt == null || prompt.trim().isEmpty()) {
                    sendErrorResponse(exchange, 400, "Missing required parameter: prompt");
                    return;
                }

                System.out.println("🎨 [API启动] 提示词: \"" + prompt.substring(0, Math.min(50, prompt.length())) + "...\"");

                String imageUrl = generateImage(prompt);

                String response = String.format(
                    "{\"success\":true,\"data\":{\"imageUrl\":\"%s\",\"taskId\":\"jimeng_v4_%d\",\"prompt\":\"%s\"}}",
                    imageUrl, System.currentTimeMillis(), prompt.replace("\"", "\\\"")
                );

                sendSuccessResponse(exchange, response);

            } catch (Exception e) {
                System.err.println("❌ [流程终止]: " + e.getMessage());
                e.printStackTrace();
                sendErrorResponse(exchange, 500, "Java后端调用失败: " + e.getMessage());
            }
        }
    }

    static class HealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String response = "{\"status\":\"healthy\",\"service\":\"Image Generation Backend\"}";
            sendSuccessResponse(exchange, response);
        }
    }

    private static String generateImage(String prompt) throws Exception {
        // Step 1: Submit task
        System.out.println("\\n🚀 [Step 1] 提交任务...");
        String submitResponse = submitTask(prompt);

        // Check if immediate response contains image_urls
        if (submitResponse.contains("image_urls")) {
            String imageUrl = extractImageUrlFromResponse(submitResponse);
            if (imageUrl != null) {
                System.out.println("✅ [同步成功] 直接获得图片URL: " + imageUrl);
                return imageUrl;
            }
        }

        String taskId = extractTaskIdFromResponse(submitResponse);
        if (taskId == null) {
            throw new Exception("任务提交失败，未获得task_id");
        }

        System.out.println("⏳ [Step 2] 获得 TaskID: " + taskId + "，开始轮询...");

        // Step 2: Poll for result
        for (int i = 0; i < 150; i++) {
            Thread.sleep(2000);

            System.out.println("🔄 --- [轮询 第 " + (i + 1) + " 次] ---");

            String queryResponse = queryTask(taskId);

            // Check for image_urls
            if (queryResponse.contains("image_urls")) {
                String imageUrl = extractImageUrlFromResponse(queryResponse);
                if (imageUrl != null) {
                    System.out.println("🎉 [成功] 获得图片URL: " + imageUrl);
                    return imageUrl;
                }
            }

            // Check status
            String status = extractStatusFromResponse(queryResponse);
            if ("1".equals(status) || "10000".equals(status)) {
                String imageUrl = extractSingleImageUrlFromResponse(queryResponse);
                if (imageUrl != null) {
                    System.out.println("🎉 [成功] 获得图片URL: " + imageUrl);
                    return imageUrl;
                } else {
                    System.out.println("⏳ [等待] 状态成功但图片URL尚未生成...");
                }
            } else if ("2".equals(status) || "-1".equals(status)) {
                throw new Exception("任务失败，状态: " + status);
            } else {
                System.out.println("⏳ [等待] 任务处理中 (Status: " + status + ")...");
            }
        }

        throw new Exception("生成超时");
    }

    private static String submitTask(String prompt) throws Exception {
        String requestBody = String.format("{\"req_key\":\"%s\",\"prompt\":\"%s\"}", REQ_KEY, prompt.replace("\"", "\\\""));
        return doRequest(ACTION, requestBody);
    }

    private static String queryTask(String taskId) throws Exception {
        String requestBody = String.format("{\"req_key\":\"%s\",\"task_id\":\"%s\"}", REQ_KEY, taskId);
        return doRequest("CVSync2AsyncGetResult", requestBody);
    }

    private static String doRequest(String action, String requestBody) throws Exception {
        String queryString = "Action=" + action + "&Version=" + VERSION;

        // Generate timestamp
        ZonedDateTime now = ZonedDateTime.now(ZoneOffset.UTC);
        String xDate = now.format(DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'"));
        String shortDate = now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));

        // Create signature
        String contentType = "application/json";
        String signedHeaders = "content-type;host;x-date";

        String payloadHash = sha256Hex(requestBody);
        String canonicalRequest = String.join("\\n",
            "POST", "/", queryString,
            "content-type:" + contentType + "\\n" + "host:" + HOST + "\\n" + "x-date:" + xDate + "\\n",
            signedHeaders, payloadHash
        );

        String credentialScope = shortDate + "/cn-north-1/" + SERVICE_NAME + "/request";
        String stringToSign = String.join("\\n",
            "HMAC-SHA256", xDate, credentialScope, sha256Hex(canonicalRequest)
        );

        // Calculate signature
        byte[] kDate = hmacSha256(SECRET_KEY.getBytes(), shortDate);
        byte[] kRegion = hmacSha256(kDate, "cn-north-1");
        byte[] kService = hmacSha256(kRegion, SERVICE_NAME);
        byte[] kSigning = hmacSha256(kService, "request");
        String signature = bytesToHex(hmacSha256(kSigning, stringToSign));

        String authorization = String.format("HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s",
            ACCESS_KEY, credentialScope, signedHeaders, signature);

        System.out.println("⬇️⬇️⬇️ [" + action + "] 发送请求 ⬇️⬇️⬇️");
        System.out.println("Request Body: " + requestBody);

        // Make HTTP request
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://" + HOST + "/?" + queryString))
            .header("Content-Type", contentType)
            .header("X-Date", xDate)
            .header("Authorization", authorization)
            .POST(HttpRequest.BodyPublishers.ofString(requestBody))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        System.out.println("⬆️⬆️⬆️ [" + action + "] 接收响应 ⬆️⬆️⬆️");
        System.out.println("Response: " + response.body());
        System.out.println("-----------------------------------------------------------");

        if (response.statusCode() != 200) {
            throw new Exception("HTTP Error: " + response.statusCode() + " " + response.body());
        }

        return response.body();
    }

    // Helper methods
    private static String readRequestBody(HttpExchange exchange) throws IOException {
        try (BufferedReader reader = new BufferedReader(
            new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8))) {
            StringBuilder body = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                body.append(line);
            }
            return body.toString();
        }
    }

    private static String extractPromptFromJson(String json) {
        // Simple JSON parsing for "prompt" field
        int start = json.indexOf("\"prompt\":");
        if (start == -1) return null;
        start = json.indexOf('"', start + 9);
        if (start == -1) return null;
        start++;
        int end = json.indexOf('"', start);
        if (end == -1) return null;
        return json.substring(start, end);
    }

    private static String extractTaskIdFromResponse(String response) {
        int start = response.indexOf("\"task_id\":");
        if (start == -1) return null;
        start = response.indexOf('"', start + 10);
        if (start == -1) return null;
        start++;
        int end = response.indexOf('"', start);
        if (end == -1) return null;
        return response.substring(start, end);
    }

    private static String extractImageUrlFromResponse(String response) {
        int start = response.indexOf("\"image_urls\":");
        if (start == -1) return null;
        start = response.indexOf('[', start);
        if (start == -1) return null;
        start = response.indexOf('"', start);
        if (start == -1) return null;
        start++;
        int end = response.indexOf('"', start);
        if (end == -1) return null;
        return response.substring(start, end);
    }

    private static String extractSingleImageUrlFromResponse(String response) {
        int start = response.indexOf("\"image_url\":");
        if (start == -1) return null;
        start = response.indexOf('"', start + 12);
        if (start == -1) return null;
        start++;
        int end = response.indexOf('"', start);
        if (end == -1) return null;
        return response.substring(start, end);
    }

    private static String extractStatusFromResponse(String response) {
        int start = response.indexOf("\"status\":");
        if (start == -1) return null;
        start += 9;
        while (start < response.length() && (response.charAt(start) == ' ' || response.charAt(start) == ':')) {
            start++;
        }
        if (start >= response.length()) return null;
        int end = start;
        while (end < response.length() && Character.isDigit(response.charAt(end))) {
            end++;
        }
        if (start == end) return null;
        return response.substring(start, end);
    }

    private static void sendSuccessResponse(HttpExchange exchange, String response) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, response.getBytes().length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response.getBytes());
        }
        exchange.close();
    }

    private static void sendErrorResponse(HttpExchange exchange, int code, String message) throws IOException {
        String response = String.format("{\"success\":false,\"error\":\"%s\"}", message);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(code, response.getBytes().length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response.getBytes());
        }
        exchange.close();
    }

    private static String sha256Hex(String input) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
        return bytesToHex(hash);
    }

    private static byte[] hmacSha256(byte[] key, String data) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(key, "HmacSHA256");
        mac.init(secretKeySpec);
        return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
    }

    private static String bytesToHex(byte[] bytes) {
        StringBuilder result = new StringBuilder();
        for (byte b : bytes) {
            result.append(String.format("%02x", b));
        }
        return result.toString();
    }
}