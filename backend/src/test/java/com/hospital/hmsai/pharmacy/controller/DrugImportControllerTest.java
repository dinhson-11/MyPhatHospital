package com.hospital.hmsai.pharmacy.controller;

import com.hospital.hmsai.pharmacy.dto.DrugImportPreviewRow;
import com.hospital.hmsai.pharmacy.dto.DrugImportRequest;
import com.hospital.hmsai.pharmacy.dto.DrugImportResult;
import com.hospital.hmsai.pharmacy.dto.DrugImportRowStatus;
import com.hospital.hmsai.pharmacy.service.DrugImportService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.io.InputStream;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DrugImportControllerTest {

    private static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DrugImportService drugImportService;

    private static MockMultipartFile excel(byte[] content) {
        return new MockMultipartFile("file", "thuoc.xlsx", XLSX, content);
    }

    @Test
    @WithMockUser(roles = "PHARMACIST")
    @DisplayName("Dược sĩ tải được file mẫu .xlsx")
    void pharmacistDownloadsTemplate() throws Exception {
        byte[] body = mockMvc.perform(get("/api/v1/drugs/import/template"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", XLSX))
                .andExpect(header().string("Content-Disposition", containsString("attachment")))
                .andReturn().getResponse().getContentAsByteArray();

        assertEquals('P', body[0], "File .xlsx là gói zip, bắt đầu bằng 'PK'");
        assertEquals('K', body[1]);
    }

    @Test
    @WithMockUser(roles = "PHARMACIST")
    @DisplayName("Xem trước: gửi file multipart, trả về danh sách dòng kèm trạng thái")
    void previewReturnsRows() throws Exception {
        when(drugImportService.preview(any(InputStream.class))).thenReturn(List.of(
                DrugImportPreviewRow.builder().rowNumber(2).code("PARA-500").status(DrugImportRowStatus.EXISTS)
                        .errors(List.of()).build()));

        mockMvc.perform(multipart("/api/v1/drugs/import/preview").file(excel(new byte[]{1, 2, 3})))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].code").value("PARA-500"))
                .andExpect(jsonPath("$.data[0].status").value("EXISTS"));
    }

    @Test
    @WithMockUser(roles = "PHARMACIST")
    @DisplayName("Xem trước: file rỗng → 400 kèm thông báo")
    void previewRejectsEmptyFile() throws Exception {
        mockMvc.perform(multipart("/api/v1/drugs/import/preview").file(excel(new byte[0])))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Vui lòng chọn file Excel cần nhập"));
        verifyNoInteractions(drugImportService);
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    @DisplayName("Nhập: trả về số thuốc thêm mới / cộng tồn kho")
    void importReturnsResult() throws Exception {
        when(drugImportService.importDrugs(any(DrugImportRequest.class))).thenReturn(new DrugImportResult(2, 1));

        mockMvc.perform(post("/api/v1/drugs/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[{\"rowNumber\":2,\"code\":\"A1\",\"name\":\"Thuốc A\",\"price\":1000,\"quantity\":5,\"action\":\"CREATE\"}]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.created").value(2))
                .andExpect(jsonPath("$.data.restocked").value(1));
    }

    @Test
    @WithMockUser(roles = "PHARMACIST")
    @DisplayName("Nhập: danh sách rỗng hoặc thiếu hành động → 400 VALIDATION_ERROR")
    void importValidatesRequest() throws Exception {
        mockMvc.perform(post("/api/v1/drugs/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));

        mockMvc.perform(post("/api/v1/drugs/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[{\"code\":\"A1\",\"quantity\":5}]}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details[0]").value("Thiếu hành động nhập (CREATE / RESTOCK)"));
        verifyNoInteractions(drugImportService);
    }

    @Test
    @WithMockUser(roles = "RECEPTIONIST")
    @DisplayName("Lễ tân không được tải mẫu, xem trước hay nhập thuốc (403)")
    void receptionistIsForbidden() throws Exception {
        mockMvc.perform(get("/api/v1/drugs/import/template"))
                .andExpect(status().isForbidden());
        mockMvc.perform(multipart("/api/v1/drugs/import/preview").file(excel(new byte[]{1})))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/drugs/import")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"items\":[{\"code\":\"A1\",\"action\":\"CREATE\"}]}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(drugImportService);
    }
}
