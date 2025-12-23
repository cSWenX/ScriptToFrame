package com.scripttoframe.service;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.volcengine.service.visual.IVisualService;
import com.volcengine.service.visual.impl.VisualServiceImpl;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ImageGenerationService {

    @Value("${volcengine.access.key}")
    private String accessKey;

    @Value("${volcengine.secret.key}")
    private String secretKey;

    private final String REQ_KEY = "jimeng_t2i_v40";

    /**
     * 生成图片
     * @param prompt 提示词
     * @return 图片URL
     * @throws Exception
     */
    public String generateImage(String prompt) throws Exception {
        IVisualService visualService = VisualServiceImpl.getInstance();
        visualService.setAccessKey(accessKey);
        visualService.setSecretKey(secretKey);

        // 1. 提交任务
        JSONObject submitReq = new JSONObject();
        submitReq.put("req_key", REQ_KEY);
        submitReq.put("prompt", prompt);

        System.out.println("🚀 [提交任务] 请求参数: " + submitReq.toJSONString());

        JSONObject submitResp = visualService.CVSync2AsyncSubmitTask(submitReq);
        System.out.println("📥 [提交任务] 响应: " + submitResp.toJSONString());

        // 检查是否直接返回图片URLs
        if (submitResp.containsKey("image_urls")) {
            com.alibaba.fastjson.JSONArray imageUrls = submitResp.getJSONArray("image_urls");
            if (imageUrls != null && imageUrls.size() > 0) {
                String imageUrl = imageUrls.getString(0);
                System.out.println("✅ [同步成功] 直接获得图片URL: " + imageUrl);
                return imageUrl;
            }
        }

        String taskId = submitResp.getString("task_id");
        if (taskId == null || taskId.isEmpty()) {
            throw new Exception("任务提交失败，未获得task_id");
        }

        System.out.println("⏳ [轮询开始] TaskID: " + taskId);

        // 2. 轮询结果
        for (int i = 0; i < 150; i++) {
            Thread.sleep(2000); // 等待2秒

            JSONObject resultReq = new JSONObject();
            resultReq.put("req_key", REQ_KEY);
            resultReq.put("task_id", taskId);

            System.out.println("🔄 [轮询第" + (i + 1) + "次] 查询任务状态...");

            JSONObject result = visualService.CVSync2AsyncGetResult(resultReq);
            System.out.println("📥 [查询结果] " + result.toJSONString());

            // 检查状态
            Integer status = result.getInteger("status");

            // 优先检查是否有 image_urls
            if (result.containsKey("image_urls")) {
                com.alibaba.fastjson.JSONArray imageUrls = result.getJSONArray("image_urls");
                if (imageUrls != null && imageUrls.size() > 0) {
                    String imageUrl = imageUrls.getString(0);
                    System.out.println("🎉 [成功] 获得图片URL: " + imageUrl);
                    return imageUrl;
                }
            }

            if (status != null) {
                if (status == 1 || status == 10000) {
                    // 任务成功，尝试提取图片URL
                    String imageUrl = result.getString("image_url");

                    // 如果没有直接的image_url，尝试解析resp_data
                    if (imageUrl == null || imageUrl.isEmpty()) {
                        String respData = result.getString("resp_data");
                        if (respData != null && !respData.isEmpty()) {
                            try {
                                JSONObject respJson = JSON.parseObject(respData);
                                if (respJson.containsKey("image_urls")) {
                                    com.alibaba.fastjson.JSONArray imageUrls = respJson.getJSONArray("image_urls");
                                    if (imageUrls != null && imageUrls.size() > 0) {
                                        imageUrl = imageUrls.getString(0);
                                    }
                                }
                            } catch (Exception e) {
                                System.out.println("⚠️ 解析resp_data失败: " + e.getMessage());
                            }
                        }
                    }

                    if (imageUrl != null && !imageUrl.isEmpty()) {
                        System.out.println("🎉 [成功] 获得图片URL: " + imageUrl);
                        return imageUrl;
                    } else {
                        System.out.println("⏳ [等待] 状态成功但图片URL尚未生成...");
                    }
                } else if (status == 2 || status == -1) {
                    throw new Exception("任务失败，状态: " + status);
                } else {
                    System.out.println("⏳ [处理中] 状态: " + status);
                }
            }
        }

        throw new Exception("生成超时");
    }
}