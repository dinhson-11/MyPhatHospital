package com.hospital.hmsai.security;

import com.hospital.hmsai.user.entity.UserStatus;
import com.hospital.hmsai.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * UserDetailsService – load thông tin user từ database để Spring Security
 * xác thực và phân quyền.
 * <p>
 * Mỗi role code (ADMIN, DOCTOR...) được map thành GrantedAuthority
 * với prefix "ROLE_" để tương thích với {@code @PreAuthorize("hasRole('...')")}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        com.hospital.hmsai.user.entity.User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                        "Không tìm thấy user: " + username));

        List<SimpleGrantedAuthority> authorities = user.getRoles().stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role.getCode()))
                .toList();

        boolean isActive = user.getStatus() == UserStatus.ACTIVE;

        return User.builder()
                .username(user.getUsername())
                .password(user.getPasswordHash())
                .authorities(authorities)
                .accountLocked(!isActive)
                .disabled(false)
                .build();
    }
}
