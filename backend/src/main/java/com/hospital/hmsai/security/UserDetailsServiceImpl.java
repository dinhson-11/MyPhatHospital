package com.hospital.hmsai.security;

import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * UserDetailsService tạm thời cho Sprint 0.
 * Sẽ được cập nhật trong Sprint 1 khi có Entity User + Repository.
 *
 * Hiện tại trả về user không hợp lệ để Security chain hoạt động được,
 * nhưng authentication luôn fail (chỉ cho phép public endpoints).
 */
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // TODO: Sprint 1 – Thay bằng logic load từ UserRepository
        throw new UsernameNotFoundException("User not found: " + username);
    }
}
