package com.hospital.hmsai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

/**
 * Cấu hình RestTemplate dùng cho gọi dịch vụ ngoài (AI Service).
 * Đảm bảo NFR-3: Timeout 3 giây tránh treo request lâm sàng.
 */
@Configuration
public class RestClientConfig {

    @Value("${ai-service.timeout:3000}")
    private int timeoutMillis;

    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(timeoutMillis);
        factory.setReadTimeout(timeoutMillis);

        return builder
                .requestFactory(() -> factory)
                .setConnectTimeout(Duration.ofMillis(timeoutMillis))
                .setReadTimeout(Duration.ofMillis(timeoutMillis))
                .build();
    }
}
