package com.scripttoframe.controller;

import com.scripttoframe.service.ImageGenerationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")  // 允许来自Next.js应用的跨域请求
public class ImageGenerationController {

    @Autowired
    private ImageGenerationService imageGenerationService;

    /**
     * 生成图片接口
     * @param request 请求体，包含prompt字段
     * @return 包含图片URL的响应
     */
    @PostMapping("/generate-image")
    public ResponseEntity<Map<String, Object>> generateImage(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();

        try {
            String prompt = (String) request.get("prompt");

            if (prompt == null || prompt.trim().isEmpty()) {
                response.put("success", false);
                response.put("error", "缺少必要参数: prompt");
                return ResponseEntity.badRequest().body(response);
            }

            System.out.println("🎨 [API启动] 提示词: \"" + prompt.substring(0, Math.min(50, prompt.length())) + "...\"");

            String imageUrl = imageGenerationService.generateImage(prompt);

            Map<String, Object> data = new HashMap<>();
            data.put("imageUrl", imageUrl);
            data.put("taskId", "jimeng_v4_" + System.currentTimeMillis());
            data.put("prompt", prompt);

            response.put("success", true);
            response.put("data", data);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("❌ [流程终止]: " + e.getMessage());
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * 健康检查接口
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "healthy");
        response.put("service", "Image Generation Backend");
        return ResponseEntity.ok(response);
    }
}