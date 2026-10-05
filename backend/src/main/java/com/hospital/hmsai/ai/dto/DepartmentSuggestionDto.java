package com.hospital.hmsai.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Gợi ý chuyên khoa khám từ phân tích triệu chứng (FR-10).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentSuggestionDto {

    @JsonProperty("dept_id")
    private Integer deptId;

    @JsonProperty("dept_name")
    private String deptName;

    private String reason;

    private String priority;
}
