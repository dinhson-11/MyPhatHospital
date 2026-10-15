package com.hospital.hmsai.user.avatar;

import com.hospital.hmsai.common.exception.BusinessException;
import com.hospital.hmsai.common.exception.ResourceNotFoundException;
import com.hospital.hmsai.user.entity.User;
import com.hospital.hmsai.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Arrays;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AvatarServiceImplTest {

    /** Đầu file JPEG hợp lệ (FF D8 FF) – đủ để nhận dạng định dạng. */
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0, 0x10, 'J', 'F', 'I', 'F'};

    @Mock
    private UserRepository userRepository;

    @Mock
    private AvatarStorage storage;

    @InjectMocks
    private AvatarServiceImpl avatarService;

    private User doctor;

    @BeforeEach
    void setUp() {
        doctor = User.builder().id(12L).username("bs.maianh").fullName("Vi Mai Anh").build();
    }

    @Test
    @DisplayName("Tải ảnh lần đầu: gửi lên kho với mã riêng theo user, lưu link + mã ảnh vào tài khoản")
    void uploadsFirstAvatar() {
        when(storage.isConfigured()).thenReturn(true);
        when(userRepository.findById(12L)).thenReturn(Optional.of(doctor));
        when(storage.upload(eq(JPEG), anyString())).thenReturn(new StoredAvatar("https://cdn/a.jpg", "avatars/user-12-abc"));

        AvatarResponse response = avatarService.updateAvatar(12L, JPEG);

        assertEquals("https://cdn/a.jpg", response.getAvatarUrl());
        assertEquals("https://cdn/a.jpg", doctor.getAvatarUrl());
        assertEquals("avatars/user-12-abc", doctor.getAvatarPublicId());
        ArgumentCaptor<String> publicId = ArgumentCaptor.forClass(String.class);
        verify(storage).upload(eq(JPEG), publicId.capture());
        assertTrue(publicId.getValue().matches("user-12-[a-z0-9]{8,}"), publicId.getValue());
        verify(userRepository).save(doctor);
        verify(storage, never()).delete(anyString());
    }

    @Test
    @DisplayName("Đổi ảnh: ảnh cũ chỉ bị xóa SAU KHI lưu link mới vào tài khoản")
    void replacesAvatarAndDeletesOldAfterSave() {
        doctor.setAvatarUrl("https://cdn/old.jpg");
        doctor.setAvatarPublicId("avatars/user-12-old");
        when(storage.isConfigured()).thenReturn(true);
        when(userRepository.findById(12L)).thenReturn(Optional.of(doctor));
        when(storage.upload(eq(JPEG), anyString())).thenReturn(new StoredAvatar("https://cdn/new.jpg", "avatars/user-12-new"));

        avatarService.updateAvatar(12L, JPEG);

        InOrder order = inOrder(userRepository, storage);
        order.verify(userRepository).save(doctor);
        order.verify(storage).delete("avatars/user-12-old");
        assertEquals("https://cdn/new.jpg", doctor.getAvatarUrl());
    }

    @Test
    @DisplayName("Lưu tài khoản thất bại → xóa ảnh vừa tải lên, giữ nguyên ảnh cũ")
    void cleansUpUploadedImageWhenSaveFails() {
        doctor.setAvatarPublicId("avatars/user-12-old");
        when(storage.isConfigured()).thenReturn(true);
        when(userRepository.findById(12L)).thenReturn(Optional.of(doctor));
        when(storage.upload(eq(JPEG), anyString())).thenReturn(new StoredAvatar("https://cdn/new.jpg", "avatars/user-12-new"));
        when(userRepository.save(any())).thenThrow(new IllegalStateException("db down"));

        assertThrows(IllegalStateException.class, () -> avatarService.updateAvatar(12L, JPEG));

        verify(storage).delete("avatars/user-12-new");
        verify(storage, never()).delete("avatars/user-12-old");
    }

    @Test
    @DisplayName("Xóa ảnh cũ trên kho bị lỗi → chỉ ghi log, vẫn đổi ảnh thành công")
    void oldImageDeleteFailureIsNotFatal() {
        doctor.setAvatarPublicId("avatars/user-12-old");
        when(storage.isConfigured()).thenReturn(true);
        when(userRepository.findById(12L)).thenReturn(Optional.of(doctor));
        when(storage.upload(eq(JPEG), anyString())).thenReturn(new StoredAvatar("https://cdn/new.jpg", "avatars/user-12-new"));
        doThrow(new AvatarStorageException("timeout")).when(storage).delete("avatars/user-12-old");

        assertEquals("https://cdn/new.jpg", avatarService.updateAvatar(12L, JPEG).getAvatarUrl());
    }

    @Test
    @DisplayName("Chưa cấu hình kho ảnh (CLOUDINARY_URL) → báo lỗi rõ ràng, không gọi kho")
    void rejectsWhenStorageNotConfigured() {
        when(storage.isConfigured()).thenReturn(false);

        BusinessException ex = assertThrows(BusinessException.class, () -> avatarService.updateAvatar(12L, JPEG));

        assertEquals("Chưa cấu hình kho ảnh (CLOUDINARY_URL) nên chưa đổi được ảnh đại diện", ex.getMessage());
        verify(storage, never()).upload(any(), anyString());
    }

    @Test
    @DisplayName("File rỗng / quá 5MB / không phải ảnh JPG-PNG-WebP → từ chối trước khi tải lên")
    void validatesFile() {
        when(storage.isConfigured()).thenReturn(true);

        assertEquals("Vui lòng chọn ảnh đại diện",
                assertThrows(BusinessException.class, () -> avatarService.updateAvatar(12L, new byte[0])).getMessage());

        byte[] huge = Arrays.copyOf(JPEG, AvatarServiceImpl.MAX_BYTES + 1);
        assertEquals("Ảnh vượt quá dung lượng cho phép (tối đa 5MB)",
                assertThrows(BusinessException.class, () -> avatarService.updateAvatar(12L, huge)).getMessage());

        byte[] pdf = "%PDF-1.7 fake".getBytes();
        assertEquals("Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP",
                assertThrows(BusinessException.class, () -> avatarService.updateAvatar(12L, pdf)).getMessage());

        verify(storage, never()).upload(any(), anyString());
    }

    @Test
    @DisplayName("Tài khoản không tồn tại → 404, không tải ảnh lên")
    void rejectsUnknownUser() {
        when(storage.isConfigured()).thenReturn(true);
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> avatarService.updateAvatar(99L, JPEG));
        verify(storage, never()).upload(any(), anyString());
    }

    @Test
    @DisplayName("Xóa ảnh đại diện: bỏ link khỏi tài khoản rồi xóa ảnh trên kho")
    void removesAvatar() {
        doctor.setAvatarUrl("https://cdn/old.jpg");
        doctor.setAvatarPublicId("avatars/user-12-old");
        when(storage.isConfigured()).thenReturn(true);
        when(userRepository.findById(12L)).thenReturn(Optional.of(doctor));

        avatarService.removeAvatar(12L);

        assertNull(doctor.getAvatarUrl());
        assertNull(doctor.getAvatarPublicId());
        InOrder order = inOrder(userRepository, storage);
        order.verify(userRepository).save(doctor);
        order.verify(storage).delete("avatars/user-12-old");
    }

    @Test
    @DisplayName("Xóa khi chưa có ảnh → không làm gì")
    void removeWithoutAvatarIsNoop() {
        when(userRepository.findById(12L)).thenReturn(Optional.of(doctor));

        avatarService.removeAvatar(12L);

        verify(userRepository, never()).save(any());
        verifyNoInteractions(storage);
    }
}
