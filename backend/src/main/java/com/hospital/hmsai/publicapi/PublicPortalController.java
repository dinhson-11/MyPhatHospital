package com.hospital.hmsai.publicapi;

import com.hospital.hmsai.appointment.dto.AppointmentResponse;
import com.hospital.hmsai.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** API công khai cho cổng thông tin bệnh viện (không yêu cầu đăng nhập). Lịch trực KHÔNG nằm ở đây. */
@RestController
@RequestMapping("/api/v1/public")
@RequiredArgsConstructor
@Tag(name = "Public Portal", description = "Danh mục khoa/bác sĩ và đặt lịch khám công khai")
public class PublicPortalController {

    private final PublicPortalService portalService;

    @GetMapping("/departments")
    @Operation(summary = "Danh sách khoa phòng")
    public ResponseEntity<ApiResponse<List<PublicDepartmentResponse>>> getDepartments() {
        return ResponseEntity.ok(ApiResponse.success(portalService.getDepartments()));
    }

    @GetMapping("/doctors")
    @Operation(summary = "Danh sách bác sĩ (id là mã hồ sơ nhân viên dùng khi đặt lịch)")
    public ResponseEntity<ApiResponse<List<PublicDoctorResponse>>> getDoctors() {
        return ResponseEntity.ok(ApiResponse.success(portalService.getDoctors()));
    }

    @PostMapping("/appointments")
    @Operation(summary = "Đặt lịch khám không cần đăng nhập")
    public ResponseEntity<ApiResponse<AppointmentResponse>> book(@Valid @RequestBody PublicBookingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success(portalService.book(request), "Đặt lịch khám thành công"));
    }
}
