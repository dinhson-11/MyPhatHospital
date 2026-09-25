---
name: jwt-security
description: Cấu hình và triển khai Spring Security với JWT cho dự án HMS-AI. Sử dụng khi làm việc với authentication, authorization, JWT filter, hoặc phân quyền.
---

# Skill: JWT Security & RBAC

## Khi nào dùng
Sử dụng khi cần:
- Cấu hình Spring Security
- Tạo/sửa JWT filter
- Thêm phân quyền cho endpoint mới
- Xử lý authentication/authorization

## Kiến trúc Security

```
Request → JwtAuthFilter → SecurityContext → @PreAuthorize → Controller
                ↓
        JwtService (validate token)
                ↓
        UserDetailsService (load user + roles)
```

## Cấu hình Spring Security

```java
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {
    
    private final JwtAuthFilter jwtAuthFilter;
    private final UserDetailsServiceImpl userDetailsService;
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/auth/**").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                .requestMatchers("/api/v1/ai/chat/**").permitAll()  // chatbot cho guest
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        
        return http.build();
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

## JWT Service

```java
@Service
public class JwtService {
    @Value("${jwt.secret}")
    private String secretKey;
    
    @Value("${jwt.expiration}")
    private long accessTokenExpiration;  // 15-30 phút
    
    @Value("${jwt.refresh-expiration}")
    private long refreshTokenExpiration;  // 7 ngày
    
    public String generateToken(UserDetails userDetails) { ... }
    public String generateRefreshToken(UserDetails userDetails) { ... }
    public boolean isTokenValid(String token, UserDetails userDetails) { ... }
    public String extractUsername(String token) { ... }
}
```

## JWT Filter

```java
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    
    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response, FilterChain filterChain) {
        // 1. Extract token from "Authorization: Bearer <token>"
        // 2. Validate token
        // 3. Load UserDetails
        // 4. Set SecurityContext
        // 5. Continue filter chain
    }
}
```

## Phân quyền

### Roles
```
ADMIN          – Toàn quyền quản trị
RECEPTIONIST   – Tiếp nhận, tạo hồ sơ, xếp lịch
DOCTOR         – Khám, chẩn đoán, kê đơn, xem AI suggestions
NURSE          – Ghi sinh hiệu, nhập CLS
PHARMACIST     – Cấp phát thuốc, quản lý kho
ACCOUNTANT     – Lập hóa đơn, thu viện phí
PATIENT        – Đặt lịch, xem hồ sơ cá nhân, chat AI
```

### Ví dụ Controller
```java
// Chỉ ADMIN
@PreAuthorize("hasRole('ADMIN')")

// Nhiều roles
@PreAuthorize("hasAnyRole('DOCTOR', 'NURSE')")

// Chủ sở hữu (patient xem hồ sơ của mình)
@PreAuthorize("hasRole('ADMIN') or (hasRole('PATIENT') and #id == authentication.principal.patientId)")

// Custom expression
@PreAuthorize("@securityService.canAccessPatient(#patientId, authentication)")
```

## application.yml
```yaml
jwt:
  secret: ${JWT_SECRET}   # KHÔNG hardcode, dùng env var
  expiration: 1800000      # 30 phút (ms)
  refresh-expiration: 604800000  # 7 ngày (ms)
```

## Checklist
- [ ] JWT secret từ environment variable, KHÔNG hardcode
- [ ] Access token 15-30 phút, refresh token 7 ngày
- [ ] BCrypt cho password encoding
- [ ] Public endpoints: `/auth/**`, `/swagger-ui/**`, `/ai/chat/**`
- [ ] `@PreAuthorize` ở mọi endpoint cần phân quyền
- [ ] CORS cấu hình đúng domain frontend
- [ ] Exception handler cho 401/403
- [ ] Log truy cập dữ liệu EMR nhạy cảm
