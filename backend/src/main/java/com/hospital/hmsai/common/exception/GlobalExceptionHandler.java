package com.hospital.hmsai.common.exception;

import com.hospital.hmsai.clinical.safety.PrescriptionSafetyException;
import com.hospital.hmsai.common.ApiErrorResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.PessimisticLockingFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.List;

/**
 * Xử lý exception tập trung cho toàn bộ API.
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * 400 – Validation errors (Bean Validation @Valid)
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidationErrors(MethodArgumentNotValidException ex) {
        List<String> details = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(FieldError::getDefaultMessage)
                .toList();

        ApiErrorResponse response = ApiErrorResponse.builder()
                .errorCode("VALIDATION_ERROR")
                .message("Dữ liệu không hợp lệ")
                .details(details)
                .build();

        return ResponseEntity.badRequest().body(response);
    }

    /**
     * 400 – Business logic errors
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiErrorResponse> handleBusinessException(BusinessException ex) {
        ApiErrorResponse response = ApiErrorResponse.builder()
                .errorCode("BUSINESS_ERROR")
                .message(ex.getMessage())
                .build();

        return ResponseEntity.badRequest().body(response);
    }

    /**
     * 400 – Đơn thuốc bị chặn do cảnh báo an toàn nghiêm trọng (tương tác SEVERE / dị ứng SEVERE, MODERATE).
     * Frontend hiển thị details và yêu cầu bác sĩ nhập overrideReason rồi gửi lại.
     */
    @ExceptionHandler(PrescriptionSafetyException.class)
    public ResponseEntity<ApiErrorResponse> handlePrescriptionSafety(PrescriptionSafetyException ex) {
        ApiErrorResponse response = ApiErrorResponse.builder()
                .errorCode(PrescriptionSafetyException.ERROR_CODE)
                .message(PrescriptionSafetyException.MESSAGE)
                .details(ex.getWarnings())
                .build();

        return ResponseEntity.badRequest().body(response);
    }

    /**
     * 409 – Không lấy được khóa dữ liệu (đang có thao tác khác trên cùng bản ghi: cấp phát, nhập kho, đặt lịch...)
     */
    @ExceptionHandler(PessimisticLockingFailureException.class)
    public ResponseEntity<ApiErrorResponse> handlePessimisticLock(PessimisticLockingFailureException ex) {
        log.warn("Không lấy được khóa dữ liệu: {}", ex.getMessage());
        ApiErrorResponse response = ApiErrorResponse.builder()
                .errorCode("CONCURRENT_UPDATE")
                .message("Dữ liệu đang được xử lý bởi thao tác khác. Vui lòng thử lại sau giây lát.")
                .build();

        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    /**
     * 401 – Bad credentials
     */
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<ApiErrorResponse> handleBadCredentials(BadCredentialsException ex) {
        ApiErrorResponse response = ApiErrorResponse.builder()
                .errorCode("AUTHENTICATION_ERROR")
                .message("Sai tên đăng nhập hoặc mật khẩu")
                .build();

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    /**
     * 403 – Access denied
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiErrorResponse> handleAccessDenied(AccessDeniedException ex) {
        ApiErrorResponse response = ApiErrorResponse.builder()
                .errorCode("ACCESS_DENIED")
                .message("Không đủ quyền truy cập")
                .build();

        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    /**
     * 404 – Resource not found
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        ApiErrorResponse response = ApiErrorResponse.builder()
                .errorCode("NOT_FOUND")
                .message(ex.getMessage())
                .build();

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    /**
     * 409 – Duplicate resource
     */
    @ExceptionHandler(DuplicateResourceException.class)
    public ResponseEntity<ApiErrorResponse> handleDuplicate(DuplicateResourceException ex) {
        ApiErrorResponse response = ApiErrorResponse.builder()
                .errorCode("DUPLICATE_RESOURCE")
                .message(ex.getMessage())
                .build();

        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    /**
     * 409 – Hai người cùng thao tác một bản ghi (khóa lạc quan @Version)
     */
    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ApiErrorResponse> handleOptimisticLock(ObjectOptimisticLockingFailureException ex) {
        log.warn("Xung đột cập nhật đồng thời: {}", ex.getMessage());
        ApiErrorResponse response = ApiErrorResponse.builder()
                .errorCode("CONCURRENT_UPDATE")
                .message("Dữ liệu vừa được người khác cập nhật. Vui lòng tải lại và thử lại.")
                .build();

        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    /**
     * 409 – Vi phạm ràng buộc dữ liệu (trùng khóa duy nhất, khóa ngoại...)
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleDataIntegrity(DataIntegrityViolationException ex) {
        log.warn("Vi phạm ràng buộc dữ liệu: {}", ex.getMostSpecificCause().getMessage());
        ApiErrorResponse response = ApiErrorResponse.builder()
                .errorCode("DATA_CONFLICT")
                .message("Dữ liệu bị trùng hoặc xung đột với bản ghi đã có. Vui lòng tải lại và kiểm tra.")
                .build();

        return ResponseEntity.status(HttpStatus.CONFLICT).body(response);
    }

    /**
     * 400 – Body JSON sai định dạng hoặc giá trị enum không hợp lệ
     */
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleUnreadable(HttpMessageNotReadableException ex) {
        ApiErrorResponse response = ApiErrorResponse.builder()
                .errorCode("MALFORMED_REQUEST")
                .message("Dữ liệu gửi lên không đúng định dạng")
                .build();

        return ResponseEntity.badRequest().body(response);
    }

    /**
     * 400 – Tham số đường dẫn / query sai kiểu hoặc thiếu
     */
    @ExceptionHandler({MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
    public ResponseEntity<ApiErrorResponse> handleBadParameter(Exception ex) {
        ApiErrorResponse response = ApiErrorResponse.builder()
                .errorCode("INVALID_PARAMETER")
                .message("Tham số yêu cầu không hợp lệ")
                .build();

        return ResponseEntity.badRequest().body(response);
    }

    /**
     * 500 – Unhandled exceptions
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGenericException(Exception ex) {
        log.error("Unhandled exception: ", ex);

        ApiErrorResponse response = ApiErrorResponse.builder()
                .errorCode("INTERNAL_ERROR")
                .message("Lỗi hệ thống, vui lòng thử lại sau")
                .build();

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
