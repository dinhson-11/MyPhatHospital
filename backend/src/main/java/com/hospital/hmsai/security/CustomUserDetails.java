package com.hospital.hmsai.security;

import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.User;

import java.util.Collection;

/**
 * Custom UserDetails mở rộng Spring Security User.
 * Lưu thêm userId để controller có thể trích xuất mà không cần lookup DB lại.
 */
@Getter
public class CustomUserDetails extends User {

    private final Long userId;

    public CustomUserDetails(Long userId, String username, String password,
                             boolean enabled, boolean accountNonLocked,
                             Collection<? extends GrantedAuthority> authorities) {
        super(username, password, enabled, true, true, accountNonLocked, authorities);
        this.userId = userId;
    }
}
